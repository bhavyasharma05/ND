const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
import { supabase } from '../services/supabaseClient';

const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
};

// Helper to consume one-time data from SSE stream (for data fetching — does NOT create a chat session)
const fetchSSEData = async (query) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/query`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ query, save_to_history: false })  // ← never creates a session
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let resultData = null;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split('\n\n');
            buffer = events.pop();

            for (const eventStr of events) {
                if (eventStr.includes('event: metadata')) {
                    const dataLine = eventStr.split('\n').find(l => l.startsWith('data: '));
                    if (dataLine) {
                        const jsonStr = dataLine.slice(6);
                        try {
                            const metadata = JSON.parse(jsonStr);
                            resultData = metadata.data;
                            // We found our data, we can stop reading
                            return resultData;
                        } catch (e) {
                            console.error("JSON parse error", e);
                        }
                    }
                }
            }
        }
    } finally {
        reader.cancel();
    }
    return resultData || [];
};

export const fetchFloats = async ({ days = 30 } = {}) => {
    try {
        const data = await fetchSSEData("show active floats and their current status");

        if (data) {
            return data.map(item => ({
                float_id: item.platform_number || 'Unknown',
                lat: Number(item.latitude),
                lon: Number(item.longitude),
                timestamp: item.time,
                temperature: item.temp != null ? Number(item.temp) : null,
                salinity: item.psal != null ? Number(item.psal) : null,
                pressure: item.pres != null ? Number(item.pres) : null,
                platform_type: 'Argo'
            }));
        }
        return [];
    } catch (error) {
        console.error("Failed to fetch floats:", error);
        throw error;
    }
};

export const fetchFloatDetails = async (floatId, days = 30) => {
    try {
        const data = await fetchSSEData(`show status for float ${floatId}`);
        if (data && data.length > 0) {
            const item = data[0];
            return {
                float_id: item.platform_number,
                lat: item.latitude,
                lon: item.longitude,
                timestamp: item.time,
                temperature: item.temp,
                salinity: item.psal
            };
        }
        return null;
    } catch (error) {
        console.error(`Failed to fetch details for float ${floatId}:`, error);
        throw error;
    }
};

export const streamChatResponse = async (query, sessionId, onChunk) => {
    try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/query`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                query: query,
                session_id: sessionId
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${err}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process all complete events in buffer
            const parts = buffer.split('\n\n');
            // The last part might be incomplete, keep it in buffer
            buffer = parts.pop();

            for (const part of parts) {
                if (!part.trim()) continue; // Skip empty keep-alive lines

                const lines = part.split('\n');
                let eventType = null;
                let data = '';

                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        eventType = line.slice(7).trim();
                    } else if (line.startsWith('data: ')) {
                        // Concatenate data lines (spec allows multiple data lines)
                        data += (data ? '\n' : '') + line.slice(6);
                    }
                }

                if (eventType === 'chunk' && data) {
                    try {
                        const text = JSON.parse(data);
                        onChunk(text, 'text');
                    } catch (e) {
                        onChunk(data, 'text');
                    }
                } else if (eventType === 'visualization' && data) {
                    try {
                        const viz = JSON.parse(data);
                        onChunk(viz, 'visualization');
                    } catch (e) { console.error("Bad viz data", e); }
                } else if (eventType === 'error') {
                    onChunk(`\n[Error: ${JSON.stringify(data)}]`, 'text');
                }
            }
        }

    } catch (error) {
        console.error("Chat error:", error);
        onChunk("\n[Connection Error]");
        throw error;
    }
};

export const renameSession = async (sessionId, newTitle) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
        method: "PATCH",
        headers: headers,
        body: JSON.stringify({ title: newTitle })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
};

export const deleteSession = async (sessionId) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
        method: "DELETE",
        headers: headers
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
};

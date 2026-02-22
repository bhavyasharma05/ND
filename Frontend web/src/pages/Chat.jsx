import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { streamChatResponse, renameSession, deleteSession } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Chat = () => {
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // User profile state
    const [user, setUser] = useState(null);

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // Initial load
    useEffect(() => {
        fetchUser();
        fetchSessions();
    }, []);

    // Load messages when session changes
    useEffect(() => {
        if (currentSessionId) {
            fetchMessages(currentSessionId);
        } else {
            setMessages([]);
        }
    }, [currentSessionId]);

    // Auto-scroll
    useEffect(() => {
        // Use 'auto' behavior to prevent UI stutter/freeze during rapid streaming updates
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, [messages]);

    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    }

    const fetchSessions = async () => {
        const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching sessions:', error);
        else setSessions(data || []);
    };

    const fetchMessages = async (sessionId) => {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (error) console.error('Error fetching messages:', error);
        else setMessages(data || []);
    };

    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessages([]);
        setInputValue('');
        // Focus input
        setTimeout(() => textareaRef.current?.focus(), 100);
    };

    // State for UI interactions
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [editingSessionId, setEditingSessionId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [deletingSessionId, setDeletingSessionId] = useState(null);

    const handleSessionClick = (sessionId) => {
        if (editingSessionId) return; // Prevent navigation while editing
        setCurrentSessionId(sessionId);
        setActiveMenuId(null);
    };

    const handleMenuToggle = (sessionId) => {
        setActiveMenuId(prev => prev === sessionId ? null : sessionId);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.session-menu-container')) {
                setActiveMenuId(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // --- Rename Logic ---
    const startRenaming = (e, session) => {
        e.stopPropagation();
        setEditingSessionId(session.id);
        setEditTitle(session.title || '');
        setActiveMenuId(null);
    };

    const saveRename = async (e) => {
        if (e) e.stopPropagation();

        if (!editTitle.trim() || editTitle === sessions.find(s => s.id === editingSessionId)?.title) {
            setEditingSessionId(null);
            return;
        }

        const sessionId = editingSessionId;
        const oldSessions = [...sessions];

        // Optimistic update
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: editTitle } : s));
        setEditingSessionId(null);

        try {
            await renameSession(sessionId, editTitle);
        } catch (error) {
            console.error("Error renaming session:", error);
            setSessions(oldSessions); // Revert
        }
    };

    const cancelRename = (e) => {
        if (e) e.stopPropagation();
        setEditingSessionId(null);
        setEditTitle('');
    };

    const handleEditKeyDown = (e) => {
        if (e.key === 'Enter') saveRename();
        if (e.key === 'Escape') cancelRename();
    };



    // --- Delete Logic ---
    const confirmDeleteClicked = (e, sessionId) => {
        e.stopPropagation();
        setDeletingSessionId(sessionId);
        setActiveMenuId(null);
    };

    const executeDelete = async () => {
        if (!deletingSessionId) return;

        const sessionId = deletingSessionId;
        setDeletingSessionId(null); // Close modal immediately

        // Optimistic update
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (currentSessionId === sessionId) {
            handleNewChat();
        }

        try {
            await deleteSession(sessionId);
        } catch (error) {
            console.error("Error deleting session:", error);
            fetchSessions(); // Revert/Refresh
            alert("Failed to delete chat.");
        }
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        let sessionId = currentSessionId;
        const queryText = inputValue;

        // Optimistic UI updates
        const tempUserMsgId = Date.now().toString();
        const userMessage = {
            id: tempUserMsgId,
            role: 'user',
            content: queryText,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            // 1. Create session if needed
            if (!sessionId) {
                const { data: newSession, error } = await supabase
                    .from('chat_sessions')
                    .insert({
                        user_id: user?.id,
                        title: "New Chat"
                    })
                    .select()
                    .single();

                if (error) throw error;
                sessionId = newSession.id;
                setCurrentSessionId(sessionId);
                // Update session list locally
                setSessions(prev => [newSession, ...prev]);
            }

            // 2. Prepare for streaming response
            const assistantMessageId = (Date.now() + 1).toString();
            setMessages(prev => [...prev, {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                created_at: new Date().toISOString()
            }]);

            // 3. Call backend API with session_id
            await streamChatResponse(queryText, sessionId, (chunk, type) => {
                setMessages(prev => prev.map(msg => {
                    if (msg.id !== assistantMessageId) return msg;

                    if (type === 'visualization') {
                        return { ...msg, meta: { visualization: chunk } };
                    } else {
                        return { ...msg, content: msg.content + chunk };
                    }
                }));
            });

            // Note: The backend SAVES the messages to DB. 
            // We shouldn't need to manually insert messages here if the API does it.
            // However, to keep UI consistent, real-time subscription or re-fetch is ideal.
            // For now, simple state update is enough.

        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, {
                id: 'error-' + Date.now(),
                role: 'assistant',
                content: "Error: Unable to process request."
            }]);
        } finally {
            setIsLoading(false);
            // Refresh sessions to reflect any title auto-generation from backend
            if (currentSessionId) {
                fetchSessions();
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [inputValue]);

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 font-display antialiased h-screen overflow-hidden flex selection:bg-primary/30">
            {/* Sidebar - Chat History Drawer */}
            <aside className="w-80 bg-surface-light dark:bg-[#151e1d] border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-sm z-20 hidden md:flex transition-all">
                {/* Logo Area */}
                <div className="p-6 flex items-center gap-3">
                    <Link to="/dashboard" className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/30 text-white hover:scale-105 transition-transform">
                        <span className="material-icons text-xl">water_drop</span>
                    </Link>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Ocean AI</h1>
                </div>

                {/* New Chat Button */}
                <div className="px-5 mb-4">
                    <button
                        onClick={handleNewChat}
                        className="w-full flex items-center gap-3 bg-primary hover:bg-primary-dark text-white py-3 px-4 rounded-xl shadow-md shadow-primary/20 transition-all active:scale-[0.98] font-medium group"
                    >
                        <span className="material-icons text-xl group-hover:rotate-90 transition-transform">add</span>
                        <span>New Chat</span>
                    </button>
                </div>

                {/* Recent Chats List */}
                <div className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
                    <h3 className="px-4 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Recent Chats</h3>
                    {sessions.length === 0 && (
                        <div className="px-4 py-8 text-center text-slate-400 text-sm italic">
                            No recent chats. Start a new analysis!
                        </div>
                    )}
                    {sessions.map((session) => (
                        <div key={session.id} className="relative group session-menu-container">
                            {editingSessionId === session.id ? (
                                /* Inline Rename Edit Mode */
                                <div className={`w-full p-2 rounded-lg flex items-center gap-2 ${currentSessionId === session.id
                                    ? 'bg-primary/10 dark:bg-primary/20 border border-primary/20'
                                    : 'bg-slate-100 dark:bg-white/5 border border-transparent'
                                    }`}>
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onKeyDown={handleEditKeyDown}
                                        autoFocus
                                        className="flex-1 bg-transparent border-0 border-b border-primary/50 text-sm focus:ring-0 p-0 text-slate-800 dark:text-white"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <button onClick={saveRename} className="text-green-600 hover:text-green-500"><span className="material-icons text-sm">check</span></button>
                                    <button onClick={cancelRename} className="text-red-500 hover:text-red-400"><span className="material-icons text-sm">close</span></button>
                                </div>
                            ) : (
                                /* Normal View */
                                <>
                                    <button
                                        onClick={() => handleSessionClick(session.id)}
                                        className={`w-full text-left p-3 rounded-lg transition-all flex flex-col gap-1 relative overflow-hidden pr-8 ${currentSessionId === session.id
                                            ? 'bg-primary/10 dark:bg-primary/20 border border-primary/20 shadow-sm'
                                            : 'hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                                            }`}
                                    >
                                        <span className={`text-sm font-medium truncate w-full ${currentSessionId === session.id
                                            ? 'text-primary-dark dark:text-white'
                                            : 'text-slate-700 dark:text-slate-300'
                                            }`}>
                                            {session.title || "Untitled Chat"}
                                        </span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                            {new Date(session.created_at).toLocaleDateString()}
                                        </span>
                                    </button>

                                    {/* Three Dots Menu Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleMenuToggle(session.id);
                                        }}
                                        className={`absolute right-2 top-3 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors opacity-0 group-hover:opacity-100 ${activeMenuId === session.id ? 'opacity-100' : ''}`}
                                    >
                                        <span className="material-icons text-base">more_vert</span>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {activeMenuId === session.id && (
                                        <div className="absolute right-0 top-10 w-32 bg-white dark:bg-[#1b2424] rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                            <button
                                                onClick={(e) => startRenaming(e, session)}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2"
                                            >
                                                <span className="material-icons text-base">edit</span>
                                                Rename
                                            </button>
                                            <button
                                                onClick={(e) => confirmDeleteClicked(e, session.id)}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                            >
                                                <span className="material-icons text-base">delete</span>
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* User Profile */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 mt-auto bg-slate-50/50 dark:bg-black/20 backdrop-blur-sm">
                    <div className="flex items-center gap-3 p-2 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                            {user?.email?.slice(0, 2).toUpperCase() || 'JD'}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{user?.user_metadata?.full_name || 'Researcher'}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#0f1515]">
                {/* Header (Mobile Only) */}
                <div className="md:hidden p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
                    <h1 className="font-bold text-slate-900 dark:text-white">Ocean AI</h1>
                    <button onClick={handleNewChat} className="p-2 text-primary"><span className="material-icons">add</span></button>
                </div>

                {/* Messages Container - The Scrollable Area */}
                <div className="flex-1 overflow-y-auto px-4 py-6 md:px-12 md:py-8 space-y-6 scroll-smooth">

                    {/* Empty State */}
                    {!currentSessionId && messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center p-8 opacity-60 h-full">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center mb-6 animate-pulse-slow">
                                <span className="material-icons text-5xl text-primary">tsunami</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Ocean AI Workspace</h2>
                            <p className="max-w-md text-slate-500">Select a chat from the timeline or start a new analysis to explore real-time Argo float telemetry.</p>
                        </div>
                    ) : (
                        /* Messages List */
                        <div className="max-w-3xl mx-auto space-y-6">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {/* Avatar */}
                                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 shadow-sm ${msg.role === 'assistant'
                                            ? 'bg-gradient-to-tr from-primary to-sky-500 text-white'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                            }`}>
                                            <span className="material-icons text-sm">
                                                {msg.role === 'assistant' ? 'smart_toy' : 'person'}
                                            </span>
                                        </div>

                                        {/* Bubble */}
                                        <div className={`p-4 rounded-2xl shadow-sm leading-relaxed text-[15px] ${msg.role === 'assistant'
                                            ? 'bg-white dark:bg-[#1b2424] border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-none'
                                            : 'bg-primary text-white rounded-tr-none'
                                            }`}>
                                            <p className="whitespace-pre-wrap">{msg.content}</p>

                                            {/* Chart Rendering */}
                                            {msg.meta?.visualization?.type === 'line_chart' && (
                                                <div className="mt-4 h-64 w-full min-w-[300px]">
                                                    <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                                                        {msg.meta.visualization.metric || 'Trend Analysis'}
                                                    </p>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart data={msg.meta.visualization.data}>
                                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                            <XAxis
                                                                dataKey="date"
                                                                tick={{ fontSize: 10 }}
                                                                tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                            />
                                                            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} width={30} />
                                                            <Tooltip
                                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                                formatter={(value) => [
                                                                    typeof value === 'number' ? value.toFixed(2) : value,
                                                                    msg.meta.visualization.metric || msg.meta.visualization.dataKey
                                                                ]}
                                                                labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                                            />
                                                            <Line
                                                                type="monotone"
                                                                dataKey={msg.meta.visualization.dataKey || "avg_temp"}
                                                                stroke="#0ea5e9"
                                                                strokeWidth={2}
                                                                dot={{ r: 3 }}
                                                                activeDot={{ r: 5 }}
                                                            />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            )}

                                            {/* Table Rendering for DATA_CURRENT */}
                                            {msg.meta?.visualization?.type === 'table' && (
                                                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
                                                    <p className="text-xs font-semibold text-slate-400 px-3 pt-2 pb-1 uppercase tracking-wider">
                                                        Argo Float Data &bull; top {msg.meta.visualization.rows?.length} of {msg.meta.visualization.total} observations
                                                    </p>
                                                    <table className="w-full text-[11px] text-slate-600 dark:text-slate-300">
                                                        <thead>
                                                            <tr className="bg-slate-50 dark:bg-slate-800/60 text-left">
                                                                {['Float ID', 'Date', 'Lat', 'Lon', 'Depth (dbar)', 'Temp (°C)', 'Sal (PSU)'].map(h => (
                                                                    <th key={h} className="px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {msg.meta.visualization.rows?.map((row, i) => (
                                                                <tr key={i} className={`border-t border-slate-100 dark:border-slate-700/50 ${i % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}`}>
                                                                    <td className="px-3 py-1.5 font-mono">{row.platform_number ?? '—'}</td>
                                                                    <td className="px-3 py-1.5 whitespace-nowrap">{row.time ? new Date(row.time).toLocaleDateString() : '—'}</td>
                                                                    <td className="px-3 py-1.5">{row.latitude != null ? Number(row.latitude).toFixed(2) : '—'}</td>
                                                                    <td className="px-3 py-1.5">{row.longitude != null ? Number(row.longitude).toFixed(2) : '—'}</td>
                                                                    <td className="px-3 py-1.5 font-semibold text-blue-500">{row.pres != null ? Number(row.pres).toFixed(1) : '—'}</td>
                                                                    <td className="px-3 py-1.5 text-orange-500">{row.temp != null ? Number(row.temp).toFixed(2) : '—'}</td>
                                                                    <td className="px-3 py-1.5 text-teal-500">{row.psal != null ? Number(row.psal).toFixed(2) : '—'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area - Fixed at Bottom via Flex */}
                <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0f1515] p-4 md:p-6 flex-shrink-0 z-10">
                    <div className="max-w-3xl mx-auto">
                        <div className="relative bg-white dark:bg-[#1b2424] rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                            <textarea
                                ref={textareaRef}
                                className="w-full bg-transparent border-0 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-0 py-4 pl-5 pr-14 resize-none max-h-48 overflow-y-auto min-h-[56px]"
                                rows="1"
                                placeholder={currentSessionId ? "Message Ocean AI..." : "Ask anything to start a new chat..."}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isLoading}
                            ></textarea>
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isLoading}
                                className={`absolute bottom-2.5 right-2.5 p-2 rounded-xl transition-all duration-200 ${!inputValue.trim() || isLoading
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    : 'bg-primary hover:bg-primary-dark text-white shadow-md hover:scale-105'
                                    }`}
                            >
                                <span className={`material-icons text-xl flex ${isLoading ? 'animate-spin' : ''}`}>
                                    {isLoading ? 'sync' : 'arrow_upward'}
                                </span>
                            </button>
                        </div>
                        <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 mt-2">
                            Ocean AI may produce inaccurate information about floats, locations, or people.
                        </p>
                    </div>
                </div>
            </main>
            {/* Delete Confirmation Modal */}
            {deletingSessionId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#1b2424] rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 dark:border-slate-700 scale-100 animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
                            <span className="material-icons text-2xl">delete_forever</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Chat?</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                            Are you sure you want to delete this conversation? This action cannot be undone and will remove all associated data.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeletingSessionId(null)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeDelete}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all active:scale-95"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;

import React, { useState, useEffect } from 'react';
import { fetchFloats } from '../services/api';

const ArgoExplorer = () => {
    const [floats, setFloats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadFloats = async () => {
            try {
                const data = await fetchFloats({ days: 30 });
                setFloats(data);
            } catch (error) {
                console.error("Failed to load floats", error);
            } finally {
                setLoading(false);
            }
        };

        loadFloats();
    }, []);

    const filteredFloats = floats.filter(f =>
        f.float_id.includes(searchTerm) ||
        (f.platform_type && f.platform_type.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-8">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Float Explorer</h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
                        Monitor, analyze, and retrieve telemetry data from the global array of Argo floats.
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white dark:bg-[#1a2827] px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full text-primary">
                            <span className="material-icons text-xl">sensors</span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Active Floats</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">
                                {loading ? '...' : floats.length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls Section */}
            <div className="bg-white dark:bg-[#1a2827] p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full lg:w-96 group">
                        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                        <input
                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg leading-5 bg-slate-50 dark:bg-[#131f1e] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-shadow"
                            placeholder="Search by Float ID..."
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                        <button className="flex items-center justify-center gap-2 bg-white dark:bg-[#1a2827] border border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 py-2.5 px-4 rounded-lg hover:border-primary hover:text-primary transition-all text-sm font-medium ml-auto lg:ml-0">
                            <span className="material-icons text-sm">download</span>
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-[#1a2827] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-[#131f1e]">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Float ID</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Coordinates</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Update</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Temp / Salinity</th>
                                <th className="relative px-6 py-4"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-[#1a2827] divide-y divide-slate-200 dark:divide-slate-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-slate-500">Loading floats...</td>
                                </tr>
                            ) : filteredFloats.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-slate-500">No floats found.</td>
                                </tr>
                            ) : (
                                filteredFloats.slice(0, 50).map((float) => (
                                    <tr key={`${float.float_id}-${float.timestamp}`} className="hover:bg-primary/5 dark:hover:bg-primary/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mr-4">
                                                    <span className="material-icons text-lg">router</span>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900 dark:text-white">#{float.float_id}</div>
                                                    <div className="text-xs text-slate-500">Argo Float</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">
                                            {float.lat.toFixed(2)}, {float.lon.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">
                                            {new Date(float.timestamp).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-slate-900 dark:text-white">
                                                {float.temperature ? `${float.temperature.toFixed(1)}°C` : 'N/A'}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {float.salinity ? `${float.salinity.toFixed(1)} PSU` : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button className="text-primary hover:text-primary-dark font-medium">View Data</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ArgoExplorer;

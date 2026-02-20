import React, { useEffect, useState } from 'react';
import { fetchFloats } from '../services/api';

const Dashboard = () => {
    const [stats, setStats] = useState({
        activeFloats: 0,
        avgSST: 0,
        avgPH: 8.1, // Placeholder as backend might not return avg pH directly
        criticalAlerts: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch float data for the last 30 days
                const data = await fetchFloats({ days: 30 });

                // Calculate simple stats
                const activeCount = data.length;

                // Calculate average SST (ignoring nulls)
                const temps = data.map(f => f.temperature).filter(t => t != null);
                const avgTemp = temps.length > 0
                    ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)
                    : 0;

                setStats({
                    activeFloats: activeCount,
                    avgSST: avgTemp,
                    avgPH: 8.1,
                    criticalAlerts: 3 // Mocked for now
                });
            } catch (error) {
                console.error("Dashboard data load failed", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard Overview</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Real-time oceanographic data monitoring system.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary transition-colors shadow-sm">
                        <span className="material-icons text-lg">file_download</span>
                        Export Data
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30">
                        <span className="material-icons text-lg">add</span>
                        Deploy Float
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Active Floats */}
                <div className="bg-white dark:bg-[#1a2827] rounded-xl p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-500 dark:text-blue-400">
                            <span className="material-icons">router</span>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                            +12 New
                        </span>
                    </div>
                    <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Active Floats</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-bold text-slate-800 dark:text-white">
                            {loading ? '...' : stats.activeFloats}
                        </span>
                        <span className="text-sm text-slate-400">/ 5,000</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: '82%' }}></div>
                    </div>
                </div>

                {/* Ocean Temp */}
                <div className="bg-white dark:bg-[#1a2827] rounded-xl p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-500 dark:text-orange-400">
                            <span className="material-icons">thermostat</span>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-medium text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">
                            <span className="material-icons text-xs">arrow_upward</span> 0.4°C
                        </span>
                    </div>
                    <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Avg SST (Global)</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-bold text-slate-800 dark:text-white">
                            {loading ? '...' : stats.avgSST}°C
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Last updated: Just now</p>
                </div>

                {/* pH Level */}
                <div className="bg-white dark:bg-[#1a2827] rounded-xl p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-500 dark:text-purple-400">
                            <span className="material-icons">science</span>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-700/50 px-2 py-1 rounded-full">
                            Stable
                        </span>
                    </div>
                    <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Avg pH Level</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-bold text-slate-800 dark:text-white">{stats.avgPH}</span>
                    </div>
                    {/* Sparkline simulation */}
                    <div className="h-8 mt-2 flex items-end gap-1 opacity-60">
                        <div className="w-1/6 bg-purple-200 h-[40%] rounded-sm"></div>
                        <div className="w-1/6 bg-purple-200 h-[60%] rounded-sm"></div>
                        <div className="w-1/6 bg-purple-200 h-[50%] rounded-sm"></div>
                        <div className="w-1/6 bg-purple-200 h-[70%] rounded-sm"></div>
                        <div className="w-1/6 bg-purple-200 h-[55%] rounded-sm"></div>
                        <div className="w-1/6 bg-purple-500 h-[65%] rounded-sm"></div>
                    </div>
                </div>

                {/* Alerts */}
                <div className="bg-white dark:bg-[#1a2827] rounded-xl p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-500 dark:text-red-400">
                            <span className="material-icons">warning_amber</span>
                        </div>
                        <span className="text-xs text-slate-400">Indian Ocean</span>
                    </div>
                    <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Critical Alerts</h3>
                    <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-bold text-slate-800 dark:text-white">{stats.criticalAlerts}</span>
                    </div>
                    <div className="mt-3 flex -space-x-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600">ID</div>
                        <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600">ID</div>
                        <div className="w-6 h-6 rounded-full bg-slate-400 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600">ID</div>
                    </div>
                </div>
            </div>

            {/* Main Layout: Insight Panel + Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Ocean Insight (AI) */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gradient-to-br from-white to-sky-50 dark:from-[#1a2827] dark:to-[#131f1e] rounded-xl p-6 shadow-sm border border-primary/20 relative overflow-hidden">
                        {/* Background Pattern Decorative */}
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <span className="material-icons text-9xl">psychology</span>
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-primary/20 p-1.5 rounded-md">
                                <span className="material-icons text-primary text-sm">auto_awesome</span>
                            </div>
                            <h3 className="font-bold text-slate-800 dark:text-white">Neel Drishti AI Insight</h3>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                            The predictive model indicates a <span className="font-semibold text-primary">La Niña event</span> strengthening over the next 4 weeks. Thermocline depth analysis in the equatorial Pacific suggests cooling subsurface anomalies spreading eastward.
                        </p>
                        <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 border border-white/50 dark:border-white/5 mb-4 backdrop-blur-sm">
                            <div className="flex justify-between text-xs text-slate-500 mb-2">
                                <span>Confidence Score</span>
                                <span className="font-bold text-slate-700 dark:text-slate-200">94%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-primary to-blue-500 h-full rounded-full" style={{ width: '94%' }}></div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="flex-1 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300 hover:text-primary transition-colors">View Report</button>
                            <button className="flex-1 py-2 text-xs font-medium bg-primary/10 border border-transparent rounded text-primary hover:bg-primary/20 transition-colors">Details</button>
                        </div>
                    </div>

                    {/* Mini Trend List */}
                    <div className="bg-white dark:bg-[#1a2827] rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                        <h3 className="font-semibold text-slate-800 dark:text-white mb-4 text-sm">Regional Anomalies</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                                    <span className="material-icons text-red-500 text-sm">thermostat</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Bay of Bengal</h4>
                                    <p className="text-[10px] text-slate-400">SST +1.2°C above norm</p>
                                </div>
                                <span className="text-xs font-medium text-red-500">+1.2%</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                                    <span className="material-icons text-blue-500 text-sm">waves</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">Arabian Sea</h4>
                                    <p className="text-[10px] text-slate-400">High salinity levels</p>
                                </div>
                                <span className="text-xs font-medium text-blue-500">+0.8%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Large Chart Area */}
                <div className="lg:col-span-2 bg-white dark:bg-[#1a2827] rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">Sea Surface Temperature (SST)</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Last 30 Days • Equatorial Region</p>
                        </div>
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                            <button className="px-3 py-1 text-xs font-medium rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm">30D</button>
                            <button className="px-3 py-1 text-xs font-medium rounded text-slate-500 hover:text-slate-700 dark:text-slate-400">3M</button>
                            <button className="px-3 py-1 text-xs font-medium rounded text-slate-500 hover:text-slate-700 dark:text-slate-400">1Y</button>
                        </div>
                    </div>

                    {/* Visual representation of a chart using pure CSS/HTML divs for bars/lines to avoid external images */}
                    <div className="flex-1 w-full min-h-[300px] relative mt-4">
                        {/* Grid Lines */}
                        <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-300 dark:text-slate-600">
                            <div className="border-b border-slate-100 dark:border-slate-700 w-full h-0 flex items-center"><span className="-ml-8">32°C</span></div>
                            <div className="border-b border-slate-100 dark:border-slate-700 w-full h-0 flex items-center"><span className="-ml-8">30°C</span></div>
                            <div className="border-b border-slate-100 dark:border-slate-700 w-full h-0 flex items-center"><span className="-ml-8">28°C</span></div>
                            <div className="border-b border-slate-100 dark:border-slate-700 w-full h-0 flex items-center"><span className="-ml-8">26°C</span></div>
                            <div className="border-b border-slate-100 dark:border-slate-700 w-full h-0 flex items-center"><span className="-ml-8">24°C</span></div>
                        </div>

                        {/* Chart Bars/Area */}
                        <div className="absolute inset-0 flex items-end justify-between px-2 pb-0 pt-8 gap-2">
                            {/* Generated Bars representing temperature fluctuation */}
                            <div className="w-full bg-primary/20 hover:bg-primary/40 transition-colors rounded-t-sm relative group h-[40%]">
                                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded">26.2°C</div>
                            </div>
                            <div className="w-full bg-primary/20 hover:bg-primary/40 transition-colors rounded-t-sm relative group h-[45%]"></div>
                            <div className="w-full bg-primary/20 hover:bg-primary/40 transition-colors rounded-t-sm relative group h-[55%]"></div>
                            <div className="w-full bg-primary/20 hover:bg-primary/40 transition-colors rounded-t-sm relative group h-[60%]"></div>
                            <div className="w-full bg-primary/30 hover:bg-primary/50 transition-colors rounded-t-sm relative group h-[65%]"></div>
                            <div className="w-full bg-primary/30 hover:bg-primary/50 transition-colors rounded-t-sm relative group h-[58%]"></div>
                            <div className="w-full bg-primary/30 hover:bg-primary/50 transition-colors rounded-t-sm relative group h-[52%]"></div>
                            <div className="w-full bg-primary/40 hover:bg-primary/60 transition-colors rounded-t-sm relative group h-[68%]"></div>
                            <div className="w-full bg-primary/50 hover:bg-primary/70 transition-colors rounded-t-sm relative group h-[75%]">
                                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded">29.8°C</div>
                            </div>
                            <div className="w-full bg-primary/50 hover:bg-primary/70 transition-colors rounded-t-sm relative group h-[70%]"></div>
                            <div className="w-full bg-primary/40 hover:bg-primary/60 transition-colors rounded-t-sm relative group h-[62%]"></div>
                            <div className="w-full bg-primary/40 hover:bg-primary/60 transition-colors rounded-t-sm relative group h-[58%]"></div>
                            <div className="w-full bg-primary/30 hover:bg-primary/50 transition-colors rounded-t-sm relative group h-[60%]"></div>
                            <div className="w-full bg-primary/20 hover:bg-primary/40 transition-colors rounded-t-sm relative group h-[50%]"></div>
                        </div>

                        {/* Trend Line Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 h-full pointer-events-none">
                            <svg className="w-full h-full" preserveAspectRatio="none">
                                <path className="drop-shadow-md" d="M0 200 C 50 180, 100 150, 150 140 S 250 100, 300 80 S 400 90, 500 110 S 600 150, 700 140" fill="none" stroke="#2fc6b7" strokeWidth="3"></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Map Preview & Fleet Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                {/* Live Map Preview Card */}
                <div className="bg-white dark:bg-[#1a2827] rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden group">
                    <div className="h-48 bg-slate-100 relative overflow-hidden">
                        {/* Abstract Map Representation */}
                        <div className="absolute inset-0 bg-blue-50 dark:bg-slate-800 flex items-center justify-center opacity-50" style={{ backgroundImage: 'radial-gradient(#2fc6b7 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                        </div>
                        {/* Map Dots */}
                        <div className="absolute top-1/3 left-1/4 w-3 h-3 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(47,198,183,0.6)]"></div>
                        <div className="absolute top-1/2 left-2/3 w-3 h-3 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(47,198,183,0.6)] delay-75"></div>
                        <div className="absolute bottom-1/4 left-1/2 w-3 h-3 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(47,198,183,0.6)] delay-150"></div>
                        <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-slate-400 rounded-full"></div>
                        <button className="absolute bottom-4 right-4 px-4 py-2 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                            Open Full Map
                        </button>
                        {/* Location Tag for image requirement */}
                        <div className="hidden" data-location="Indian Ocean" style={{}}></div>
                        <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1 rounded-md text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-700">
                            Live Deployment Zone
                        </div>
                    </div>
                    <div className="p-5">
                        <h3 className="font-bold text-slate-800 dark:text-white">Active Deployment Zones</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">3 active regions currently monitoring high-frequency data.</p>
                    </div>
                </div>

                {/* Fleet Status List */}
                <div className="bg-white dark:bg-[#1a2827] rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800 dark:text-white">Recent Maintenance</h3>
                        <a className="text-xs font-medium text-primary hover:text-primary-dark" href="#">View All</a>
                    </div>
                    <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-800">
                        <div className="py-3 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Buoy #442-A</p>
                                    <p className="text-xs text-slate-400">Battery Replacement</p>
                                </div>
                            </div>
                            <span className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">In Progress</span>
                        </div>
                        <div className="py-3 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Sensor Array XJ</p>
                                    <p className="text-xs text-slate-400">Calibration Check</p>
                                </div>
                            </div>
                            <span className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">Completed</span>
                        </div>
                        <div className="py-3 flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Buoy #109-C</p>
                                    <p className="text-xs text-slate-400">Firmware Update</p>
                                </div>
                            </div>
                            <span className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">Scheduled</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

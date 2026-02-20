import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const isActive = (path) => location.pathname === path;

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const linkClass = (path) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive(path)
            ? 'bg-primary/10 text-primary-dark dark:text-primary'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`;

    const iconClass = (path) =>
        `material-icons text-xl ${isActive(path) ? '' : 'group-hover:text-primary transition-colors'
        }`;

    return (
        <aside className="w-64 bg-white dark:bg-[#1a2827] border-r border-slate-200 dark:border-slate-800 flex flex-col h-full flex-shrink-0 transition-all duration-300">
            {/* Logo Area */}
            <Link to="/" className="h-20 flex items-center px-6 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
                        <span className="material-icons text-lg">water</span>
                    </div>
                    <h1 className="font-bold text-xl text-slate-800 dark:text-white tracking-tight">Neel Drishti</h1>
                </div>
            </Link>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
                <Link to="/dashboard" className={linkClass('/dashboard')}>
                    <span className={iconClass('/dashboard')}>dashboard</span>
                    <span>Dashboard</span>
                </Link>
                <Link to="/dashboard/map" className={`${linkClass('/dashboard/map')} group`}>
                    <span className={iconClass('/dashboard/map')}>map</span>
                    <span>Live Map View</span>
                </Link>
                <Link to="/dashboard/history" className={`${linkClass('/dashboard/history')} group`}>
                    <span className={iconClass('/dashboard/history')}>history</span>
                    <span>Historical Data</span>
                </Link>
                <Link to="/dashboard/fleet" className={`${linkClass('/dashboard/fleet')} group`}>
                    <span className={iconClass('/dashboard/fleet')}>sailing</span>
                    <span>Fleet Management</span>
                </Link>

                <div className="pt-4 pb-2 px-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Analysis</p>
                </div>

                <Link to="/chat" className={`${linkClass('/chat')} group`}>
                    <span className={iconClass('/chat')}>psychology</span>
                    <span>AI Models</span>
                </Link>
                <Link to="/dashboard/reports" className={`${linkClass('/dashboard/reports')} group`}>
                    <span className={iconClass('/dashboard/reports')}>description</span>
                    <span>Reports</span>
                </Link>
            </nav>

            {/* Bottom Links */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800/50">
                <a className="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors group" href="#">
                    <span className="material-icons text-xl group-hover:text-primary transition-colors">settings</span>
                    <span>Settings</span>
                </a>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors group">
                    <span className="material-icons text-xl group-hover:text-red-500 transition-colors">logout</span>
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;

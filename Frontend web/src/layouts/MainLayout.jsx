import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Outlet } from 'react-router-dom';

const MainLayout = () => {
    return (
        <div className="font-display bg-ocean-light dark:bg-background-dark text-slate-600 dark:text-slate-300 antialiased h-screen overflow-hidden flex">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <Header />
                <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;

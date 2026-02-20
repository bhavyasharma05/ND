import React from 'react';

const Header = () => {
    return (
        <header className="h-20 bg-white/80 dark:bg-[#1a2827]/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between px-8 z-10 sticky top-0">
            {/* Search */}
            <div className="w-1/3 min-w-[300px]">
                <div className="relative group">
                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                    <input className="w-full pl-10 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-800 border-none rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-slate-900 transition-all" placeholder="Search buoy ID, region, or parameter..." type="text" />
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-6">
                <button className="relative p-2 text-slate-400 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors">
                    <span className="material-icons">notifications</span>
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#1a2827]"></span>
                </button>
                <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
                <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-1.5 pr-3 rounded-full transition-colors">
                    <img alt="User Profile" className="w-9 h-9 rounded-full ring-2 ring-white dark:ring-slate-700 shadow-sm" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3kJrTJMvbZKPAE2OhXidUjrmVpcOKm9m5HF55a3yBkQ_hvt-BdC5u4HjK1PL1SMYJ1Hnf0LEQdB-YqEmirGi7XFqMQ4MEv474qk_uX_-oIlkiSmb8rcnRG3h069qpq4lOaeY4RBVcx0700WFQlnmiI0z0yR2IqwiOvR3A_uoofslEt00Sm2KZdNXVIlFBdUwPDFEnBFMnKnF-ZTAk0Fyv6bSw1oaSonu9m9AvaTp45N-QCkuLajQeE5ZsTzlh0yswiPOxb749aPIf" />
                    <div className="hidden md:block">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dr. Sharma</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Oceanographer</p>
                    </div>
                    <span className="material-icons text-slate-400 text-lg">expand_more</span>
                </div>
            </div>
        </header>
    );
};

export default Header;

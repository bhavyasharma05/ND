import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 antialiased font-display selection:bg-primary/30 min-h-screen">
            {/* Navigation */}
            <nav className="fixed w-full z-50 transition-all duration-300 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-ocean-blue flex items-center justify-center text-white shadow-glow">
                                <span className="material-icons text-2xl">water_drop</span>
                            </div>
                            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Neel Drishti</span>
                        </div>
                        <div className="hidden md:flex items-center space-x-8">
                            <a className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors" href="#features">Features</a>
                            <a className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors" href="#education">How it Works</a>
                            <a className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors" href="#about">About</a>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link to="/login" className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-all shadow-soft hover:shadow-lg transform hover:-translate-y-0.5">
                                <span>Login</span>
                                <span className="material-icons text-sm">login</span>
                            </Link>
                            {/* Mobile menu button */}
                            <button className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">
                                <span className="material-icons">menu</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-grid-pattern opacity-[0.15] dark:opacity-[0.1]"></div>
                    <div className="absolute top-20 right-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-[-10%] w-96 h-96 bg-ocean-blue/20 rounded-full blur-3xl"></div>
                </div>
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary-dark dark:text-primary text-sm font-medium mb-8">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        Now visualizing live Argo Float data
                    </div>
                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
                        Making Ocean Data <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-ocean-blue">Understandable</span> for Everyone
                    </h1>
                    <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
                        Unlock the secrets of the sea with AI-powered insights. Visualize complex Argo float data without the headache of raw NetCDF files.
                    </p>
                    <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link to="/register" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-lg flex items-center justify-center gap-2">
                            Get Started
                            <span className="material-icons">arrow_forward</span>
                        </Link>
                        <button className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                            <span className="material-icons text-primary">play_circle</span>
                            Watch Demo
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;

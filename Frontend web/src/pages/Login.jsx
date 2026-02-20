import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
            });
            if (error) throw error;
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-[#0d101c] dark:text-slate-100 antialiased font-display min-h-screen">
            <div className="flex min-h-screen w-full flex-col lg:flex-row overflow-hidden">
                {/* Left Side: Visual/Brand Section */}
                <div className="relative hidden w-full lg:flex lg:w-1/2 items-center justify-center p-12 overflow-hidden bg-gradient-to-br from-primary to-blue-600">
                    {/* Decorative Elements */}
                    <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-primary/40 rounded-full blur-3xl border border-white/10"></div>

                    <div className="relative z-10 flex flex-col items-start max-w-lg">
                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-12 text-white">
                            <div className="size-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                <span className="material-icons text-white">water_drop</span>
                            </div>
                            <span className="text-2xl font-black tracking-tight">Neel Drishti</span>
                        </div>

                        {/* Hero Content */}
                        <h1 className="text-white text-5xl xl:text-7xl font-black leading-[1.1] mb-6 tracking-tight">
                            Welcome back, <br /><span className="text-white/80">Oceanographer.</span>
                        </h1>
                        <p className="text-white/80 text-lg xl:text-xl font-normal max-w-md leading-relaxed mb-8">
                            Monitor real-time float data and analyze global ocean trends with AI-powered insights.
                        </p>

                        {/* Status Badge */}
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-6 py-4 flex items-center gap-4 text-white">
                            <div className="flex -space-x-2">
                                <div className="size-8 rounded-full border-2 border-primary bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">JD</div>
                                <div className="size-8 rounded-full border-2 border-primary bg-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">Dr</div>
                                <div className="size-8 rounded-full border-2 border-primary bg-slate-400 flex items-center justify-center text-xs font-bold text-slate-600">A</div>
                            </div>
                            <div className="text-sm">
                                <span className="font-bold block">500+ Floats</span>
                                <span className="opacity-70">Active right now</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Illustration Component */}
                    <div className="absolute bottom-12 left-12 right-12 opacity-20 pointer-events-none">
                        <div className="w-full h-[300px] border border-white/20 rounded-xl bg-[url('https://images.unsplash.com/photo-1468581264429-2548ef9eb732?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"></div>
                    </div>
                </div>

                {/* Right Side: Login Form Section */}
                <div className="flex w-full flex-col items-center justify-center bg-white dark:bg-background-dark p-6 lg:w-1/2">
                    {/* Mobile Logo */}
                    <Link to="/" className="flex lg:hidden items-center gap-3 mb-10 text-primary self-start">
                        <div className="size-8 bg-primary/10 rounded flex items-center justify-center">
                            <span className="material-icons text-primary text-sm">water_drop</span>
                        </div>
                        <span className="text-xl font-black tracking-tight text-slate-800 dark:text-white">Neel Drishti</span>
                    </Link>

                    <div className="w-full max-w-[420px] space-y-8">
                        {/* Header */}
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold tracking-tight text-[#0d101c] dark:text-white">Sign In</h2>
                            <p className="text-[#49579c] dark:text-[#8e99cc] text-base">Enter your details to access your dashboard.</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-[#0d101c] dark:text-white" htmlFor="email">Email Address</label>
                                <div className="relative group">
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full rounded-lg border border-[#ced3e8] dark:border-[#2d334d] bg-white dark:bg-[#1a1e35] px-4 py-3.5 pl-11 text-[#0d101c] dark:text-white placeholder:text-[#49579c] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                        placeholder="name@institute.edu"
                                        required
                                    />
                                    <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-[#49579c] dark:text-[#8e99cc] text-lg">mail</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-[#0d101c] dark:text-white" htmlFor="password">Password</label>
                                    <a className="text-xs font-bold text-primary hover:underline" href="#">Forgot Password?</a>
                                </div>
                                <div className="relative group">
                                    <input
                                        type="password"
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full rounded-lg border border-[#ced3e8] dark:border-[#2d334d] bg-white dark:bg-[#1a1e35] px-4 py-3.5 pl-11 text-[#0d101c] dark:text-white placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <span className="material-icons absolute left-3.5 top-1/2 -translate-y-1/2 text-[#49579c] dark:text-[#8e99cc] text-lg">lock</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 py-1">
                                <input className="rounded border-[#ced3e8] dark:border-[#2d334d] text-primary focus:ring-primary size-4" id="remember" type="checkbox" />
                                <label className="text-sm text-[#49579c] dark:text-[#8e99cc] select-none" htmlFor="remember">Remember me for 30 days</label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-lg shadow-lg shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span>Signing In...</span>
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <span className="material-icons text-lg">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Separator */}
                        <div className="relative flex items-center py-2">
                            <div className="flex-grow border-t border-[#ced3e8] dark:border-[#2d334d]"></div>
                            <span className="flex-shrink mx-4 text-xs font-medium text-[#49579c] uppercase tracking-widest">or continue with</span>
                            <div className="flex-grow border-t border-[#ced3e8] dark:border-[#2d334d]"></div>
                        </div>

                        {/* Social Logins */}
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={handleGoogleLogin} className="flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-[#ced3e8] dark:border-[#2d334d] bg-white dark:bg-[#1a1e35] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors font-medium text-sm text-[#0d101c] dark:text-white shadow-sm">
                                <img alt="Google Logo" className="size-5" src="https://lh3.googleusercontent.com/COxitqgJr1sJnIDe8-jiKhxDx1FrYbtRHKJ9z_hELisAlapwE9LUPh6fcXIfb5vwpbMl4xl9H9TRFPc5NOO8Sb3VSgIBrfRYvW6cUA" />
                                Google
                            </button>
                            <button className="flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-[#ced3e8] dark:border-[#2d334d] bg-white dark:bg-[#1a1e35] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors font-medium text-sm text-[#0d101c] dark:text-white shadow-sm">
                                <span className="material-icons text-xl">code</span>
                                ORCID
                            </button>
                        </div>

                        {/* Footer */}
                        <p className="text-center text-sm text-[#49579c] dark:text-[#8e99cc]">
                            Don't have an account?
                            <Link to="/register" className="font-bold text-primary hover:underline ml-1">Sign up for free</Link>
                        </p>
                    </div>

                    {/* Footer Small Print */}
                    <div className="mt-16 text-center text-[11px] text-[#49579c]/50 dark:text-[#8e99cc]/30 max-w-xs uppercase tracking-tighter">
                        © 2026 Neel Drishti • Privacy Policy • Terms of Service
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

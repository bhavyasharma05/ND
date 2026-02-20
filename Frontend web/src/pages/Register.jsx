import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const Register = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            });

            if (error) throw error;

            // Check if email confirmation is required (Supabase default)
            // If session is null, it means confirmation email sent
            if (!data.session) {
                alert("Registration successful! Please check your email to confirm your account.");
                navigate('/login');
            } else {
                navigate('/dashboard');
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen font-display">
            <div className="flex min-h-screen flex-col lg:flex-row">

                {/* Left Side: Registration Form */}
                <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-24 xl:px-32 bg-white dark:bg-background-dark">
                    {/* Mobile Logo */}
                    <Link to="/" className="mb-10 flex items-center gap-2 lg:hidden">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                            <span className="material-icons">water_drop</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Neel Drishti</span>
                    </Link>

                    <div className="mx-auto w-full max-w-md">
                        <div className="mb-10">
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                                Join the Research Network
                            </h1>
                            <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
                                Connect with oceanographers worldwide and access global fleet data.
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleRegister} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold leading-6 text-slate-900 dark:text-slate-200" htmlFor="full-name">Full Name</label>
                                <div className="mt-2">
                                    <input
                                        type="text"
                                        id="full-name"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="block w-full rounded-xl border-0 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-slate-800 dark:text-white dark:ring-slate-700 sm:text-sm sm:leading-6 transition-all duration-200 indent-3"
                                        placeholder="Dr. Ananya Sharma"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold leading-6 text-slate-900 dark:text-slate-200" htmlFor="email">Institute Email</label>
                                <div className="mt-2">
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full rounded-xl border-0 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-slate-800 dark:text-white dark:ring-slate-700 sm:text-sm sm:leading-6 transition-all duration-200 indent-3"
                                        placeholder="researcher@nio.org"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-semibold leading-6 text-slate-900 dark:text-slate-200" htmlFor="password">Password</label>
                                </div>
                                <div className="mt-2">
                                    <input
                                        type="password"
                                        id="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full rounded-xl border-0 py-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary dark:bg-slate-800 dark:text-white dark:ring-slate-700 sm:text-sm sm:leading-6 transition-all duration-200 indent-3"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                <p className="mt-2 text-xs text-slate-500">Must be at least 8 characters long.</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex h-6 items-center">
                                    <input className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary transition-all cursor-pointer" id="terms" type="checkbox" required />
                                </div>
                                <div className="text-sm leading-6">
                                    <label className="font-medium text-slate-600 dark:text-slate-400" htmlFor="terms">
                                        I agree to the <a className="text-primary hover:underline" href="#">Terms of Service</a> and <a className="text-primary hover:underline" href="#">Privacy Policy</a>.
                                    </label>
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex w-full justify-center rounded-xl bg-primary px-4 py-4 text-sm font-bold leading-6 text-white shadow-lg hover:bg-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transform transition-all active:scale-[0.98] hover:shadow-primary/40 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Creating Account...' : 'Create Account'}
                                </button>
                            </div>
                        </form>

                        <div className="mt-10">
                            <div className="relative">
                                <div aria-hidden="true" className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                                </div>
                                <div className="relative flex justify-center text-sm font-medium leading-6">
                                    <span className="bg-white px-6 text-slate-400 dark:bg-background-dark">Or continue with</span>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-4">
                                <button className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-3 py-3 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:ring-transparent dark:bg-slate-800 dark:text-white dark:ring-slate-700 dark:hover:bg-slate-700 transition-colors">
                                    <img alt="Google" className="h-5 w-5" src="https://lh3.googleusercontent.com/COxitqgJr1sJnIDe8-jiKhxDx1FrYbtRHKJ9z_hELisAlapwE9LUPh6fcXIfb5vwpbMl4xl9H9TRFPc5NOO8Sb3VSgIBrfRYvW6cUA" />
                                    <span className="text-sm leading-6">Google</span>
                                </button>
                                <button className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-3 py-3 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:ring-transparent dark:bg-slate-800 dark:text-white dark:ring-slate-700 dark:hover:bg-slate-700 transition-colors">
                                    <span className="material-icons text-xl">school</span>
                                    <span className="text-sm leading-6">ORCID</span>
                                </button>
                            </div>
                        </div>

                        <p className="mt-10 text-center text-sm text-slate-500">
                            Already have an account?
                            <Link to="/login" className="font-bold leading-6 text-primary hover:text-blue-500 transition-colors ml-1">Log in</Link>
                        </p>
                    </div>
                </div>

                {/* Right Side: Brand Panel */}
                <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-indigo-900 lg:flex">
                    {/* Decorative Background Elements */}
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                    <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-400 opacity-20 blur-3xl"></div>
                    <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-indigo-500 opacity-20 blur-3xl"></div>

                    <div className="relative z-10 px-12 text-center xl:px-24">
                        <div className="mb-12 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 shadow-2xl backdrop-blur-md border border-white/20">
                            <span className="material-icons text-white text-5xl">sailing</span>
                        </div>
                        <h2 className="text-5xl font-black tracking-tight text-white xl:text-7xl">
                            Dive Deeper.
                        </h2>
                        <p className="mt-8 text-xl text-blue-100/80 leading-relaxed max-w-lg mx-auto">
                            Leverage our unified platform for Argo float telemetry and predictive AI analysis.
                        </p>

                        <div className="mt-12 flex flex-wrap justify-center gap-8 opacity-60">
                            <div className="flex items-center gap-2 text-white">
                                <span className="material-icons">science</span>
                                <span className="text-sm font-medium uppercase tracking-wider">Accuracy Verified</span>
                            </div>
                            <div className="flex items-center gap-2 text-white">
                                <span className="material-icons">public</span>
                                <span className="text-sm font-medium uppercase tracking-wider">Open Science</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;

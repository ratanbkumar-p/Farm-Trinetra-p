import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import FarmLoader from '../components/ui/FarmLoader';

const FEATURES = [
    { emoji: '🐐', text: 'Every batch, birth, sale and loss — with dates' },
    { emoji: '🌱', text: 'Crops and orchards with live profit' },
    { emoji: '💸', text: 'Expenses, salaries and invoices in one place' }
];

const Login = () => {
    const { user, signInWithGoogle, loading } = useAuth();
    const [error, setError] = useState(null);
    const [isSigningIn, setIsSigningIn] = useState(false);

    // If already logged in, redirect to home
    if (!loading && user) {
        return <Navigate to="/" replace />;
    }

    const handleGoogleSignIn = async () => {
        setError(null);
        setIsSigningIn(true);
        try {
            await signInWithGoogle();
        } catch (err) {
            setError('Sign-in didn’t finish. Please try again.');
            console.error(err);
        } finally {
            setIsSigningIn(false);
        }
    };

    if (loading) {
        return <FarmLoader />;
    }

    return (
        <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-b from-sky-200 via-amber-50 to-cream flex items-center justify-center px-4 py-10">
            {/* Scenery */}
            <motion.div
                className="absolute right-[12%] top-[10%] w-24 h-24 rounded-full bg-sun shadow-[0_0_120px_40px_rgba(255,194,60,0.55)]"
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 50, damping: 14 }}
            />
            <span className="absolute top-[12%] text-5xl opacity-90 animate-drift select-none" style={{ animationDuration: '50s' }}>☁️</span>
            <span className="absolute top-[24%] text-4xl opacity-80 animate-drift select-none" style={{ animationDuration: '70s', animationDelay: '-35s' }}>☁️</span>
            <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className="absolute bottom-0 inset-x-0 w-full h-48">
                <path d="M0 110 Q 220 30 460 100 T 900 90 T 1200 70 V200 H0Z" fill="#b4eabf" />
                <path d="M0 150 Q 300 90 620 140 T 1200 125 V200 H0Z" fill="#4fbf6b" />
            </svg>
            <div className="absolute bottom-6 left-[8%] flex gap-4 text-4xl select-none">
                <span className="animate-float">🐐</span>
                <span className="animate-float" style={{ animationDelay: '0.6s' }}>🐑</span>
            </div>
            <div className="absolute bottom-6 right-[8%] flex items-end gap-3 text-4xl select-none">
                <span className="animate-float" style={{ animationDelay: '0.3s' }}>🐔</span>
                <span className="origin-bottom animate-sway">🌻</span>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                className="relative w-full max-w-md"
            >
                <div className="text-center mb-6">
                    <motion.div
                        initial={{ rotate: -20, scale: 0.4 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.15 }}
                        whileHover={{ rotate: [0, -10, 8, -4, 0] }}
                        className="inline-block w-24 h-24 rounded-[2rem] overflow-hidden ring-4 ring-white shadow-xl bg-white"
                    >
                        <img src="/logo.jpg" alt="Trinetra Farms" className="w-full h-full object-cover" />
                    </motion.div>
                    <h1 className="mt-4 text-4xl text-forest">Trinetra Farms</h1>
                    <p className="text-forest/70 font-semibold">Your whole farm, in your pocket</p>
                </div>

                <div className="rounded-[2rem] bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 p-6 sm:p-8">
                    <ul className="space-y-2.5 mb-6">
                        {FEATURES.map((f, i) => (
                            <motion.li
                                key={f.text}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.25 + i * 0.08 }}
                                className="flex items-center gap-3 text-sm text-gray-700"
                            >
                                <span className="grid place-items-center w-9 h-9 rounded-xl bg-straw text-lg">{f.emoji}</span>
                                {f.text}
                            </motion.li>
                        ))}
                    </ul>

                    {error && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 text-red-700 px-4 py-3 rounded-2xl mb-4 text-sm text-center font-semibold">
                            {error}
                        </motion.div>
                    )}

                    <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleGoogleSignIn}
                        disabled={isSigningIn}
                        className="w-full flex items-center justify-center gap-3 bg-forest text-white font-bold py-4 px-6 rounded-2xl shadow-[0_4px_0_#0b2416] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSigningIn ? (
                            <span className="animate-float inline-block text-xl">🐥</span>
                        ) : (
                            <span className="grid place-items-center w-7 h-7 rounded-full bg-white">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            </span>
                        )}
                        {isSigningIn ? 'Opening the gate…' : 'Continue with Google'}
                    </motion.button>

                    <p className="mt-4 text-xs text-gray-500 text-center">
                        Only team members invited by the farm owner can sign in.
                    </p>
                </div>

                <p className="text-center text-forest/60 text-xs font-semibold mt-6">© {new Date().getFullYear()} Trinetra Farms</p>
            </motion.div>
        </div>
    );
};

export default Login;

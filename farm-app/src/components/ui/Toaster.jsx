import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { notify } from '../../lib/notify';

const STYLES = {
    success: { emoji: '🌱', ring: 'ring-green-200', bar: 'bg-green-500', title: 'Done' },
    error: { emoji: '🥀', ring: 'ring-red-200', bar: 'bg-red-500', title: 'Something went wrong' },
    warn: { emoji: '🐣', ring: 'ring-amber-200', bar: 'bg-amber-500', title: 'Heads up' },
    info: { emoji: '🌾', ring: 'ring-sky-200', bar: 'bg-sky-500', title: 'Note' }
};

const Toaster = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => notify.subscribe((toast) => {
        setToasts(prev => [...prev.slice(-3), toast]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), toast.duration);
    }), []);

    const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    return (
        <div
            aria-live="polite"
            className="fixed z-[300] inset-x-0 top-3 sm:top-auto sm:bottom-6 sm:right-6 sm:left-auto flex flex-col items-center sm:items-end gap-2 px-3 pointer-events-none"
        >
            <AnimatePresence initial={false}>
                {toasts.map(toast => {
                    const s = STYLES[toast.type] || STYLES.info;
                    return (
                        <motion.div
                            key={toast.id}
                            layout
                            initial={{ opacity: 0, y: -16, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 60, scale: 0.95, transition: { duration: 0.18 } }}
                            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                            className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl bg-white/95 backdrop-blur shadow-xl ring-1 ${s.ring}`}
                            role="status"
                        >
                            <div className="flex items-start gap-3 p-3.5 pr-10">
                                <motion.span
                                    initial={{ rotate: -30, scale: 0.4 }}
                                    animate={{ rotate: 0, scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.05 }}
                                    className="text-2xl leading-none select-none"
                                >
                                    {s.emoji}
                                </motion.span>
                                <div className="min-w-0">
                                    <p className="font-display font-semibold text-gray-900 text-sm">{toast.title || s.title}</p>
                                    <p className="text-sm text-gray-600 break-words">{toast.message}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => dismiss(toast.id)}
                                className="absolute top-2.5 right-2.5 p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                                aria-label="Dismiss"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <motion.div
                                className={`absolute bottom-0 left-0 h-1 ${s.bar}`}
                                initial={{ width: '100%' }}
                                animate={{ width: '0%' }}
                                transition={{ duration: toast.duration / 1000, ease: 'linear' }}
                            />
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default Toaster;

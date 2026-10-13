import React from 'react';
import { motion } from 'framer-motion';

/** Friendly "nothing here yet" block with a bobbing emoji and an optional next step */
const EmptyState = ({ emoji = '🌾', title, message, action, compact = false }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-center rounded-3xl border-2 border-dashed border-gray-200 bg-white/60 ${compact ? 'py-8 px-4' : 'py-14 px-6'}`}
    >
        <div className="relative inline-block">
            <span className={`inline-block animate-float select-none ${compact ? 'text-4xl' : 'text-6xl'}`}>{emoji}</span>
            <span className="absolute left-1/2 -translate-x-1/2 -bottom-2 h-2 w-10 rounded-full bg-gray-900/10 blur-[2px]" />
        </div>
        {title && <h3 className={`mt-4 text-gray-800 font-semibold ${compact ? 'text-base' : 'text-xl'}`}>{title}</h3>}
        {message && <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">{message}</p>}
        {action && <div className="mt-5 flex justify-center">{action}</div>}
    </motion.div>
);

export default EmptyState;

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const LINES = ['Waking up the rooster…', 'Counting the goats…', 'Watering the crops…', 'Opening the barn doors…'];

/** Full-screen (or inline) loader: a hopping chick with rotating farm chores */
const FarmLoader = ({ fullScreen = true, label }) => {
    const [line, setLine] = useState(0);

    useEffect(() => {
        if (label) return;
        const t = setInterval(() => setLine(l => (l + 1) % LINES.length), 1400);
        return () => clearInterval(t);
    }, [label]);

    return (
        <div className={`${fullScreen ? 'min-h-[100dvh]' : 'py-20'} flex flex-col items-center justify-center gap-5`}>
            <div className="relative h-20 w-20">
                <motion.span
                    className="absolute inset-x-0 top-0 text-center text-6xl select-none"
                    animate={{ y: [0, -22, 0], rotate: [0, -8, 0, 8, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                >
                    🐥
                </motion.span>
                <motion.span
                    className="absolute left-1/2 bottom-0 -translate-x-1/2 h-2.5 w-12 rounded-full bg-gray-900/15"
                    animate={{ scaleX: [1, 0.6, 1], opacity: [0.5, 0.25, 0.5] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                />
            </div>
            <motion.p
                key={label || line}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-display text-lg text-forest/80"
            >
                {label || LINES[line]}
            </motion.p>
        </div>
    );
};

export default FarmLoader;

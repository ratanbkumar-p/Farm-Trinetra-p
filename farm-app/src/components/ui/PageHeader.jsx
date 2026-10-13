import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ChevronDown } from 'lucide-react';
import { getSection } from '../../lib/navigation';

/**
 * Friendly page header used on every section.
 * Pass `section` (an id from lib/navigation) to pick up the emoji, blurb and
 * beginner tips automatically; override any of them with props.
 */
const PageHeader = ({ section, emoji, title, subtitle, actions, tips, eyebrow, actionsOnly = false }) => {
    const meta = section ? getSection(section) : null;
    const [showTips, setShowTips] = useState(false);
    const finalEmoji = emoji ?? meta?.emoji;
    const finalTitle = title ?? meta?.title;
    const finalSubtitle = subtitle ?? meta?.blurb;
    const finalTips = tips ?? meta?.tips ?? [];

    // Embedded pages (e.g. inside the Contacts hub) only show their buttons
    if (actionsOnly) {
        return actions ? <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div> : null;
    }

    return (
        <header className="relative">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                    {finalEmoji && (
                        <motion.div
                            initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                            whileHover={{ rotate: [0, -10, 8, -4, 0], transition: { duration: 0.6 } }}
                            className="shrink-0 grid place-items-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white shadow-md ring-1 ring-black/5 text-3xl sm:text-4xl select-none"
                        >
                            <span className="animate-float inline-block">{finalEmoji}</span>
                        </motion.div>
                    )}
                    <div className="min-w-0">
                        {eyebrow && (
                            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-green-700/80 mb-0.5">{eyebrow}</p>
                        )}
                        <motion.h1
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                            className="text-[1.75rem] sm:text-4xl leading-tight text-forest text-balance"
                        >
                            {finalTitle}
                        </motion.h1>
                        {finalSubtitle && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="text-gray-500 mt-1 text-sm sm:text-base max-w-2xl"
                            >
                                {finalSubtitle}
                            </motion.p>
                        )}
                        {finalTips.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setShowTips(v => !v)}
                                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sun/20 hover:bg-sun/30 text-amber-900 px-3 py-1 text-xs font-bold"
                                aria-expanded={showTips}
                            >
                                <Lightbulb className="w-3.5 h-3.5" />
                                How this page works
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTips ? 'rotate-180' : ''}`} />
                            </button>
                        )}
                    </div>
                </div>
                {actions && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 }}
                        className="flex flex-wrap items-center gap-2 md:justify-end"
                    >
                        {actions}
                    </motion.div>
                )}
            </div>

            <AnimatePresence initial={false}>
                {showTips && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 no-entrance">
                            {finalTips.map((tip, i) => (
                                <motion.li
                                    key={tip}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 * i }}
                                    className="flex gap-2 rounded-xl bg-white/80 ring-1 ring-amber-100 px-3 py-2 text-sm text-gray-700"
                                >
                                    <span className="font-display font-semibold text-amber-600">{i + 1}.</span>
                                    {tip}
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

export default PageHeader;

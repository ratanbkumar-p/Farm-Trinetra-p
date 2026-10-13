import React from 'react';
import { motion } from 'framer-motion';

/**
 * Pill tabs with a springy sliding highlight. Scrolls sideways on small screens.
 * tabs: [{ id, label, emoji?, count? }]
 */
const SegmentedTabs = ({ tabs, value, onChange, layoutId = 'segmented-tab', className = '' }) => (
    <div className={`-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-none ${className}`}>
        <div role="tablist" className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-white/80 backdrop-blur ring-1 ring-gray-200 shadow-sm min-w-max">
            {tabs.map(tab => {
                const active = value === tab.id;
                return (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(tab.id)}
                        className={`relative px-3.5 sm:px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${active ? 'text-forest' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        {active && (
                            <motion.span
                                layoutId={layoutId}
                                className="absolute inset-0 rounded-xl bg-gradient-to-b from-sun/40 to-sun/20 ring-1 ring-amber-200"
                                transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                            />
                        )}
                        <span className="relative flex items-center gap-1.5">
                            {tab.emoji && <span className="text-base leading-none">{tab.emoji}</span>}
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={`ml-0.5 min-w-5 px-1.5 py-0.5 rounded-full text-[11px] leading-none ${active ? 'bg-forest text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </span>
                    </button>
                );
            })}
        </div>
    </div>
);

export default SegmentedTabs;

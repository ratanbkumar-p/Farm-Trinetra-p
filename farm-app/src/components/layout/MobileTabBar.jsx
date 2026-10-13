import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutGrid, Search, Sparkles, LogOut, IndianRupee } from 'lucide-react';
import Modal from '../ui/Modal';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { SECTION_GROUPS, MOBILE_TABS, TONES, getSection, getSectionForPath } from '../../lib/navigation';
import { useSections } from '../../lib/useSections';

/** Thumb-friendly bottom navigation for phones, plus the "More" sheet with every section */
const MobileTabBar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isMoreOpen, openMore, closeMore, openQuickJump, openGuide, openSell } = useUI();
    const sections = useSections();
    const { logout } = useAuth();
    const current = getSectionForPath(location.pathname);
    const tabs = MOBILE_TABS.map(getSection);
    const isMoreActive = current && !MOBILE_TABS.includes(current.id);

    const renderTabs = (list) => list.map(section => {
        const active = current?.id === section.id;
        return (
            <NavLink
                key={section.id}
                to={section.path}
                className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl"
                aria-label={section.title}
            >
                {active && (
                    <motion.span
                        layoutId="mobile-tab-blob"
                        className="absolute inset-0 rounded-2xl bg-gradient-to-b from-sun/45 to-sun/15"
                        transition={{ type: 'spring', stiffness: 520, damping: 36 }}
                    />
                )}
                <motion.span
                    animate={active ? { y: [0, -6, 0], scale: [1, 1.18, 1] } : { y: 0, scale: 1 }}
                    transition={{ duration: 0.45 }}
                    className={`relative text-[1.35rem] leading-none ${active ? '' : 'grayscale opacity-70'}`}
                >
                    {section.emoji}
                </motion.span>
                <span className={`relative text-[10.5px] font-bold ${active ? 'text-forest' : 'text-gray-500'}`}>{section.label}</span>
            </NavLink>
        );
    });

    const go = (path) => {
        closeMore();
        navigate(path);
    };

    return (
        <>
            <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 px-3 pb-safe pointer-events-none">
                <div className="pointer-events-auto mx-auto max-w-md flex items-stretch justify-between rounded-[1.6rem] bg-white/90 backdrop-blur-xl shadow-xl ring-1 ring-black/5 px-1.5 py-1.5">
                    {renderTabs(tabs.slice(0, 2))}
                    <div className="relative flex-1 flex justify-center">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openSell()}
                            className="absolute -top-7 grid place-items-center w-16 h-16 rounded-full bg-forest text-white shadow-xl ring-4 ring-cream"
                            aria-label="Sell animals"
                        >
                            <IndianRupee className="w-6 h-6" />
                            <span className="absolute -bottom-5 text-[10.5px] font-bold text-forest">Sell</span>
                        </motion.button>
                    </div>
                    {renderTabs(tabs.slice(2))}
                    <button
                        onClick={openMore}
                        className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl"
                        aria-label="More sections"
                    >
                        {isMoreActive && (
                            <motion.span
                                layoutId="mobile-tab-blob"
                                className="absolute inset-0 rounded-2xl bg-gradient-to-b from-sun/45 to-sun/15"
                                transition={{ type: 'spring', stiffness: 520, damping: 36 }}
                            />
                        )}
                        <span className="relative text-[1.35rem] leading-none">
                            {isMoreActive ? current.emoji : <LayoutGrid className="w-[1.35rem] h-[1.35rem] text-gray-500" />}
                        </span>
                        <span className={`relative text-[10.5px] font-bold ${isMoreActive ? 'text-forest' : 'text-gray-500'}`}>
                            {isMoreActive ? current.label : 'More'}
                        </span>
                    </button>
                </div>
            </nav>

            <Modal isOpen={isMoreOpen} onClose={closeMore} title="Everything on the farm" subtitle="Tap a tile to go there" emoji="🧺">
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-2 no-entrance">
                        <button onClick={() => { closeMore(); openQuickJump(); }} className="flex items-center gap-2 rounded-2xl bg-forest text-white px-4 py-3 font-bold text-sm">
                            <Search className="w-4 h-4" /> Search
                        </button>
                        <button onClick={() => { closeMore(); openGuide(); }} className="flex items-center gap-2 rounded-2xl bg-sun/25 text-amber-900 px-4 py-3 font-bold text-sm">
                            <Sparkles className="w-4 h-4" /> Farm tour
                        </button>
                    </div>
                    {SECTION_GROUPS.map(group => {
                        const items = sections.filter(s => s.group === group.id);
                        if (items.length === 0) return null;
                        return (
                            <div key={group.id}>
                                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400 mb-2">{group.label}</p>
                                <div className="grid grid-cols-2 gap-2 no-entrance">
                                    {items.map((section, i) => {
                                        const tone = TONES[section.tone] || TONES.gray;
                                        const active = current?.id === section.id;
                                        return (
                                            <motion.button
                                                key={section.id}
                                                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ delay: 0.03 * i, type: 'spring', stiffness: 400, damping: 28 }}
                                                onClick={() => go(section.path)}
                                                className={`text-left rounded-2xl p-3 ring-1 ${active ? 'ring-forest bg-green-50' : 'ring-gray-200 bg-white'}`}
                                            >
                                                <span className={`grid place-items-center w-10 h-10 rounded-xl text-xl ${tone.bg}`}>{section.emoji}</span>
                                                <span className="mt-2 block text-sm font-bold text-gray-900">{section.title}</span>
                                                <span className="block text-[11px] leading-snug text-gray-500 line-clamp-2">{section.blurb}</span>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                    <button
                        onClick={async () => { closeMore(); await logout(); navigate('/login'); }}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-red-600 bg-red-50"
                    >
                        <LogOut className="w-4 h-4" /> Sign out
                    </button>
                </div>
            </Modal>
        </>
    );
};

export default MobileTabBar;

import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LogOut, Search, CircleHelp, Settings, Sparkles, Phone, IndianRupee } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { DESKTOP_PRIMARY, TONES, getSectionForPath } from '../../lib/navigation';
import { useSections } from '../../lib/useSections';

const ROLE_LABEL = { super_admin: 'Owner', admin: 'Manager', viewer: 'Viewer' };

/** Close a popover when clicking/tapping anywhere outside of `ref` */
const useOutsideClose = (ref, open, onClose) => {
    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        document.addEventListener('pointerdown', handler);
        return () => document.removeEventListener('pointerdown', handler);
    }, [ref, open, onClose]);
};

export const Avatar = ({ user, size = 'w-9 h-9' }) => (
    <div className={`${size} rounded-full overflow-hidden ring-2 ring-white shadow-md bg-gradient-to-br from-sun to-amber-500 grid place-items-center text-white font-display font-semibold`}>
        {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
            <span>{(user?.displayName || user?.email || 'T').charAt(0).toUpperCase()}</span>
        )}
    </div>
);

const Navbar = () => {
    const { logout, user, userRole } = useAuth();
    const { openQuickJump, openGuide, openSell } = useUI();
    const sections = useSections();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const moreRef = useRef(null);
    const profileRef = useRef(null);

    useOutsideClose(moreRef, isMoreOpen, () => setIsMoreOpen(false));
    useOutsideClose(profileRef, isProfileOpen, () => setIsProfileOpen(false));

    const current = getSectionForPath(location.pathname);
    const primary = sections.filter(s => DESKTOP_PRIMARY.includes(s.id));
    const more = sections.filter(s => !DESKTOP_PRIMARY.includes(s.id) && s.id !== 'settings' && s.id !== 'contacts');
    const isMoreActive = more.some(s => s.id === current?.id);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Failed to log out', error);
        }
    };

    return (
        <nav className="sticky top-0 z-50 pt-safe-top border-b border-gray-200/70 bg-cream/95 backdrop-blur-xl lg:bg-cream/80">
            <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3 px-4 md:px-6 h-16">

                {/* Brand */}
                <Link to="/" className="flex items-center gap-2.5 shrink-0 group" aria-label="Trinetra Farms home">
                    <motion.div
                        whileHover={{ rotate: [0, -12, 10, -6, 0], transition: { duration: 0.6 } }}
                        className="w-10 h-10 rounded-2xl overflow-hidden ring-2 ring-white shadow-md bg-white"
                    >
                        <img src="/logo.jpg" alt="" className="w-full h-full object-cover" />
                    </motion.div>
                    <div className="leading-none hidden lg:block">
                        <span className="block font-display text-[1.15rem] font-bold text-forest tracking-tight">Trinetra</span>
                        <span className="block text-[10px] font-extrabold uppercase tracking-[0.28em] text-amber-700">Farms</span>
                    </div>
                </Link>

                {/* Mobile: current section title */}
                <div className="lg:hidden flex-1 min-w-0 text-center">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                            key={current?.id || 'none'}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.18 }}
                            className="inline-flex items-center gap-1.5 font-display font-semibold text-forest truncate"
                        >
                            {current && <span>{current.emoji}</span>}
                            {current?.title}
                        </motion.span>
                    </AnimatePresence>
                </div>

                {/* Desktop: primary sections */}
                <div className="hidden lg:flex flex-1 justify-center">
                    <div className="flex items-center gap-0.5 p-1 rounded-2xl bg-white/80 ring-1 ring-gray-200 shadow-sm">
                        {primary.map(section => {
                            const active = current?.id === section.id;
                            return (
                                <NavLink
                                    key={section.id}
                                    to={section.path}
                                    className="relative px-3 lg:px-4 py-2 rounded-xl text-sm font-bold outline-none"
                                >
                                    {active && (
                                        <motion.span
                                            layoutId="nav-active-pill"
                                            className="absolute inset-0 rounded-xl bg-forest shadow-md"
                                            transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                                        />
                                    )}
                                    <span className={`relative flex items-center gap-1.5 ${active ? 'text-white' : 'text-gray-600 hover:text-forest'}`}>
                                        <span className={`text-base leading-none ${active ? '' : 'grayscale-[35%]'}`}>{section.emoji}</span>
                                        {section.label}
                                    </span>
                                </NavLink>
                            );
                        })}

                        {/* More */}
                        <div ref={moreRef} className="relative">
                            <button
                                onClick={() => setIsMoreOpen(o => !o)}
                                aria-expanded={isMoreOpen}
                                className="relative px-3 lg:px-4 py-2 rounded-xl text-sm font-bold"
                            >
                                {isMoreActive && (
                                    <motion.span
                                        layoutId="nav-active-pill"
                                        className="absolute inset-0 rounded-xl bg-forest shadow-md"
                                        transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                                    />
                                )}
                                <span className={`relative flex items-center gap-1 ${isMoreActive ? 'text-white' : 'text-gray-600 hover:text-forest'}`}>
                                    {isMoreActive ? <><span>{current.emoji}</span>{current.label}</> : 'More'}
                                    <ChevronDown className={`w-4 h-4 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
                                </span>
                            </button>

                            <AnimatePresence>
                                {isMoreOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                                        transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                                        className="absolute right-0 lg:left-1/2 lg:-translate-x-1/2 top-full mt-3 w-[26rem] rounded-3xl bg-white shadow-xl ring-1 ring-black/5 p-2 grid grid-cols-2 gap-1 origin-top"
                                    >
                                        {more.map((section, i) => {
                                            const tone = TONES[section.tone] || TONES.gray;
                                            return (
                                                <motion.div
                                                    key={section.id}
                                                    initial={{ opacity: 0, y: 6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.03 * i }}
                                                >
                                                    <NavLink
                                                        to={section.path}
                                                        onClick={() => setIsMoreOpen(false)}
                                                        className={({ isActive }) => `flex gap-3 p-3 rounded-2xl hover:bg-gray-50 ${isActive ? 'bg-gray-50 ring-1 ring-gray-200' : ''}`}
                                                    >
                                                        <span className={`shrink-0 grid place-items-center w-10 h-10 rounded-xl text-xl ${tone.bg}`}>{section.emoji}</span>
                                                        <span className="min-w-0">
                                                            <span className="block text-sm font-bold text-gray-900">{section.title}</span>
                                                            <span className="block text-xs text-gray-500 line-clamp-2">{section.blurb}</span>
                                                        </span>
                                                    </NavLink>
                                                </motion.div>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={() => openSell()}
                        className="hidden lg:flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-forest text-white text-sm font-bold shadow-[0_3px_0_#0b2416]"
                    >
                        <IndianRupee className="w-4 h-4" />
                        <span className="hidden xl:inline">Sell</span>
                    </button>
                    <NavLink
                        to="/contacts"
                        className={({ isActive }) => `hidden lg:flex items-center gap-1.5 h-10 px-2.5 xl:px-3.5 rounded-xl text-sm font-bold ${isActive ? 'bg-sky-600 text-white' : 'bg-sky-50 text-sky-800 hover:bg-sky-100'}`}
                        aria-label="Contacts"
                        title="Contacts — farm people & vets"
                    >
                        <Phone className="w-4 h-4" />
                        <span className="hidden xl:inline">Contacts</span>
                    </NavLink>
                    <button
                        onClick={openQuickJump}
                        className="hidden 2xl:flex items-center gap-2 h-10 pl-3 pr-2 rounded-xl bg-white ring-1 ring-gray-200 text-sm text-gray-500 hover:text-gray-800 hover:ring-gray-300 shadow-sm"
                    >
                        <Search className="w-4 h-4" />
                        Jump to…
                        <kbd className="ml-3 rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-bold text-gray-500">⌘K</kbd>
                    </button>
                    <button
                        onClick={openQuickJump}
                        className="2xl:hidden grid place-items-center w-10 h-10 rounded-xl text-gray-600 hover:bg-white hover:shadow-sm"
                        aria-label="Search the farm"
                    >
                        <Search className="w-5 h-5" />
                    </button>
                    <button
                        onClick={openGuide}
                        className="hidden sm:grid place-items-center w-10 h-10 rounded-xl text-gray-600 hover:bg-white hover:shadow-sm"
                        aria-label="Open the farm guide"
                        title="Farm guide"
                    >
                        <CircleHelp className="w-5 h-5" />
                    </button>

                    <div ref={profileRef} className="relative">
                        <button
                            onClick={() => setIsProfileOpen(o => !o)}
                            className="flex items-center gap-1 rounded-full p-0.5 hover:ring-4 hover:ring-sun/30"
                            aria-label="Account menu"
                            aria-expanded={isProfileOpen}
                        >
                            <Avatar user={user} />
                        </button>

                        <AnimatePresence>
                            {isProfileOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                                    transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                                    className="absolute right-0 top-full mt-3 w-72 rounded-3xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden origin-top-right"
                                >
                                    <div className="p-4 bg-gradient-to-br from-straw to-white flex items-center gap-3">
                                        <Avatar user={user} size="w-12 h-12" />
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{user?.displayName || 'Farm member'}</p>
                                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                                            {userRole && (
                                                <span className="mt-1 inline-block rounded-full bg-forest text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                                                    {ROLE_LABEL[userRole] || userRole}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-2">
                                        <Link to="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
                                            <Settings className="w-4 h-4" /> Settings
                                        </Link>
                                        <button onClick={() => { setIsProfileOpen(false); openGuide(); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
                                            <Sparkles className="w-4 h-4" /> Take the farm tour
                                        </button>
                                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50">
                                            <LogOut className="w-4 h-4" /> Sign out
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;

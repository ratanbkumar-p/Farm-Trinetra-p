import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    Settings,
    Sprout,
    Milk,
    Wallet,
    Users
} from 'lucide-react';
import { cn } from '../../lib/utils';

const sidebarVariants = {
    open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    closed: { x: '-100%', transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const links = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Livestock', icon: Milk, path: '/livestock' },
        { name: 'Agriculture', icon: Sprout, path: '/agriculture' },
        { name: 'Expenses', icon: Wallet, path: '/expenses' },
        { name: 'Employees', icon: Users, path: '/employees' },
        { name: 'Settings', icon: Settings, path: '/settings' },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={toggleSidebar}
                />
            )
            }

            <aside
                className={cn(
                    "fixed top-0 left-0 z-50 h-screen w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out",
                    "md:translate-x-0 md:static md:block border-r border-gray-200",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-20 items-center justify-between px-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-farm-green font-sans tracking-wide" style={{ color: '#2E7D32' }}>
                        TRINETRA <span className="text-farm-brown" style={{ color: '#795548' }}>FARMS</span>
                    </h1>
                    <button
                        onClick={toggleSidebar}
                        className="md:hidden p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-full focus:outline-none ring-2 ring-red-100"
                        title="Close Menu"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </div>

                <nav className="mt-6 px-4 space-y-2">
                    {links.map((link) => (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
                                    "text-gray-600 hover:bg-green-50 hover:text-green-700",
                                    isActive && "bg-green-100 text-green-800 shadow-sm font-semibold"
                                )
                            }
                            onClick={() => toggleSidebar()} // Close on navigation on mobile
                        >
                            <link.icon className="w-5 h-5" />
                            {link.name}
                        </NavLink>
                    ))}
                </nav>
            </aside>
        </>
    );
};

export default Sidebar;

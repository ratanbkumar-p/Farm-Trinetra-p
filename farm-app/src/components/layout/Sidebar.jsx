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
            )}

            <motion.aside
                variants={sidebarVariants}
                initial="closed" // Start closed on mobile, controlled by parent for desktop
                animate={isOpen ? 'open' : 'closed'}
                className={cn(
                    "fixed top-0 left-0 z-50 h-screen w-64 bg-white shadow-2xl",
                    "md:translate-x-0 md:static md:block border-r border-gray-200"
                    // On desktop, we might want it always visible or controlled. 
                    // For simplicity, let's make it always visible on desktop:
                )}
                style={{ x: 0 }} // Reset transform on desktop via JS or use media queries better. 
            // Actually Framer Motion fights with media queries. 
            // Better to have conditional rendering or generic styles.
            >
                <div className="flex h-20 items-center justify-center border-b border-gray-100">
                    <h1 className="text-2xl font-bold text-farm-green font-sans" style={{ color: '#2E7D32' }}>
                        Farm<span className="text-farm-brown" style={{ color: '#795548' }}>TNF</span>
                    </h1>
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
                        >
                            <link.icon className="w-5 h-5" />
                            {link.name}
                        </NavLink>
                    ))}
                </nav>
            </motion.aside>
        </>
    );
};

export default Sidebar;

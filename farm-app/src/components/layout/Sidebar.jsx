import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Settings,
    Sprout,
    Milk,
    Wallet,
    Users,
    X,
    LogOut
} from 'lucide-react';
import { cn } from '../../lib/utils';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const links = [
        { name: 'Farm Overview', icon: LayoutDashboard, path: '/' },
        { name: 'Livestock', icon: Milk, path: '/livestock' },
        { name: 'Agriculture', icon: Sprout, path: '/agriculture' },
        { name: 'Expenses', icon: Wallet, path: '/expenses' },
        { name: 'Employees', icon: Users, path: '/employees' },
        { name: 'Settings', icon: Settings, path: '/settings' },
    ];

    const NavContent = () => (
        <>
            <div className="flex h-20 items-center px-6 border-b border-gray-100 justify-between">
                <h1 className="text-xl font-bold text-farm-green font-sans tracking-wide" style={{ color: '#2E7D32' }}>
                    TRINETRA <span className="text-farm-brown" style={{ color: '#795548' }}>FARMS</span>
                </h1>
                {/* Mobile Close Button (Visible only inside mobile drawer) */}
                <button
                    onClick={toggleSidebar}
                    className="md:hidden p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            <nav className="flex-1 px-4 space-y-2 py-6 overflow-y-auto">
                {links.map((link) => (
                    <NavLink
                        key={link.path}
                        to={link.path}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                "font-medium text-gray-600 hover:bg-green-50 hover:text-green-700",
                                isActive && "bg-green-100 text-green-800 shadow-sm font-semibold"
                            )
                        }
                        onClick={() => {
                            if (window.innerWidth < 768) toggleSidebar();
                        }}
                    >
                        <link.icon className="w-5 h-5" />
                        {link.name}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-100">
                <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors">
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Sign Out</span>
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* --- MOBILE DRAWER (Overlay) --- */}
            <div className={cn(
                "fixed inset-0 z-[60] md:hidden transition-opacity duration-300",
                isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}>
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={toggleSidebar}
                />

                {/* Drawer Panel */}
                <div className={cn(
                    "absolute top-0 bottom-0 left-0 w-[280px] bg-white shadow-2xl transition-transform duration-300 ease-out",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <NavContent />
                </div>
            </div>

            {/* --- DESKTOP SIDEBAR (Static) --- */}
            <aside className="hidden md:flex flex-col w-64 h-screen bg-white border-r border-gray-200 sticky top-0">
                <NavContent />
            </aside>
        </>
    );
};

export default Sidebar;

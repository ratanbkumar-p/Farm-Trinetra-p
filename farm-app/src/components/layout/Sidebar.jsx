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
    LogOut,
    Apple,
    FileText
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
// Removed useTheme import

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const { user, isAdmin, canEdit, isSuperAdmin, logout } = useAuth();

    const links = [
        { name: 'Farm Overview', icon: LayoutDashboard, path: '/' },
        { name: 'Livestock', icon: Milk, path: '/livestock' },
        { name: 'Vegetables', icon: Sprout, path: '/vegetables' },
        { name: 'Fruits', icon: Apple, path: '/fruits' },
        { name: 'Expenses', icon: Wallet, path: '/expenses' },
        { name: 'Invoices', icon: FileText, path: '/invoices' },
        { name: 'Employees', icon: Users, path: '/employees' },
        { name: 'Settings', icon: Settings, path: '/settings' },
    ];

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const NavContent = () => (
        <>
            <div className="flex h-20 items-center px-6 border-b border-gray-100 justify-between">
                <div className="flex flex-col justify-center">
                    <h1 className="text-xl font-bold text-farm-green font-sans tracking-wide" style={{ color: '#2E7D32' }}>
                        TRINETRA <span className="text-farm-brown" style={{ color: '#795548' }}>FARMS</span>
                    </h1>
                    {/* Visual indicator for Dev/Test mode */}
                    {(import.meta.env.DEV || (typeof window !== 'undefined' && window.location.search.includes('qa_test=true'))) && (
                        <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold w-fit mt-0.5 border border-orange-200">
                            🔧 TEST DATA MODE
                        </span>
                    )}
                </div>
                {/* Mobile Close Button */}
                <button
                    onClick={toggleSidebar}
                    className="md:hidden p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-full"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* User Info */}
            {user && (
                <div className="px-4 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        {user.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt={user.displayName}
                                className="w-10 h-10 rounded-full border-2 border-green-200"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                                {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                                {user.displayName || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        {isAdmin && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                Admin
                            </span>
                        )}
                    </div>
                </div>
            )}



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
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
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

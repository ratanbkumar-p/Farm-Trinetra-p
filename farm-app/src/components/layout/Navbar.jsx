import React, { useRef, useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Cat,
    Sprout,
    Apple,
    Wallet,
    Users,
    Package,
    FileText,
    Settings,
    LogOut,
    ChevronDown,
    MoreHorizontal,
    UserCircle,
    Stethoscope,
    IndianRupee
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const primaryTabs = [
    { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { id: 'livestock', label: 'Livestock', path: '/livestock', icon: Cat },
    { id: 'vegetables', label: 'Agriculture', path: '/vegetables', icon: Sprout },
    { id: 'fruits', label: 'Fruits', path: '/fruits', icon: Apple },
];

const moreTabs = [
    { id: 'expenses', label: 'Expenses', path: '/expenses', icon: Wallet },
    { id: 'employees', label: 'Employees', path: '/employees', icon: Users },
    { id: 'inventory', label: 'Inventory', path: '/inventory', icon: Package },
    { id: 'invoices', label: 'Invoices', path: '/invoices', icon: FileText },
];

const Navbar = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.pathname);
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const moreTimeoutRef = useRef(null);
    const profileTimeoutRef = useRef(null);

    // Update active tab on route change
    useEffect(() => {
        const currentPath = location.pathname;
        const allTabs = [...primaryTabs, ...moreTabs, { path: '/settings' }, { path: '/contacts' }];
        const matchingTab = allTabs.find(tab => {
            if (tab.path === '/') return currentPath === '/';
            return currentPath.startsWith(tab.path);
        });

        if (matchingTab) {
            setActiveTab(matchingTab.path);
        }
    }, [location.pathname]);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Failed to log out', error);
        }
    };

    const isMoreActive = moreTabs.some(tab => activeTab === tab.path);

    // Hover handlers
    const handleMoreEnter = () => {
        if (moreTimeoutRef.current) clearTimeout(moreTimeoutRef.current);
        setIsMoreOpen(true);
    };

    const handleMoreLeave = () => {
        moreTimeoutRef.current = setTimeout(() => {
            setIsMoreOpen(false);
        }, 200);
    };

    const handleProfileEnter = () => {
        if (profileTimeoutRef.current) clearTimeout(profileTimeoutRef.current);
        setIsProfileOpen(true);
    };

    const handleProfileLeave = () => {
        profileTimeoutRef.current = setTimeout(() => {
            setIsProfileOpen(false);
        }, 200);
    };

    return (
        <nav className="sticky top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm px-4 py-3">
            <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-4">

                {/* Logo */}
                <Link to="/" className="flex items-center gap-3 flex-shrink-0 group">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-green-100 shadow-lg group-hover:shadow-green-200 transition-all">
                        <img src="/logo.jpg" alt="Trinetra Farms" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-baseline md:gap-1">
                        <span className="text-lg font-bold text-green-700 tracking-tight group-hover:text-green-800 transition-colors hidden md:block">
                            Trinetra
                        </span>
                        <span className="text-lg font-bold text-amber-700 tracking-tight group-hover:text-amber-800 transition-colors hidden md:block">
                            Farms
                        </span>
                    </div>
                    <span className="text-xl font-black bg-gradient-to-br from-green-600 to-amber-600 bg-clip-text text-transparent md:hidden">
                        TF
                    </span>
                </Link>

                {/* Primary Navigation - Desktop */}
                <div className="hidden md:flex flex-1 justify-center z-50">
                    <div className="flex items-center gap-1 p-1 bg-gray-100/50 rounded-full border border-gray-200/50 backdrop-blur-sm relative">
                        {primaryTabs.map((tab) => {
                            const isActive = activeTab === tab.path;
                            return (
                                <NavLink
                                    key={tab.id}
                                    to={tab.path}
                                    className="relative px-5 py-2 rounded-full flex items-center gap-2 text-sm font-medium transition-all outline-none"
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-pill"
                                            className="absolute inset-0 bg-white shadow-sm border border-gray-100"
                                            style={{ borderRadius: 9999 }}
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <span className={`relative z-10 flex items-center gap-2 ${isActive ? 'text-green-700 font-bold' : 'text-gray-500 hover:text-gray-900'}`}>
                                        <tab.icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                                        <span>{tab.label}</span>
                                    </span>
                                </NavLink>
                            );
                        })}

                        {/* MORE Dropdown */}
                        <div
                            className="relative"
                            onMouseEnter={handleMoreEnter}
                            onMouseLeave={handleMoreLeave}
                        >
                            <button
                                className={`relative px-5 py-2 rounded-full flex items-center gap-2 text-sm font-medium transition-all outline-none group ${isMoreActive ? 'text-green-700 font-bold' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                {isMoreActive && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="absolute inset-0 bg-white shadow-sm border border-gray-100"
                                        style={{ borderRadius: 9999 }}
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-1">
                                    <MoreHorizontal className={`w-4 h-4 ${isMoreActive ? 'stroke-[2.5px]' : ''}`} />
                                    <span>More</span>
                                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isMoreOpen ? 'rotate-180' : ''}`} />
                                </span>
                            </button>

                            {/* Dropdown Menu */}
                            <AnimatePresence>
                                {isMoreOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden py-2 z-50 ring-1 ring-black/5"
                                    >
                                        {moreTabs.map((tab) => {
                                            const isTabActive = activeTab === tab.path;
                                            return (
                                                <NavLink
                                                    key={tab.id}
                                                    to={tab.path}
                                                    onClick={() => setIsMoreOpen(false)}
                                                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-green-50 hover:text-green-700 ${isTabActive ? 'bg-green-50 text-green-700' : 'text-gray-600'}`}
                                                >
                                                    <div className={`p-1.5 rounded-lg ${isTabActive ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                                                        <tab.icon className="w-4 h-4" />
                                                    </div>
                                                    {tab.label}
                                                </NavLink>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Mobile Scrollable Nav */}
                <div className="md:hidden flex-1 overflow-x-auto no-scrollbar mask-gradient-x">
                    <div className="flex items-center gap-1 p-1">
                        {primaryTabs.map((tab) => {
                            const isActive = activeTab === tab.path;
                            return (
                                <NavLink
                                    key={tab.id}
                                    to={tab.path}
                                    className={`relative px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium transition-all whitespace-nowrap ${isActive ? 'bg-green-100 text-green-700 font-bold' : 'text-gray-500'}`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                </NavLink>
                            );
                        })}
                        {moreTabs.map((tab) => {
                            const isActive = activeTab === tab.path;
                            return (
                                <NavLink
                                    key={tab.id}
                                    to={tab.path}
                                    className={`relative px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium transition-all whitespace-nowrap ${isActive ? 'bg-green-100 text-green-700 font-bold' : 'text-gray-500'}`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span>{tab.label}</span>
                                </NavLink>
                            );
                        })}
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">



                    <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

                    {/* Vet Contact Button -> Link to Page */}
                    <NavLink
                        to="/contacts"
                        className={({ isActive }) => `hidden md:flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-full ${isActive ? 'bg-blue-100 text-blue-700 shadow-inner' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
                        title="Veterinary Contacts"
                    >
                        <Stethoscope className="w-4 h-4" />
                        <span>Vet Contact</span>
                    </NavLink>
                    {/* Mobile Vet Icon */}
                    <Link
                        to="/contacts"
                        className={`md:hidden p-2.5 rounded-full transition-colors ${activeTab === '/contacts' ? 'bg-blue-100 text-blue-700 shadow-inner' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
                        title="Veterinary Contacts"
                    >
                        <Stethoscope className="w-5 h-5" />
                    </Link>

                    <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

                    <NavLink
                        to="/settings"
                        className={({ isActive }) => `p-2.5 rounded-full transition-all ${isActive ? 'bg-gray-100 text-green-700 shadow-inner' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                        title="Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </NavLink>

                    <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

                    {/* User Profile Menu */}
                    <div
                        className="relative"
                        onMouseEnter={handleProfileEnter}
                        onMouseLeave={handleProfileLeave}
                    >
                        <button className="flex items-center gap-2 outline-none group">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs shadow-sm group-hover:shadow-md transition-all group-hover:bg-white group-hover:text-green-700 overflow-hidden">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    <span>TF</span>
                                )}
                            </div>
                        </button>

                        <AnimatePresence>
                            {isProfileOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 ring-1 ring-black/5"
                                >
                                    <div className="px-4 py-4 border-b border-gray-50 bg-gray-50/50">
                                        <p className="text-sm font-bold text-gray-900 truncate">
                                            {user?.displayName || 'Trinetra Admin'}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                            {user?.email || 'admin@trinetrafarms.com'}
                                        </p>
                                    </div>

                                    <div className="p-2">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors group"
                                        >
                                            <div className="p-1.5 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                                                <LogOut className="w-4 h-4" />
                                            </div>
                                            Sign Out
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

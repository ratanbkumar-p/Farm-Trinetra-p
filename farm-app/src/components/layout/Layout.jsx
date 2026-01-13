import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

const Layout = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
            {/* Sidebar - Handles its own responsive state */}
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center h-16 px-4 bg-white shadow-sm z-10">
                    <button
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="ml-4 text-xl font-bold text-green-700">Farm TNF</span>
                </header>

                <main className="flex-1 overflow-auto p-4 md:p-8">
                    {/* Page Transition Wrapper could go here */}
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;

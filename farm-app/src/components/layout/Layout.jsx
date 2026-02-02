import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
    return (
        <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 font-sans">
            {/* Top Navigation */}
            <Navbar />

            {/* Main Content */}
            <main className="flex-1 w-full max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;

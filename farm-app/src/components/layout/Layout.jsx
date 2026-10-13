import React, { Suspense, useEffect } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './Navbar';
import MobileTabBar from './MobileTabBar';
import QuickJump from './QuickJump';
import FarmGuide from './FarmGuide';
import SellFlowModal from '../sell/SellFlowModal';
import FarmLoader from '../ui/FarmLoader';
import { useData } from '../../context/DataContext';

/** Keeps the outgoing page rendered while it animates out */
const AnimatedOutlet = () => {
    const location = useLocation();
    const outlet = useOutlet();

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [location.pathname]);

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            >
                {outlet}
            </motion.div>
        </AnimatePresence>
    );
};

const Layout = () => {
    const { loading } = useData();

    return (
        <div className="flex flex-col min-h-[100dvh] text-gray-900">
            <Navbar />

            <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 pt-5 pb-32 md:px-6 md:pt-8 lg:pb-16 lg:px-8">
                {loading ? (
                    <FarmLoader fullScreen={false} />
                ) : (
                    <Suspense fallback={<FarmLoader fullScreen={false} label="Opening the gate…" />}>
                        <AnimatedOutlet />
                    </Suspense>
                )}
            </main>

            <MobileTabBar />
            <QuickJump />
            <FarmGuide />
            <SellFlowModal />
        </div>
    );
};

export default Layout;

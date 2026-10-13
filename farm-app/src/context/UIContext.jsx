import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const UIContext = createContext(null);

export const useUI = () => useContext(UIContext);

const GUIDE_KEY = 'tf_farm_guide_seen_v1';

const readGuideSeen = () => {
    try {
        return localStorage.getItem(GUIDE_KEY) === '1';
    } catch {
        return true;
    }
};

/** App-shell UI state: Quick Jump palette, Farm Guide tour and the mobile "More" sheet */
export const UIProvider = ({ children }) => {
    const [isQuickJumpOpen, setQuickJumpOpen] = useState(false);
    const [isGuideOpen, setGuideOpen] = useState(() => !readGuideSeen());
    const [isMoreOpen, setMoreOpen] = useState(false);
    // Sell flow: { open, batchId?, presetIds?, presetTotal? }
    const [sell, setSell] = useState({ open: false });

    const closeGuide = useCallback(() => {
        setGuideOpen(false);
        try {
            localStorage.setItem(GUIDE_KEY, '1');
        } catch {
            // Private mode: the tour simply shows again next time
        }
    }, []);

    // ⌘K / Ctrl+K opens Quick Jump from anywhere
    useEffect(() => {
        const onKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setQuickJumpOpen(open => !open);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const value = useMemo(() => ({
        isQuickJumpOpen,
        openQuickJump: () => setQuickJumpOpen(true),
        closeQuickJump: () => setQuickJumpOpen(false),
        isGuideOpen,
        openGuide: () => setGuideOpen(true),
        closeGuide,
        isMoreOpen,
        openMore: () => setMoreOpen(true),
        closeMore: () => setMoreOpen(false),
        sell,
        openSell: (options = {}) => setSell({ open: true, ...options }),
        closeSell: () => setSell({ open: false })
    }), [isQuickJumpOpen, isGuideOpen, isMoreOpen, closeGuide, sell]);

    return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

import { useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { SECTIONS, isSectionEnabled } from './navigation';

/** Sections the owner has switched on (Crops / Fruits can be hidden in Settings) */
export const useSections = () => {
    const { settings } = useSettings();
    const modules = settings?.modules;
    return useMemo(() => SECTIONS.filter(s => isSectionEnabled(s, modules || {})), [modules]);
};

export const useModules = () => {
    const { settings } = useSettings();
    return { crops: settings?.modules?.crops !== false, fruits: settings?.modules?.fruits !== false };
};

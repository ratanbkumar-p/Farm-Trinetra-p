import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
    return useContext(SettingsContext);
};

export const SettingsProvider = ({ children }) => {
    // Default Settings
    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('farm_settings');
        return saved ? JSON.parse(saved) : {
            ownerMode: false,
            feedCostPerUnit: 25, // e.g., Cost per kg of standard feed
            dailyLaborCost: 1000, // Total daily labor cost for the farm
            marginPercentage: 20, // Desired profit margin %

            // Feed consumption ratios (relative to 1 unit)
            consumptionRates: {
                Goat: 1,
                Sheep: 1,
                Cow: 10,
                Chicken: 0.1
            },
            // Split Medical Options
            vaccineNames: ['FMD', 'PPR', 'ET'],
            medicineNames: ['Antibiotics', 'Painkiller', 'Vitamins'],
            pesticideNames: ['Neem Oil', 'Chlorpyrifos', 'Malathion', 'Cypermethrin'],

            // Deworming Settings
            dewormingSchedule: {
                Goat: 90,   // Days
                Sheep: 90,
                Cow: 90,
                Chicken: 30
            },
            dewormingNotificationDays: 7 // Notify 7 days before
        };
    });

    useEffect(() => {
        localStorage.setItem('farm_settings', JSON.stringify(settings));
    }, [settings]);

    const updateSetting = (key, value) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const updateConsumptionRate = (type, value) => {
        setSettings(prev => ({
            ...prev,
            consumptionRates: {
                ...prev.consumptionRates,
                [type]: parseFloat(value)
            }
        }));
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSetting, updateConsumptionRate }}>
            {children}
        </SettingsContext.Provider>
    );
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

const SettingsContext = createContext();

export const useSettings = () => {
    return useContext(SettingsContext);
};

// SAFE DEVELOPMENT MODE:
// Same logic as DataContext to avoid touching production data during dev/test.
const useTestCollections = import.meta.env.DEV || (typeof window !== 'undefined' && window.location.search.includes('qa_test=true'));

const getCollectionName = (baseName) => {
    return useTestCollections ? `qa_${baseName}` : baseName;
};

export const SettingsProvider = ({ children }) => {
    const DEFAULT_SETTINGS = {
        ownerMode: false,
        feedCostPerUnit: 25,
        dailyLaborCost: 1000,
        marginPercentage: 20,
        consumptionRates: {
            Goat: 1,
            Sheep: 1,
            Cow: 10,
            Chicken: 0.1
        },
        vaccineNames: ['FMD', 'PPR', 'ET'],
        medicineNames: ['Antibiotics', 'Painkiller', 'Vitamins'],
        pesticideNames: ['Neem Oil', 'Chlorpyrifos', 'Malathion', 'Cypermethrin'],
        dewormingSchedule: {
            Goat: 90,
            Sheep: 90,
            Cow: 90,
            Chicken: 30
        },
        dewormingNotificationDays: 7,
        scheduledMedications: [
            {
                id: 'deworming',
                name: 'Deworming',
                schedules: {
                    Goat: 0,
                    Sheep: 0,
                    Cow: 0,
                    Buffalo: 0,
                    Poultry: 0,
                    Chicken: 0
                },
                notificationDays: 7
            }
        ]
    };

    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    const SETTINGS_DOC_ID = 'global_settings';
    const COLLECTION_NAME = getCollectionName('settings');

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, COLLECTION_NAME, SETTINGS_DOC_ID), (docSnap) => {
            if (docSnap.exists()) {
                // Merge defaults with saved data to ensure new fields (if any) are present
                setSettings(prev => ({ ...DEFAULT_SETTINGS, ...docSnap.data() }));
            } else {
                // If doc doesn't exist, create it with defaults
                setDoc(doc(db, COLLECTION_NAME, SETTINGS_DOC_ID), DEFAULT_SETTINGS)
                    .catch(e => console.error("Error creating settings doc:", e));
            }
            setLoading(false);
        }, (error) => {
            console.error("Error watching settings:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const updateSetting = async (key, value) => {
        // Optimistic update
        setSettings(prev => ({
            ...prev,
            [key]: value
        }));

        try {
            await updateDoc(doc(db, COLLECTION_NAME, SETTINGS_DOC_ID), {
                [key]: value
            });
        } catch (error) {
            console.error("Error updating setting:", error);
            // Revert or handle error appropriately
        }
    };

    const updateConsumptionRate = async (type, value) => {
        // Optimistic update logic
        const newRates = {
            ...settings.consumptionRates,
            [type]: parseFloat(value)
        };

        setSettings(prev => ({
            ...prev,
            consumptionRates: newRates
        }));

        try {
            await updateDoc(doc(db, COLLECTION_NAME, SETTINGS_DOC_ID), {
                consumptionRates: newRates
            });
        } catch (error) {
            console.error("Error updating consumption rate:", error);
        }
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSetting, updateConsumptionRate, loading }}>
            {children}
        </SettingsContext.Provider>
    );
};

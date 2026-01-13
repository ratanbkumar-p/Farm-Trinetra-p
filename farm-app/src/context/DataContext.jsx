import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDoc } from '../lib/sheets';

const DataContext = createContext();

export const useData = () => {
    return useContext(DataContext);
};

// Initial Mock Data (Fallback)
const INITIAL_DATA = {
    batches: [],
    expenses: [],
    employees: [],
    crops: [],
};

export const DataProvider = ({ children }) => {
    const [data, setData] = useState(INITIAL_DATA);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isOffline, setIsOffline] = useState(false);

    // Load Data
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                // Try Local Storage First for speed/offline
                const localData = localStorage.getItem('farm_data');
                if (localData) {
                    setData(JSON.parse(localData));
                }

                // Attempt Google Sheets Connection
                // NOTE: This will fail if credentials aren't set up, which is expected.
                // We handle that gracefully.
                try {
                    const doc = await getDoc();
                    if (doc) {
                        // If successful, read rows and update state
                        // TODO: Implement read logic here when sheets are set up
                        // For now, we rely on Local Storage mock for the "Add" experience
                        setIsOffline(false);
                    } else {
                        setIsOffline(true);
                    }
                } catch (e) {
                    console.warn("Google Sheets connection failed (expected if no creds):", e);
                    setIsOffline(true);
                }
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Save Data (Local + Cloud)
    const saveData = (newData) => {
        // 1. Update State
        setData(newData);

        // 2. Save to Local Storage
        localStorage.setItem('farm_data', JSON.stringify(newData));

        // 3. Save to Google Sheets (TODO)
        if (!isOffline) {
            // syncToSheets(newData);
        }
    };

    // --- ACTIONS ---

    const addBatch = (batch) => {
        const newBatch = {
            ...batch,
            id: `B-${Date.now().toString().slice(-4)}`, // Simple ID gen
            expenses: [],
            animals: []
        };
        saveData({ ...data, batches: [...data.batches, newBatch] });
    };

    const addExpense = (expense) => {
        const newExpense = {
            ...expense,
            id: `E-${Date.now().toString().slice(-4)}`,
        };
        saveData({ ...data, expenses: [...data.expenses, newExpense] });
    };

    const addEmployee = (employee) => {
        const newEmp = {
            ...employee,
            id: `EMP-${Date.now().toString().slice(-4)}`,
        };
        saveData({ ...data, employees: [...data.employees, newEmp] });
    };

    const addCrop = (crop) => {
        const newCrop = {
            ...crop,
            id: `C-${Date.now().toString().slice(-4)}`
        };
        saveData({ ...data, crops: [...data.crops, newCrop] });
    }

    // Helper to add animals/expenses TO A BATCH
    const updateBatch = (batchId, updates) => {
        const updatedBatches = data.batches.map(b =>
            b.id === batchId ? { ...b, ...updates } : b
        );
        saveData({ ...data, batches: updatedBatches });
    };

    return (
        <DataContext.Provider value={{
            data,
            loading,
            error,
            isOffline,
            addBatch,
            addExpense,
            addEmployee,
            addCrop,
            updateBatch
        }}>
            {children}
        </DataContext.Provider>
    );
};

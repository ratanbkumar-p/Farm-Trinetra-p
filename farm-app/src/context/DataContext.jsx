
import React, { createContext, useContext, useState, useEffect } from 'react';
import { cloud } from '../lib/cloud';

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
                // 1. Load Local
                const localData = localStorage.getItem('farm_data');
                if (localData) {
                    setData(JSON.parse(localData));
                }

                // 2. Load Cloud (if configured)
                if (cloud.isConfigured) {
                    // TODO: Implement full sync/read
                    // For now, we assume local is master for Demo, 
                    // but we will enable Write-Through to Cloud
                    setIsOffline(false);
                } else {
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
    };

    // --- ACTIONS ---

    const addBatch = async (batch) => {
        const newBatch = {
            ...batch,
            id: `B - ${Date.now().toString().slice(-4)} `, // Simple ID gen
            expenses: [],
            animals: []
        };
        const newData = { ...data, batches: [...data.batches, newBatch] };
        saveData(newData);

        if (!isOffline) {
            // Mapping to Sheet Columns: ID, Name, Type, StartDate, Status
            await cloud.appendRow('Batches', [
                newBatch.id, newBatch.name, newBatch.type, newBatch.startDate, newBatch.status
            ]);
        }
    };

    const addExpense = async (expense) => {
        const newExpense = {
            ...expense,
            id: `E - ${Date.now().toString().slice(-4)} `,
        };
        const newData = { ...data, expenses: [...data.expenses, newExpense] };
        saveData(newData);

        if (!isOffline) {
            // Columns: ID, Date, Category, Description, Amount, PaidTo
            await cloud.appendRow('Expenses', [
                newExpense.id, newExpense.date, newExpense.category, newExpense.description, newExpense.amount, newExpense.paidTo
            ]);
        }
    };

    const addEmployee = async (employee) => {
        const newEmp = {
            ...employee,
            id: `EMP - ${Date.now().toString().slice(-4)} `,
        };
        const newData = { ...data, employees: [...data.employees, newEmp] };
        saveData(newData);

        if (!isOffline) {
            // Columns: ID, Name, Role, Phone, Salary, Status
            await cloud.appendRow('Employees', [
                newEmp.id, newEmp.name, newEmp.role, newEmp.phone, newEmp.salary, newEmp.status
            ]);
        }
    };

    const addCrop = async (crop) => {
        const newCrop = {
            ...crop,
            id: `C - ${Date.now().toString().slice(-4)} `
        };
        const newData = { ...data, crops: [...data.crops, newCrop] };
        saveData(newData);

        if (!isOffline) {
            await cloud.appendRow('Crops', [
                newCrop.id, newCrop.name, newCrop.variety, newCrop.plantedDate, newCrop.status
            ]);
        }
    }

    // Helper to add animals/expenses TO A BATCH (Complex nested update)
    // For now, this is Local-Only until we define the "Animals" sheet relation
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

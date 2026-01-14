
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
    yearlyExpenses: [],
    employees: [],
    crops: [],
    fruits: [],
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

    // Helper to generate simple IDs
    const generateSimpleId = (type, name) => {
        const typeCodes = { Goat: 'go', Sheep: 'sh', Chicken: 'ch', Cow: 'co' };
        const typeCode = typeCodes[type] || 'xx';
        const cleanName = (name || 'batch').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        return `${typeCode}${cleanName}${month}${year}`;
    };

    // --- ACTIONS ---

    const addBatch = async (batch) => {
        const newBatch = {
            ...batch,
            id: generateSimpleId(batch.type, batch.name),
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

        let newData = { ...data, expenses: [...data.expenses, newExpense] };

        // If expense is linked to a batch, also add it to that batch's expenses array
        if (expense.batchId) {
            const updatedBatches = data.batches.map(b => {
                if (b.id === expense.batchId) {
                    return {
                        ...b,
                        expenses: [...(b.expenses || []), {
                            id: newExpense.id,
                            type: expense.category,
                            description: expense.description,
                            amount: newExpense.amount,
                            date: expense.date
                        }]
                    };
                }
                return b;
            });
            newData = { ...newData, batches: updatedBatches };
        }

        saveData(newData);

        if (!isOffline) {
            // Columns: ID, Date, Category, Description, Amount, PaidTo, BatchId
            await cloud.appendRow('Expenses', [
                newExpense.id, newExpense.date, newExpense.category, newExpense.description, newExpense.amount, newExpense.paidTo, newExpense.batchId || ''
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
            id: `C - ${Date.now().toString().slice(-4)} `,
            sales: [],
            expenses: []
        };
        const newData = { ...data, crops: [...data.crops, newCrop] };
        saveData(newData);

        if (!isOffline) {
            await cloud.appendRow('Crops', [
                newCrop.id, newCrop.name, newCrop.variety, newCrop.plantedDate, newCrop.seedCost, newCrop.status
            ]);
        }
    };

    // Update a crop
    const updateCrop = (cropId, updates) => {
        const updatedCrops = data.crops.map(c =>
            c.id === cropId ? { ...c, ...updates } : c
        );
        saveData({ ...data, crops: updatedCrops });
    };

    // Add a sale to a crop
    const addCropSale = (cropId, sale) => {
        const updatedCrops = data.crops.map(c => {
            if (c.id === cropId) {
                return {
                    ...c,
                    sales: [...(c.sales || []), {
                        id: `S - ${Date.now().toString().slice(-4)}`,
                        ...sale
                    }]
                };
            }
            return c;
        });
        saveData({ ...data, crops: updatedCrops });
    };

    // Add expense to a crop (and also to global expenses)
    const addCropExpense = async (cropId, expense) => {
        const crop = data.crops.find(c => c.id === cropId);
        const expenseWithCrop = {
            ...expense,
            cropId,
            category: expense.laborType || expense.category,
            description: `${crop?.name || 'Crop'}: ${expense.description || expense.laborType}`
        };
        await addExpense(expenseWithCrop);
    };

    // Helper to add animals/expenses TO A BATCH (Complex nested update)
    // For now, this is Local-Only until we define the "Animals" sheet relation
    const updateBatch = (batchId, updates) => {
        const updatedBatches = data.batches.map(b =>
            b.id === batchId ? { ...b, ...updates } : b
        );
        saveData({ ...data, batches: updatedBatches });
    };

    // Delete an animal from a batch
    const deleteAnimalFromBatch = (batchId, animalId) => {
        const updatedBatches = data.batches.map(b => {
            if (b.id === batchId) {
                return {
                    ...b,
                    animals: (b.animals || []).filter(a => a.id !== animalId)
                };
            }
            return b;
        });
        saveData({ ...data, batches: updatedBatches });
    };

    // Add yearly expense (like land lease) - automatically divided into monthly
    const addYearlyExpense = async (yearlyExpense) => {
        const newYearlyExpense = {
            ...yearlyExpense,
            id: `YE - ${Date.now().toString().slice(-4)}`,
            monthlyAmount: Math.round(Number(yearlyExpense.amount) / 12)
        };
        const newData = { ...data, yearlyExpenses: [...(data.yearlyExpenses || []), newYearlyExpense] };
        saveData(newData);
    };

    // Delete yearly expense
    const deleteYearlyExpense = (expenseId) => {
        const updatedExpenses = (data.yearlyExpenses || []).filter(e => e.id !== expenseId);
        saveData({ ...data, yearlyExpenses: updatedExpenses });
    };

    // Add fruit (similar to crop)
    const addFruit = async (fruit) => {
        const newFruit = {
            ...fruit,
            id: `F - ${Date.now().toString().slice(-4)}`,
            sales: [],
            expenses: []
        };
        const newData = { ...data, fruits: [...(data.fruits || []), newFruit] };
        saveData(newData);
    };

    // Update fruit
    const updateFruit = (fruitId, updates) => {
        const updatedFruits = (data.fruits || []).map(f =>
            f.id === fruitId ? { ...f, ...updates } : f
        );
        saveData({ ...data, fruits: updatedFruits });
    };

    // Add sale to fruit
    const addFruitSale = (fruitId, sale) => {
        const updatedFruits = (data.fruits || []).map(f => {
            if (f.id === fruitId) {
                return {
                    ...f,
                    sales: [...(f.sales || []), {
                        id: `FS - ${Date.now().toString().slice(-4)}`,
                        ...sale
                    }]
                };
            }
            return f;
        });
        saveData({ ...data, fruits: updatedFruits });
    };

    return (
        <DataContext.Provider value={{
            data,
            loading,
            error,
            isOffline,
            addBatch,
            addExpense,
            addYearlyExpense,
            deleteYearlyExpense,
            addEmployee,
            addCrop,
            updateCrop,
            addCropSale,
            addCropExpense,
            addFruit,
            updateFruit,
            addFruitSale,
            updateBatch,
            deleteAnimalFromBatch
        }}>
            {children}
        </DataContext.Provider>
    );
};

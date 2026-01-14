import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
    collection,
    doc,
    onSnapshot,
    setDoc,
    updateDoc,
    deleteDoc,
    writeBatch
} from 'firebase/firestore';

const DataContext = createContext();

export const useData = () => {
    return useContext(DataContext);
};

// Helper to generate simple IDs
const generateSimpleId = (type, name) => {
    const typeCodes = { Goat: 'go', Sheep: 'sh', Chicken: 'ch', Cow: 'co' };
    const typeCode = typeCodes[type] || 'xx';
    const cleanName = (name || 'batch').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const rand = Math.random().toString(36).slice(2, 6);
    return `${typeCode}${cleanName}${month}${year}${rand}`;
};

const generateId = (prefix) => {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
};

export const DataProvider = ({ children }) => {
    const [data, setData] = useState({
        batches: [],
        expenses: [],
        yearlyExpenses: [],
        employees: [],
        crops: [],
        fruits: [],
        invoices: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Real-time sync with Firestore
    useEffect(() => {
        const unsubscribes = [];

        const collections = ['batches', 'expenses', 'yearlyExpenses', 'employees', 'crops', 'fruits', 'invoices'];

        collections.forEach(collName => {
            const unsubscribe = onSnapshot(
                collection(db, collName),
                (snapshot) => {
                    const items = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setData(prev => ({ ...prev, [collName]: items }));
                    setLoading(false);
                },
                (err) => {
                    console.error(`Error syncing ${collName}:`, err);
                    setError(err);
                    setLoading(false);
                }
            );
            unsubscribes.push(unsubscribe);
        });

        // Cleanup listeners on unmount
        return () => unsubscribes.forEach(unsub => unsub());
    }, []);

    // --- ACTIONS ---

    const addBatch = async (batch) => {
        // Generate Sequential ID: Type-Number (e.g., Goat-1)
        const typePrefix = batch.type;
        const existingTypeBatches = data.batches.filter(b => b.type === typePrefix);

        // Find max number
        let maxNum = 0;
        existingTypeBatches.forEach(b => {
            const parts = b.id.split('-');
            if (parts.length === 2 && !isNaN(parts[1])) {
                const num = parseInt(parts[1]);
                if (num > maxNum) maxNum = num;
            }
        });

        const nextNum = maxNum + 1;
        const id = `${typePrefix}-${nextNum}`;

        const newBatch = {
            ...batch,
            id, // Explicitly set ID
            expenses: [],
            animals: [],
            createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'batches', id), newBatch);
    };

    const updateBatch = async (batchId, updates) => {
        await updateDoc(doc(db, 'batches', batchId), updates);
    };

    const deleteAnimalFromBatch = async (batchId, animalId) => {
        const batch = data.batches.find(b => b.id === batchId);
        if (batch) {
            const updatedAnimals = (batch.animals || []).filter(a => a.id !== animalId);
            await updateDoc(doc(db, 'batches', batchId), { animals: updatedAnimals });
        }
    };

    const addExpense = async (expense) => {
        const id = generateId('E');
        // Ensure batchId is preserved in the global expense document
        const newExpense = {
            ...expense,
            batchId: expense.batchId || null,
            createdAt: new Date().toISOString()
        };

        // If expense is linked to a batch, also update that batch
        if (expense.batchId) {
            const batch = data.batches.find(b => b.id === expense.batchId);
            if (batch) {
                const batchExpense = {
                    id,
                    type: expense.category,
                    description: expense.description,
                    amount: expense.amount,
                    date: expense.date
                };
                await updateDoc(doc(db, 'batches', expense.batchId), {
                    expenses: [...(batch.expenses || []), batchExpense]
                });
            }
        }

        await setDoc(doc(db, 'expenses', id), newExpense);
    };

    const addYearlyExpense = async (yearlyExpense) => {
        const id = generateId('YE');
        const newYearlyExpense = {
            ...yearlyExpense,
            monthlyAmount: Math.round(Number(yearlyExpense.amount) / 12),
            createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'yearlyExpenses', id), newYearlyExpense);
    };

    const deleteYearlyExpense = async (expenseId) => {
        await deleteDoc(doc(db, 'yearlyExpenses', expenseId));
    };

    const addEmployee = async (employee) => {
        // Fix: Employee ID max 4 chars (e.g., E123)
        const rand = Math.floor(Math.random() * 900) + 100; // 100-999
        const id = `E${rand}`;
        const newEmployee = {
            ...employee,
            status: 'Active', // Default status
            createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'employees', id), newEmployee);
    };

    const addCrop = async (crop) => {
        const id = generateId('C');
        const newCrop = {
            ...crop,
            sales: [],
            expenses: [],
            createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'crops', id), newCrop);
    };

    const updateCrop = async (cropId, updates) => {
        await updateDoc(doc(db, 'crops', cropId), updates);
    };

    const addCropSale = async (cropId, sale) => {
        const crop = data.crops.find(c => c.id === cropId);
        if (crop) {
            const newSale = {
                id: generateId('S'),
                ...sale
            };
            await updateDoc(doc(db, 'crops', cropId), {
                sales: [...(crop.sales || []), newSale]
            });
        }
    };

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

    const addFruit = async (fruit) => {
        const id = generateId('F');
        const newFruit = {
            ...fruit,
            sales: [],
            expenses: [],
            createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'fruits', id), newFruit);
    };

    const deleteCrop = async (id) => {
        await deleteDoc(doc(db, 'crops', id));
    };

    const deleteFruit = async (id) => {
        await deleteDoc(doc(db, 'fruits', id));
    };

    const updateFruit = async (fruitId, updates) => {
        await updateDoc(doc(db, 'fruits', fruitId), updates);
    };

    const addFruitSale = async (fruitId, sale) => {
        const fruit = data.fruits.find(f => f.id === fruitId);
        if (fruit) {
            const newSale = {
                id: generateId('FS'),
                ...sale
            };
            await updateDoc(doc(db, 'fruits', fruitId), {
                sales: [...(fruit.sales || []), newSale]
            });
        }
    };

    // Invoice functions
    const addInvoice = async (invoice) => {
        const id = generateId('INV');
        const newInvoice = {
            ...invoice,
            createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'invoices', id), newInvoice);
    };

    const deleteInvoice = async (invoiceId) => {
        await deleteDoc(doc(db, 'invoices', invoiceId));
    };

    // Delete batch
    const deleteBatch = async (batchId) => {
        await deleteDoc(doc(db, 'batches', batchId));
    };

    // Add weight record for an animal
    const addWeightRecord = async (batchId, animalId, weight, date) => {
        const batch = data.batches.find(b => b.id === batchId);
        if (batch) {
            const updatedAnimals = batch.animals.map(a => {
                if (a.id === animalId) {
                    const weightHistory = a.weightHistory || [];
                    return {
                        ...a,
                        weight: weight, // Update current weight
                        weightHistory: [...weightHistory, {
                            date: date || new Date().toISOString().split('T')[0],
                            weight: Number(weight)
                        }]
                    };
                }
                return a;
            });
            await updateDoc(doc(db, 'batches', batchId), { animals: updatedAnimals });
        }
    };

    // Sell selected animals with specific price
    const sellSelectedAnimals = async (batchId, animalIds, pricePerAnimal) => {
        const batch = data.batches.find(b => b.id === batchId);
        if (batch) {
            const updatedAnimals = batch.animals.map(a => {
                if (animalIds.includes(a.id)) {
                    return {
                        ...a,
                        status: 'Sold',
                        soldPrice: pricePerAnimal,
                        soldDate: new Date().toISOString().split('T')[0]
                    };
                }
                return a;
            });
            await updateDoc(doc(db, 'batches', batchId), { animals: updatedAnimals });
        }
    };

    return (
        <DataContext.Provider value={{
            data,
            loading,
            error,
            isOffline: false,
            addBatch,
            addExpense,
            addYearlyExpense,
            deleteYearlyExpense,
            addEmployee,
            addCrop,
            updateCrop,
            deleteCrop,
            addCropSale,
            addCropExpense,
            addFruit,
            updateFruit,
            deleteFruit,
            addFruitSale,
            updateBatch,
            deleteAnimalFromBatch,
            addInvoice,
            deleteInvoice,
            deleteBatch,
            addWeightRecord,
            sellSelectedAnimals
        }}>
            {children}
        </DataContext.Provider>
    );
};

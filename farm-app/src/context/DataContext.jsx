import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
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
    const typeCodes = { Goat: 'go', Sheep: 'sh', Chicken: 'ch', Cow: 'co', Poultry: 'pl' };
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

// SAFE DEVELOPMENT MODE:
// If running on localhost (DEV), use 'qa_' collections to avoid touching production data.
// If ?qa_test=true is present, also use 'qa_' collections (and AuthContext will mock the user).
const useTestCollections = import.meta.env.DEV || (typeof window !== 'undefined' && window.location.search.includes('qa_test=true'));

// Get collection name with qa_ prefix if in test/dev mode
const getCollectionName = (baseName) => {
    return useTestCollections ? `qa_${baseName}` : baseName;
};

// Log once if in QA test mode
if (useTestCollections) {
    console.log('[QA] Data isolation enabled - using qa_* collections');
}

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
    const { user, loading: authLoading } = useAuth();
    useEffect(() => {
        // Wait for auth before syncing
        if (authLoading) {
            // still checking auth – keep loading true
            return;
        }
        if (!user) {
            // no user – stop syncing, set loading false
            setLoading(false);
            return;
        }
        const unsubscribes = [];

        const baseCollections = ['batches', 'expenses', 'yearlyExpenses', 'employees', 'crops', 'fruits', 'invoices'];

        baseCollections.forEach(baseName => {
            const firestoreCollName = getCollectionName(baseName);
            const unsubscribe = onSnapshot(
                collection(db, firestoreCollName),
                (snapshot) => {
                    const items = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    // Store under base name so app logic works unchanged
                    setData(prev => ({ ...prev, [baseName]: items }));
                    setLoading(false);
                },
                (err) => {
                    console.error(`Error syncing ${firestoreCollName}:`, err);
                    setError(err);
                    setLoading(false);
                }
            );
            unsubscribes.push(unsubscribe);
        });

        // Cleanup listeners on unmount
        return () => unsubscribes.forEach(unsub => unsub());
    }, [authLoading, user]);

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
        await setDoc(doc(db, getCollectionName('batches'), id), newBatch);
    };

    const updateBatch = async (batchId, updates) => {
        await updateDoc(doc(db, getCollectionName('batches'), batchId), updates);
    };

    const deleteAnimalFromBatch = async (batchId, animalId) => {
        const batch = data.batches.find(b => b.id === batchId);
        if (batch) {
            const updatedAnimals = (batch.animals || []).filter(a => a.id !== animalId);
            await updateDoc(doc(db, getCollectionName('batches'), batchId), { animals: updatedAnimals });
        }
    };

    const updateBatchExpense = async (batchId, expenseId, updates) => {
        const batch = data.batches.find(b => b.id === batchId);
        if (batch) {
            const updatedExpenses = (batch.expenses || []).map(e =>
                e.id === expenseId ? { ...e, ...updates } : e
            );
            await updateDoc(doc(db, getCollectionName('batches'), batchId), { expenses: updatedExpenses });
        }
    };

    const deleteBatchExpense = async (batchId, expenseId) => {
        const batch = data.batches.find(b => b.id === batchId);
        if (batch) {
            const updatedExpenses = (batch.expenses || []).filter(e => e.id !== expenseId);
            await updateDoc(doc(db, getCollectionName('batches'), batchId), { expenses: updatedExpenses });
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
                await updateDoc(doc(db, getCollectionName('batches'), expense.batchId), {
                    expenses: [...(batch.expenses || []), batchExpense]
                });
            }
        }

        await setDoc(doc(db, getCollectionName('expenses'), id), newExpense);
    };

    const addYearlyExpense = async (yearlyExpense) => {
        const id = generateId('YE');
        const newYearlyExpense = {
            ...yearlyExpense,
            monthlyAmount: Math.round(Number(yearlyExpense.amount) / 12),
            createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, getCollectionName('yearlyExpenses'), id), newYearlyExpense);
    };

    const deleteYearlyExpense = async (expenseId) => {
        await deleteDoc(doc(db, getCollectionName('yearlyExpenses'), expenseId));
    };

    const updateYearlyExpense = async (expenseId, updates) => {
        const monthlyAmount = updates.amount ? Math.round(Number(updates.amount) / 12) : undefined;
        const finalUpdates = monthlyAmount !== undefined ? { ...updates, monthlyAmount } : updates;
        await updateDoc(doc(db, getCollectionName('yearlyExpenses'), expenseId), finalUpdates);
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
        await setDoc(doc(db, getCollectionName('employees'), id), newEmployee);
    };

    const addCrop = async (crop) => {
        const id = generateId('C');
        const newCrop = {
            ...crop,
            sales: [],
            expenses: [],
            createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, getCollectionName('crops'), id), newCrop);
    };

    const updateCrop = async (cropId, updates) => {
        await updateDoc(doc(db, getCollectionName('crops'), cropId), updates);
    };

    const addCropSale = async (cropId, sale) => {
        const crop = data.crops.find(c => c.id === cropId);
        if (crop) {
            const newSale = {
                id: generateId('S'),
                ...sale
            };
            await updateDoc(doc(db, getCollectionName('crops'), cropId), {
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
        await setDoc(doc(db, getCollectionName('fruits'), id), newFruit);
    };

    const deleteCrop = async (id) => {
        await deleteDoc(doc(db, getCollectionName('crops'), id));
    };

    const deleteFruit = async (id) => {
        await deleteDoc(doc(db, getCollectionName('fruits'), id));
    };

    const updateFruit = async (fruitId, updates) => {
        await updateDoc(doc(db, getCollectionName('fruits'), fruitId), updates);
    };

    const addFruitSale = async (fruitId, sale) => {
        const fruit = data.fruits.find(f => f.id === fruitId);
        if (fruit) {
            const newSale = {
                id: generateId('FS'),
                ...sale
            };
            await updateDoc(doc(db, getCollectionName('fruits'), fruitId), {
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
        await setDoc(doc(db, getCollectionName('invoices'), id), newInvoice);
    };

    const deleteInvoice = async (invoiceId) => {
        await deleteDoc(doc(db, getCollectionName('invoices'), invoiceId));
    };

    // Delete batch
    const deleteBatch = async (batchId) => {
        await deleteDoc(doc(db, getCollectionName('batches'), batchId));
    };

    // Add weight record for an animal
    const addWeightRecord = async (batchId, animalId, weight, date) => {
        const batch = data.batches.find(b => b.id === batchId);
        if (batch) {
            const updatedAnimals = batch.animals.map(a => {
                if (a.id === animalId) {
                    const weightHistory = a.weightHistory || [];
                    const recordDate = date || new Date().toISOString().split('T')[0];

                    // Check if record for this date already exists
                    const existingIndex = weightHistory.findIndex(r => r.date === recordDate);
                    let newHistory;

                    if (existingIndex >= 0) {
                        // Update existing record
                        newHistory = [...weightHistory];
                        newHistory[existingIndex] = { date: recordDate, weight: Number(weight) };
                    } else {
                        // Add new record
                        newHistory = [...weightHistory, { date: recordDate, weight: Number(weight) }];
                    }

                    return {
                        ...a,
                        weight: weight, // Update current weight
                        weightHistory: newHistory
                    };
                }
                return a;
            });
            await updateDoc(doc(db, getCollectionName('batches'), batchId), { animals: updatedAnimals });
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
            await updateDoc(doc(db, getCollectionName('batches'), batchId), { animals: updatedAnimals });
        }
    };

    const deleteCropSale = async (cropId, saleId) => {
        const crop = data.crops.find(c => c.id === cropId);
        if (crop) {
            const updatedSales = (crop.sales || []).filter(s => s.id !== saleId);
            await updateDoc(doc(db, getCollectionName('crops'), cropId), { sales: updatedSales });
        }
    };

    const deleteFruitSale = async (fruitId, saleId) => {
        const fruit = data.fruits.find(f => f.id === fruitId);
        if (fruit) {
            const updatedSales = (fruit.sales || []).filter(s => s.id !== saleId);
            await updateDoc(doc(db, getCollectionName('fruits'), fruitId), { sales: updatedSales });
        }
    };

    const deleteExpense = async (expenseId) => {
        const expense = data.expenses.find(e => e.id === expenseId);
        if (expense && expense.batchId) {
            const batch = data.batches.find(b => b.id === expense.batchId);
            if (batch) {
                const updatedExpenses = (batch.expenses || []).filter(e => e.id !== expenseId);
                await updateDoc(doc(db, getCollectionName('batches'), expense.batchId), { expenses: updatedExpenses });
            }
        }
        await deleteDoc(doc(db, getCollectionName('expenses'), expenseId));
    };

    const updateExpense = async (expenseId, updates) => {
        const expense = data.expenses.find(e => e.id === expenseId);
        if (!expense) return;

        // Update the expense document
        await updateDoc(doc(db, getCollectionName('expenses'), expenseId), updates);

        // If linked to a batch, update the batch's expense array too
        if (expense.batchId) {
            const batch = data.batches.find(b => b.id === expense.batchId);
            if (batch) {
                const updatedExpenses = (batch.expenses || []).map(e =>
                    e.id === expenseId ? { ...e, ...updates } : e
                );
                await updateDoc(doc(db, getCollectionName('batches'), expense.batchId), { expenses: updatedExpenses });
            }
        }
    };

    // Update specific weight record
    const updateWeightRecord = async (batchId, animalId, oldDate, newDate, newWeight) => {
        const batch = data.batches.find(b => b.id === batchId);
        if (batch) {
            const updatedAnimals = batch.animals.map(a => {
                if (a.id === animalId) {
                    let weightHistory = [...(a.weightHistory || [])];

                    // Remove old record
                    weightHistory = weightHistory.filter(r => r.date !== oldDate);

                    // Add new/updated record logic
                    const existingIndex = weightHistory.findIndex(r => r.date === newDate);
                    if (existingIndex >= 0) {
                        weightHistory[existingIndex] = { date: newDate, weight: Number(newWeight) };
                    } else {
                        weightHistory.push({ date: newDate, weight: Number(newWeight) });
                    }

                    // Sort history to find latest
                    weightHistory.sort((x, y) => new Date(x.date) - new Date(y.date));

                    const latestRecord = weightHistory[weightHistory.length - 1];
                    const currentWeight = latestRecord ? latestRecord.weight : a.weight;

                    return {
                        ...a,
                        weight: currentWeight,
                        weightHistory: weightHistory
                    };
                }
                return a;
            });
            await updateDoc(doc(db, getCollectionName('batches'), batchId), { animals: updatedAnimals });
        }
    };

    const updateCropSale = async (cropId, saleId, updates) => {
        const crop = data.crops.find(c => c.id === cropId);
        if (crop) {
            const updatedSales = (crop.sales || []).map(s =>
                s.id === saleId ? { ...s, ...updates } : s
            );
            await updateDoc(doc(db, getCollectionName('crops'), cropId), { sales: updatedSales });
        }
    };

    const updateFruitSale = async (fruitId, saleId, updates) => {
        const fruit = data.fruits.find(f => f.id === fruitId);
        if (fruit) {
            const updatedSales = (fruit.sales || []).map(s =>
                s.id === saleId ? { ...s, ...updates } : s
            );
            await updateDoc(doc(db, getCollectionName('fruits'), fruitId), { sales: updatedSales });
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
            updateYearlyExpense,
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
            updateWeightRecord,
            sellSelectedAnimals,
            deleteCropSale,
            updateCropSale,
            deleteFruitSale,
            updateFruitSale,
            deleteExpense,
            updateExpense,
            updateBatchExpense,
            deleteBatchExpense
        }}>
            {children}
        </DataContext.Provider>
    );
};

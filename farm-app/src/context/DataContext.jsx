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
    writeBatch,
    getDocs
} from 'firebase/firestore';
import {
    calculateMonthlyAllocations,
    getPreviousMonthKey,
    getCurrentMonthKey,
    getMonthsBetween,
    ALLOCATION_ELIGIBLE_TYPES
} from '../lib/allocationUtils';

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

// Modified to support shorter IDs for Expenses as requested (3 letters + 2 numbers -> e.g. EXP-12)
// But we need to ensure uniqueness.
const generateId = (prefix) => {
    if (prefix === 'E' || prefix === 'S') {
        // Generate 3 random uppercase letters + 2 random numbers (e.g. ABC12)
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        let rLetters = '';
        for (let i = 0; i < 3; i++) rLetters += letters.charAt(Math.floor(Math.random() * letters.length));
        let rNumbers = '';
        for (let i = 0; i < 2; i++) rNumbers += numbers.charAt(Math.floor(Math.random() * numbers.length));

        return `${rLetters}${rNumbers}`;
    }
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
        inventory: [],
        contacts: [], // Vet contacts
        farmContacts: [], // Farm contacts with groups
        contactGroups: [], // Contact groups
        eggLogs: [], // Global egg tracker
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

        const baseCollections = ['batches', 'expenses', 'yearlyExpenses', 'employees', 'crops', 'fruits', 'invoices', 'inventory', 'contacts', 'farmContacts', 'contactGroups', 'eggLogs'];

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

        // QA BYPASS
        if (typeof window !== 'undefined' && window.location.search.includes('qa_test=true')) {
            console.log("[QA] Bypassing Firestore Write for Batch");
            setData(prev => ({ ...prev, batches: [...prev.batches, newBatch] }));
            return;
        }

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
        // Ensure linking IDs are preserved
        const newExpense = {
            ...expense,
            batchId: expense.batchId || null,
            cropId: expense.cropId || null,
            fruitId: expense.fruitId || null,
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

        // Use existing functions for Crop/Fruit specific updates if needed or handle here?
        // Actually, for crops/fruits we have addCropExpense/addFruitExpense helper that calls this maybe?
        // But if creating from Expense Tab, we need to push to them.
        // Let's rely on the components calling the specific addCropExpense/addFruitExpense which calls THIS function?
        // Checking addCropExpense... it adds to crop doc but uses a different ID maybe? 
        // Let's standardise: Global 'addExpense' should be the main one.

        // HOWEVER, to keep it simple and safe: 
        // If created via "Add Expense" global modal, we need to check if we need to push to child docs.

        if (expense.cropId) {
            const crop = data.crops.find(c => c.id === expense.cropId);
            if (crop) {
                const subExpense = { id, type: expense.category, description: expense.description, cost: Number(expense.amount), date: expense.date };
                await updateDoc(doc(db, getCollectionName('crops'), expense.cropId), {
                    expenses: [...(crop.expenses || []), subExpense]
                });
            }
        }

        if (expense.fruitId) {
            const fruit = data.fruits.find(f => f.id === expense.fruitId);
            if (fruit) {
                const subExpense = { id, type: expense.category, name: expense.description, cost: Number(expense.amount), date: expense.date };
                await updateDoc(doc(db, getCollectionName('fruits'), expense.fruitId), {
                    expenses: [...(fruit.expenses || []), subExpense]
                });
            }
        }

        // QA BYPASS
        if (typeof window !== 'undefined' && window.location.search.includes('qa_test=true')) {
            console.log("[QA] Bypassing Firestore Write for Expense");
            // Note: Deep updates to batch/crop/fruit not mocked here for simplicity, only global expense list
            setData(prev => ({ ...prev, expenses: [...prev.expenses, { id, ...newExpense }] }));
            return id;
        }

        await setDoc(doc(db, getCollectionName('expenses'), id), newExpense);
        return id;
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
        const id = employee.id; // Manual ID as requested
        const newEmployee = {
            ...employee,
            status: 'Active',
            createdAt: new Date().toISOString()
        };

        // QA BYPASS
        if (typeof window !== 'undefined' && window.location.search.includes('qa_test=true')) {
            console.log("[QA] Bypassing Firestore Write for Employee");
            setData(prev => ({ ...prev, employees: [...prev.employees, { id, ...newEmployee }] }));
            return;
        }

        await setDoc(doc(db, getCollectionName('employees'), id), newEmployee);
    };

    const updateEmployee = async (id, updates) => {
        await updateDoc(doc(db, getCollectionName('employees'), id), updates);
    };

    const deleteEmployee = async (id) => {
        await deleteDoc(doc(db, getCollectionName('employees'), id));
    };

    const addEmployeePayment = async (employeeId, payment) => {
        const paymentId = generateId('PAY');
        const employeeRef = doc(db, getCollectionName('employees'), employeeId);

        // We'll store payments in a 'payments' field within the employee doc for simplicity 
        // given the app's current architecture, or better as a sub-collection if we want history.
        // Actually, let's keep it simple and add to an array in the document if it's manageable.
        // But for better scaling, a sub-collection is safer.
        // Let's check how other things are handled... crops/fruits use arrays.
        // I will use an array 'payments' within the employee doc as per existing patterns here.
        const employee = data.employees.find(e => e.id === employeeId);
        if (employee) {
            const newPayment = { ...payment, id: paymentId, createdAt: new Date().toISOString() };
            // QA BYPASS
            if (typeof window !== 'undefined' && window.location.search.includes('qa_test=true')) {
                console.log("[QA] Bypassing Firestore Write for Employee Payment");
                const updatedEmployees = data.employees.map(e => e.id === employeeId ? { ...e, payments: [...(e.payments || []), newPayment] } : e);
                setData(prev => ({ ...prev, employees: updatedEmployees }));
                return;
            }

            const payments = [...(employee.payments || []), newPayment];
            await updateDoc(employeeRef, { payments });
        }
    };

    const deleteEmployeePayment = async (employeeId, paymentId) => {
        const employeeRef = doc(db, getCollectionName('employees'), employeeId);
        const employee = data.employees.find(e => e.id === employeeId);
        if (employee) {
            const payments = (employee.payments || []).filter(p => p.id !== paymentId);
            await updateDoc(employeeRef, { payments });
        }
    };

    const addCrop = async (crop) => {
        const id = generateId('C');
        const newCrop = {
            ...crop,
            sales: [],
            expenses: [],
            createdAt: new Date().toISOString()
        };

        // QA BYPASS
        if (typeof window !== 'undefined' && window.location.search.includes('qa_test=true')) {
            console.log("[QA] Bypassing Firestore Write for Crop");
            setData(prev => ({ ...prev, crops: [...prev.crops, { id, ...newCrop }] }));
            return;
        }

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
        return await addExpense(expenseWithCrop);
    };

    const addFruit = async (fruit) => {
        const id = generateId('F');
        const newFruit = {
            ...fruit,
            sales: [],
            expenses: [],
            createdAt: new Date().toISOString()
        };

        // QA BYPASS
        if (typeof window !== 'undefined' && window.location.search.includes('qa_test=true')) {
            console.log("[QA] Bypassing Firestore Write for Fruit");
            setData(prev => ({ ...prev, fruits: [...prev.fruits, { id, ...newFruit }] }));
            return;
        }

        await setDoc(doc(db, getCollectionName('fruits'), id), newFruit);
    };

    const deleteCrop = async (id) => {
        // 1. Delete the Crop Document
        await deleteDoc(doc(db, getCollectionName('crops'), id));

        // 2. Cascade Delete: Remove associated global expenses DIRECTLY via Query
        const q = query(collection(db, getCollectionName('expenses')), where('cropId', '==', id));
        const snapshot = await getDocs(q);

        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
    };

    const deleteFruit = async (id) => {
        // 1. Delete the Fruit Document
        await deleteDoc(doc(db, getCollectionName('fruits'), id));

        // 2. Cascade Delete: Remove associated global expenses DIRECTLY via Query
        const q = query(collection(db, getCollectionName('expenses')), where('fruitId', '==', id));
        const snapshot = await getDocs(q);

        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
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

        // QA BYPASS
        if (typeof window !== 'undefined' && window.location.search.includes('qa_test=true')) {
            console.log("[QA] Bypassing Firestore Write for Invoice");
            setData(prev => ({ ...prev, invoices: [...prev.invoices, { id, ...newInvoice }] }));
            return;
        }

        await setDoc(doc(db, getCollectionName('invoices'), id), newInvoice);
    };

    const deleteInvoice = async (invoiceId) => {
        await deleteDoc(doc(db, getCollectionName('invoices'), invoiceId));
    };

    // Delete batch
    const deleteBatch = async (batchId) => {
        // 1. Delete Batch Document
        await deleteDoc(doc(db, getCollectionName('batches'), batchId));

        // 2. Cascade Delete: Remove associated global expenses DIRECTLY via Query
        const q = query(collection(db, getCollectionName('expenses')), where('batchId', '==', batchId));
        const snapshot = await getDocs(q);

        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
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

    // Global Egg Logs (Dashboard Tracker)
    const addEggLog = async (logData) => {
        const id = generateId('EGG');
        const newLog = {
            id,
            ...logData,
            createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, getCollectionName('eggLogs'), id), newLog);
    };

    const updateEggLog = async (logId, updates) => {
        await updateDoc(doc(db, getCollectionName('eggLogs'), logId), updates);
    };

    const deleteEggLog = async (logId) => {
        await deleteDoc(doc(db, getCollectionName('eggLogs'), logId));
    };

    const revertSoldAnimal = async (batchId, animalId) => {
        const batch = data.batches.find(b => b.id === batchId);
        if (batch) {
            const updatedAnimals = batch.animals.map(a => {
                if (a.id === animalId) {
                    const { soldPrice, soldDate, ...rest } = a; // Remove sold fields
                    return {
                        ...rest,
                        status: 'Healthy' // Default back to healthy
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
        // QA BYPASS or Optimistic Update
        setData(prev => ({
            ...prev,
            expenses: prev.expenses.filter(e => e.id !== expenseId),
            // Also clean up batch expenses if needed (simplified for QA)
            batches: prev.batches.map(b => ({
                ...b,
                expenses: (b.expenses || []).filter(e => e.id !== expenseId)
            }))
        }));

        const expense = data.expenses.find(e => e.id === expenseId);
        if (expense && expense.batchId) {
            const batch = data.batches.find(b => b.id === expense.batchId);
            if (batch) {
                const updatedExpenses = (batch.expenses || []).filter(e => e.id !== expenseId);
                await updateDoc(doc(db, getCollectionName('batches'), expense.batchId), { expenses: updatedExpenses });
            }
        }

        if (typeof window !== 'undefined' && window.location.search.includes('qa_test=true')) {
            console.log("[QA] Bypassing Firestore Delete for Expense");
            return;
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

    // Maintenance / Cleanup
    // Maintenance / Cleanup
    const cleanupOrphanedExpenses = async () => {
        console.log("Starting safe cleanup...");

        // 1. Fetch ALL current valid IDs directly from Firestore to ensure we have the absolute source of truth
        // This avoids race conditions where 'data.crops' might be empty in the local state
        const cropsSnap = await getDocs(collection(db, getCollectionName('crops')));
        const fruitsSnap = await getDocs(collection(db, getCollectionName('fruits')));
        const batchesSnap = await getDocs(collection(db, getCollectionName('batches')));

        const validCropIds = new Set(cropsSnap.docs.map(d => d.id));
        const validFruitIds = new Set(fruitsSnap.docs.map(d => d.id));
        const validBatchIds = new Set(batchesSnap.docs.map(d => d.id));

        console.log(`Reference Data Loaded: ${validCropIds.size} crops, ${validFruitIds.size} fruits, ${validBatchIds.size} batches.`);

        // 2. Iterate through expenses and check validity
        // We can use the local 'data.expenses' for iteration since we are verifying against the fresh Sets above.
        // Even if local expenses are incomplete, we just won't clean up the missing ones (safe failure).
        // The danger was relying on local crops/fruits being empty (unsafe failure).

        const orphans = [];
        data.expenses.forEach(exp => {
            // Check Crop Link
            if (exp.cropId) {
                if (!validCropIds.has(exp.cropId)) {
                    orphans.push(exp.id);
                }
            }
            // Check Fruit Link
            else if (exp.fruitId) {
                if (!validFruitIds.has(exp.fruitId)) {
                    orphans.push(exp.id);
                }
            }
            // Check Batch Link
            else if (exp.batchId) {
                if (!validBatchIds.has(exp.batchId)) {
                    orphans.push(exp.id);
                }
            }
        });

        if (orphans.length > 0) {
            console.log(`Cleaning up ${orphans.length} orphaned expenses...`, orphans);
            // Delete one by one
            const deletePromises = orphans.map(id => deleteDoc(doc(db, getCollectionName('expenses'), id)));
            await Promise.all(deletePromises);
            return orphans.length;
        } else {
            console.log("No orphans found.");
        }
        return 0;
    };

    // Inventory Functions
    const addInventoryItem = async (item) => {
        const id = generateId('INV');
        const newItem = {
            ...item,
            createdAt: new Date().toISOString()
        };
        // QA BYPASS
        if (typeof window !== 'undefined' && window.location.search.includes('qa_test=true')) {
            console.log("[QA] Bypassing Firestore Write for Inventory");
            setData(prev => ({ ...prev, inventory: [...prev.inventory, { id, ...newItem }] }));
            return;
        }

        await setDoc(doc(db, getCollectionName('inventory'), id), newItem);
    };

    const updateInventoryItem = async (id, updates) => {
        await updateDoc(doc(db, getCollectionName('inventory'), id), updates);
    };

    const deleteInventoryItem = async (id) => {
        await deleteDoc(doc(db, getCollectionName('inventory'), id));
    };

    // Contact Functions
    const addContact = async (contact) => {
        const id = generateId('CNT');
        const newContact = {
            ...contact,
            createdAt: new Date().toISOString()
        };

        // QA BYPASS: Allow frontend verification without real backend permissions
        if (typeof window !== 'undefined' && window.location.search.includes('qa_test=true')) {
            console.log("[QA] Bypassing Firestore Write for Contact");
            setData(prev => ({
                ...prev,
                contacts: [...(prev.contacts || []), { id, ...newContact }]
            }));
            return;
        }

        await setDoc(doc(db, getCollectionName('contacts'), id), newContact);
    };

    const deleteContact = async (id) => {
        await deleteDoc(doc(db, getCollectionName('contacts'), id));
    };

    const updateContact = async (id, updates) => {
        await updateDoc(doc(db, getCollectionName('contacts'), id), updates);
    };

    // === FARM CONTACTS & GROUPS FUNCTIONS ===

    // Contact Groups
    const addContactGroup = async (group) => {
        const id = generateId('GRP');
        const newGroup = {
            ...group,
            createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, getCollectionName('contactGroups'), id), newGroup);
        return id;
    };

    const updateContactGroup = async (id, updates) => {
        await updateDoc(doc(db, getCollectionName('contactGroups'), id), updates);
    };

    const deleteContactGroup = async (id) => {
        // Also delete all contacts in this group
        const contactsInGroup = data.farmContacts.filter(c => c.groupId === id);
        for (const contact of contactsInGroup) {
            await deleteDoc(doc(db, getCollectionName('farmContacts'), contact.id));
        }
        await deleteDoc(doc(db, getCollectionName('contactGroups'), id));
    };

    // Farm Contacts (with groups)
    const addFarmContact = async (contact) => {
        const id = generateId('FC');
        const newContact = {
            ...contact,
            createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, getCollectionName('farmContacts'), id), newContact);
        return id;
    };

    const updateFarmContact = async (id, updates) => {
        await updateDoc(doc(db, getCollectionName('farmContacts'), id), updates);
    };

    const deleteFarmContact = async (id) => {
        await deleteDoc(doc(db, getCollectionName('farmContacts'), id));
    };

    // === ALLOCATION FUNCTIONS ===

    /**
     * Process and save allocations for a specific month to all eligible batches
     * @param {string} monthKey - Month in YYYY-MM format
     * @param {string} allocationMode - 'fullMonth' or 'prorated'
     * @param {Map} allocationsCache - Optional cache of batch allocations for multi-month processing
     */
    const processMonthlyAllocations = async (monthKey, allocationMode = 'fullMonth', allocationsCache = null) => {
        const allocations = calculateMonthlyAllocations(data, monthKey, allocationMode);

        if (allocations.length === 0) {
            console.log(`[Allocation] No allocations to process for ${monthKey}`);
            return [];
        }

        // Save allocations to each batch
        for (const allocation of allocations) {
            const batch = data.batches.find(b => b.id === allocation.batchId);
            if (!batch) continue;

            // Get existing allocations - from cache if available, otherwise from batch
            let existingAllocations;
            if (allocationsCache && allocationsCache.has(batch.id)) {
                existingAllocations = allocationsCache.get(batch.id);
            } else {
                existingAllocations = batch.monthlyAllocations || [];
            }

            // Check if this month already has an allocation
            const existingIndex = existingAllocations.findIndex(a => a.month === monthKey);

            let updatedAllocations;
            if (existingIndex >= 0) {
                // Update existing allocation
                updatedAllocations = [...existingAllocations];
                updatedAllocations[existingIndex] = {
                    ...updatedAllocations[existingIndex],
                    ...allocation,
                    id: updatedAllocations[existingIndex].id,
                    updatedAt: new Date().toISOString()
                };
            } else {
                // Add new allocation
                updatedAllocations = [...existingAllocations, {
                    ...allocation,
                    id: `alloc-${monthKey}`,
                    isLocked: monthKey !== getCurrentMonthKey()
                }];
            }

            // Update cache for next iteration
            if (allocationsCache) {
                allocationsCache.set(batch.id, updatedAllocations);
            }

            // Save to Firestore
            await updateBatch(allocation.batchId, { monthlyAllocations: updatedAllocations });
        }

        console.log(`[Allocation] Processed ${allocations.length} allocations for ${monthKey}`);
        return allocations;
    };

    /**
     * Recalculate allocations from a specific month to present
     * Called when employee employedSince or batch startDate changes
     */
    const recalculateAllocationsFrom = async (fromMonth, allocationMode = 'fullMonth') => {
        const months = getMonthsBetween(fromMonth + '-01');

        for (const month of months) {
            await processMonthlyAllocations(month, allocationMode);
        }

        console.log(`[Allocation] Recalculated allocations from ${fromMonth} (${months.length} months)`);
        return months;
    };

    /**
     * Remove allocations for a batch for specific months
     */
    const removeAllocationsForMonths = async (batchId, monthsToRemove) => {
        const batch = data.batches.find(b => b.id === batchId);
        if (!batch || !batch.monthlyAllocations) return;

        const updatedAllocations = batch.monthlyAllocations.filter(
            a => !monthsToRemove.includes(a.month)
        );

        await updateBatch(batchId, { monthlyAllocations: updatedAllocations });
    };

    /**
     * Update a specific allocation for SuperAdmin edits
     */
    const updateAllocation = async (batchId, monthKey, updates) => {
        const batch = data.batches.find(b => b.id === batchId);
        if (!batch || !batch.monthlyAllocations) return;

        const updatedAllocations = batch.monthlyAllocations.map(a =>
            a.month === monthKey ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
        );

        await updateBatch(batchId, { monthlyAllocations: updatedAllocations });
    };

    /**
     * Get calculated live allocation for current month (preview, not saved)
     */
    const getLiveAllocation = (batchId, allocationMode = 'fullMonth') => {
        const monthKey = getCurrentMonthKey();
        const allocations = calculateMonthlyAllocations(data, monthKey, allocationMode);
        return allocations.find(a => a.batchId === batchId) || null;
    };

    /**
     * Process a unified sale (POS System)
     * Handles: Individual Animals, Bulk Livestock, Produce
     * Updates: Batches, Inventory, Invoices
     */
    const processSale = async (saleData) => {
        const { items, customer, totalAmount, discount = 0, finalAmount } = saleData;

        try {
            // 1. Create Invoice ID (Sequential)
            // Parse existing IDs to find max
            const existingIds = (data.invoices || []).map(inv => {
                const num = parseInt(inv.id); // Assuming ID is '1', '2' etc.
                return isNaN(num) ? 0 : num;
            });
            const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
            const invoiceId = String(nextId);

            // Customer Validation
            const customerData = (customer && customer.name && customer.name.trim() !== '')
                ? customer
                : { name: 'Walk-in Customer', phone: '' };

            const invoice = {
                id: invoiceId,
                customer: customerData,
                items,
                totalAmount,
                discount,
                finalAmount,
                date: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                status: 'Paid',
                type: 'POS'
            };

            await setDoc(doc(db, getCollectionName('invoices'), invoiceId), invoice);

            // 2. Process Items
            // 2. Process Items
            for (const item of items) {
                // Livestock - Individual (Goat, Sheep, Cow, and checking if Poultry has individual IDs too)
                if ((['Goat', 'Sheep', 'Cow'].includes(item.category) || (item.category === 'Poultry' && item.type === 'individual')) && item.animalId) {
                    const batch = data.batches.find(b => b.id === item.batchId);
                    if (batch) {
                        const updatedAnimals = batch.animals.filter(a => a.id !== item.animalId);
                        const soldAnimal = batch.animals.find(a => a.id === item.animalId);

                        // Add to individual sold list
                        const soldRecord = {
                            ...soldAnimal,
                            soldPrice: Number(item.price),
                            soldDate: invoice.date,
                            invoiceId: invoiceId,
                            soldTo: customer?.name
                        };
                        const updatedSold = [...(batch.soldAnimals || []), soldRecord];

                        await updateBatch(item.batchId, {
                            animals: updatedAnimals,
                            soldAnimals: updatedSold
                        });
                    }
                }
                // Livestock - Bulk (Chicken/Poultry if sold by quantity from batch)
                else if (['Chicken', 'Poultry'].includes(item.category) && item.type === 'bulk') {
                    const batch = data.batches.find(b => b.id === item.batchId);
                    if (batch) {
                        const qtyToSell = Number(item.quantity) || 0;
                        let updatedAnimals = batch.animals || [];
                        let updatedSold = batch.soldAnimals || [];

                        // Strategy: If batch has 'animals' array, remove N oldest/active animals
                        // If batch relies on 'currentCount' (legacy or simplified), decrement that.

                        if (updatedAnimals.length > 0) {
                            // Find active animals
                            const activeAnimals = updatedAnimals.filter(a => a.status !== 'Sold' && a.status !== 'Deceased');
                            // Take top N
                            const toSell = activeAnimals.slice(0, qtyToSell);
                            // Remaining active
                            const remaining = activeAnimals.slice(qtyToSell);
                            // Sold records
                            const newSoldRecords = toSell.map(a => ({
                                ...a,
                                status: 'Sold',
                                soldPrice: Number(item.price) / qtyToSell, // amortized price
                                soldDate: invoice.date,
                                invoiceId: invoiceId,
                                soldTo: customer?.name,
                                isBulkValid: true
                            }));
                            // Re-merge: (Inactive/Others) + (Remaining Active) - (Sold Removed from Active)
                            // Actually, simpler: Filter out the IDs we sold.
                            const soldIds = toSell.map(a => a.id);
                            updatedAnimals = updatedAnimals.filter(a => !soldIds.includes(a.id));
                            updatedSold = [...updatedSold, ...newSoldRecords];
                        } else {
                            // Fallback: Just track sold count if no individual animals exist
                            // const newCount = Math.max(0, (batch.currentCount || 0) - qtyToSell);
                            // Not implementing legacy count decrement unless requested, prioritizing 'animals' array consistency
                        }

                        // Add a bulk transaction record mostly for reference if needed, 
                        // but above logic handles individual animal movement which is preferred.
                        if (updatedAnimals.length === (batch.animals || []).length && qtyToSell > 0) {
                            // If we didn't remove any animals (array empty), we assume pure bulk mode
                            const bulkSoldRecord = {
                                id: generateId('S'),
                                count: qtyToSell,
                                weight: Number(item.weight) || 0,
                                soldPrice: Number(item.price),
                                soldDate: invoice.date,
                                invoiceId: invoiceId,
                                isBulk: true
                            };
                            updatedSold = [...updatedSold, bulkSoldRecord];
                        }

                        await updateBatch(item.batchId, {
                            animals: updatedAnimals,
                            soldAnimals: updatedSold
                        });
                    }
                }
                // Produce (Fruits/Vegetables/Crops)
                else if (['Fruits', 'Vegetables', 'Crops'].includes(item.category)) {
                    // Try to find in Crops (Vegetables)
                    const crop = data.crops?.find(c => c.id === item.batchId);
                    if (crop) {
                        // Add Sale Record to Crop
                        await addCropSale(crop.id, {
                            date: invoice.date,
                            quantity: Number(item.quantity),
                            price: Number(item.price),
                            buyer: customer.name,
                            invoiceId: invoiceId
                        });
                        // Note: addCropSale should handle status update? 
                        // If not, we might need to manually update status if empty.
                        // For now, assuming tracking sales is enough.
                    } else {
                        // Try Fruits
                        const fruit = data.fruits?.find(f => f.id === item.batchId);
                        if (fruit) {
                            await addFruitSale(fruit.id, {
                                date: invoice.date,
                                quantity: Number(item.quantity),
                                price: Number(item.price),
                                buyer: customer.name,
                                invoiceId: invoiceId
                            });
                        } else {
                            // Try Inventory fallback
                            // item.batchId might match inventory ID if we passed it
                            const invItem = data.inventory?.find(i => i.id === item.batchId);
                            if (invItem) {
                                const newQty = (Number(invItem.quantity) || 0) - (Number(item.quantity) || 0);
                                await updateInventoryItem(item.batchId, {
                                    quantity: Math.max(0, newQty)
                                });
                            }
                        }
                    }
                }
            }

            return invoiceId;

        } catch (err) {
            console.error("Error processing sale:", err);
            throw err;
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
            processSale,
            revertSoldAnimal,
            deleteCropSale,
            updateCropSale,
            deleteFruitSale,
            updateFruitSale,
            deleteExpense,
            updateExpense,
            updateBatchExpense,
            deleteBatchExpense,
            addEggLog,
            updateEggLog,
            deleteEggLog,
            updateEmployee,
            deleteEmployee,
            addEmployeePayment,
            deleteEmployeePayment,
            addInventoryItem,
            updateInventoryItem,
            deleteInventoryItem,
            addContact,
            deleteContact,
            updateContact,
            // Farm contacts & groups
            addContactGroup,
            updateContactGroup,
            deleteContactGroup,
            addFarmContact,
            updateFarmContact,
            deleteFarmContact,
            cleanupOrphanedExpenses,
            // Allocation functions
            processMonthlyAllocations,
            recalculateAllocationsFrom,
            removeAllocationsForMonths,
            updateAllocation,
            getLiveAllocation
        }}>
            {children}
        </DataContext.Provider>
    );
};

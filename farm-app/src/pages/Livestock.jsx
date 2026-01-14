import React, { useState, useMemo } from 'react';
import { Plus, ArrowLeft, Trash2, Calendar, Edit2, Save, X, DollarSign, TrendingUp, Scale, Check } from 'lucide-react';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Livestock = () => {
    const { settings } = useSettings();
    const { data, addBatch, updateBatch, deleteAnimalFromBatch, deleteBatch, addWeightRecord, sellSelectedAnimals } = useData();
    const { canEdit } = useAuth();
    const [selectedBatchId, setSelectedBatchId] = useState(null);

    // Main Tab for Livestock view: 'active' | 'sold' | 'deceased'
    const [mainTab, setMainTab] = useState('active');

    // Batch Detail Tab: 'animals' | 'expenses' | 'weight'
    const [batchTab, setBatchTab] = useState('animals');

    // Modals State
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [isAnimalModalOpen, setIsAnimalModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);
    const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Animal Edit State
    const [editingAnimalId, setEditingAnimalId] = useState(null);

    // Selective Sell State
    const [selectedAnimalsToSell, setSelectedAnimalsToSell] = useState([]);

    // Weight tracking state
    const [selectedAnimalForWeight, setSelectedAnimalForWeight] = useState(null);
    const [weightForm, setWeightForm] = useState({ weight: '', date: new Date().toISOString().split('T')[0] });

    // Forms State
    const [batchForm, setBatchForm] = useState({ name: '', type: 'Goat', startDate: '', status: 'Raising' });

    const [animalForm, setAnimalForm] = useState({
        count: 1,
        gender: 'Female',
        weight: '',
        cost: '',
        status: 'Healthy'
    });

    const [expenseForm, setExpenseForm] = useState({
        type: 'Feed',
        description: '',
        amount: ''
    });

    // Sell Modal State
    const [sellForm, setSellForm] = useState({
        pricePerAnimal: 0
    });

    // --- DERIVED DATA ---
    const selectedBatch = data.batches.find(b => b.id === selectedBatchId);

    // Calculate total active animals across all batches for expense allocation
    const totalActiveAnimals = useMemo(() => {
        return data.batches.reduce((sum, batch) => {
            const active = (batch.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased').length;
            return sum + active;
        }, 0);
    }, [data.batches]);

    // Calculate monthly general expenses (non-batch-linked expenses + yearly split)
    const monthlyGeneralExpenses = useMemo(() => {
        // Regular expenses not linked to any batch/crop/fruit
        const regularUnlinked = (data.expenses || [])
            .filter(e => !e.batchId && !e.cropId && !e.fruitId)
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        // Yearly expenses split by 12
        const yearlyMonthly = (data.yearlyExpenses || [])
            .reduce((sum, e) => sum + (Number(e.monthlyAmount) || 0), 0);

        return regularUnlinked + yearlyMonthly;
    }, [data.expenses, data.yearlyExpenses]);

    // Expense per animal (allocated)
    const expensePerAnimal = totalActiveAnimals > 0 ? Math.round(monthlyGeneralExpenses / totalActiveAnimals) : 0;

    // Get all sold animals across all batches
    const allSoldAnimals = useMemo(() => {
        const sold = [];
        data.batches.forEach(batch => {
            (batch.animals || []).filter(a => a.status === 'Sold').forEach(animal => {
                sold.push({ ...animal, batchName: batch.name, batchType: batch.type, batchId: batch.id });
            });
        });
        return sold;
    }, [data.batches]);

    // Get all deceased animals across all batches
    const allDeceasedAnimals = useMemo(() => {
        const deceased = [];
        data.batches.forEach(batch => {
            (batch.animals || []).filter(a => a.status === 'Deceased').forEach(animal => {
                deceased.push({ ...animal, batchName: batch.name, batchType: batch.type, batchId: batch.id });
            });
        });
        return deceased;
    }, [data.batches]);

    // --- ACTIONS ---

    // 1. Create / Edit Batch
    const openBatchModal = (batch = null) => {
        if (batch) {
            setBatchForm(batch);
            setIsEditMode(true);
        } else {
            setBatchForm({ name: '', type: 'Goat', startDate: new Date().toISOString().split('T')[0], status: 'Raising' });
            setIsEditMode(false);
        }
        setIsBatchModalOpen(true);
    };

    const handleBatchSubmit = (e) => {
        e.preventDefault();
        if (isEditMode) {
            updateBatch(batchForm.id, batchForm);
        } else {
            addBatch(batchForm);
        }
        setIsBatchModalOpen(false);
    };

    // 2. Add / Edit Animals
    const openAnimalModal = (animal = null) => {
        if (animal) {
            setEditingAnimalId(animal.id);
            setAnimalForm({
                count: 1,
                gender: animal.gender,
                weight: animal.weight,
                cost: animal.purchaseCost,
                status: animal.status || 'Healthy'
            });
        } else {
            setEditingAnimalId(null);
            setAnimalForm({ count: 1, gender: 'Female', weight: '', cost: '', status: 'Healthy' });
        }
        setIsAnimalModalOpen(true);
    };

    const handleAnimalSubmit = (e) => {
        e.preventDefault();
        if (!selectedBatch) return;

        let updatedAnimals;

        if (editingAnimalId) {
            updatedAnimals = selectedBatch.animals.map(a =>
                a.id === editingAnimalId
                    ? {
                        ...a,
                        gender: animalForm.gender,
                        weight: Number(animalForm.weight),
                        purchaseCost: Number(animalForm.cost),
                        status: animalForm.status,
                        // If marking as sold, record the sale price if not already set
                        soldPrice: animalForm.status === 'Sold' && !a.soldPrice ? Number(animalForm.cost) : a.soldPrice
                    }
                    : a
            );
        } else {
            const newAnimals = Array.from({ length: Number(animalForm.count) }).map((_, i) => ({
                id: `${selectedBatch.type.charAt(0)}-${Date.now()}-${i}`,
                gender: animalForm.gender,
                weight: Number(animalForm.weight),
                purchaseCost: Number(animalForm.cost),
                status: 'Healthy'
            }));
            updatedAnimals = [...(selectedBatch.animals || []), ...newAnimals];
        }

        updateBatch(selectedBatch.id, { animals: updatedAnimals });
        setIsAnimalModalOpen(false);
    };

    // 3. Add Details Expense
    const handleAddExpense = (e) => {
        e.preventDefault();
        if (!selectedBatch) return;

        const newExpense = {
            type: expenseForm.type,
            description: expenseForm.description,
            amount: Number(expenseForm.amount)
        };

        const updatedExpenses = [...(selectedBatch.expenses || []), newExpense];
        updateBatch(selectedBatch.id, { expenses: updatedExpenses });

        setIsExpenseModalOpen(false);
        setExpenseForm({ type: 'Feed', description: '', amount: '' });
    };

    // 4. Sell Animals Handler
    const openSellModal = () => {
        if (!selectedBatch) return;
        const financials = calculateBatchFinancials(selectedBatch);
        const activeAnimals = (selectedBatch.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased');

        if (activeAnimals.length === 0) {
            alert('No active animals to sell!');
            return;
        }

        const avgCostPerAnimal = activeAnimals.length > 0 ? financials.totalInvested / activeAnimals.length : 0;
        const suggestedPrice = Math.round(avgCostPerAnimal * (1 + 20 / 100));

        setSellForm({
            quantity: 1,
            marginPercent: 20,
            pricePerAnimal: suggestedPrice,
            totalPrice: suggestedPrice
        });
        setIsSellModalOpen(true);
    };

    const updateSellFormPrice = (quantity, marginPercent) => {
        if (!selectedBatch) return;
        const financials = calculateBatchFinancials(selectedBatch);
        const activeAnimals = (selectedBatch.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased');
        const avgCostPerAnimal = activeAnimals.length > 0 ? financials.totalInvested / activeAnimals.length : 0;
        const suggestedPrice = Math.round(avgCostPerAnimal * (1 + marginPercent / 100));

        setSellForm({
            quantity,
            marginPercent,
            pricePerAnimal: suggestedPrice,
            totalPrice: suggestedPrice * quantity
        });
    };

    const handleSellAnimals = (e) => {
        e.preventDefault();
        if (!selectedBatch) return;

        const activeAnimals = (selectedBatch.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased');
        const toSellCount = Math.min(sellForm.quantity, activeAnimals.length);

        let soldCount = 0;
        const updatedAnimals = selectedBatch.animals.map(a => {
            if (a.status !== 'Sold' && a.status !== 'Deceased' && soldCount < toSellCount) {
                soldCount++;
                return {
                    ...a,
                    status: 'Sold',
                    soldPrice: sellForm.pricePerAnimal,
                    soldDate: new Date().toISOString().split('T')[0]
                };
            }
            return a;
        });

        updateBatch(selectedBatch.id, { animals: updatedAnimals });
        setIsSellModalOpen(false);
    };

    const calculateBatchFinancials = (batch) => {
        if (!batch || !batch.startDate) return { totalInvested: 0, minSellPrice: 0, activeAnimals: 0, soldAnimals: 0, deceasedAnimals: 0 };
        const daysActive = Math.floor((new Date() - new Date(batch.startDate)) / (1000 * 60 * 60 * 24)) || 0;

        const activeAnimals = (batch.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased');
        const soldAnimals = (batch.animals || []).filter(a => a.status === 'Sold');
        const deceasedAnimals = (batch.animals || []).filter(a => a.status === 'Deceased');

        const totalAnimalCost = (batch.animals || []).reduce((sum, a) => sum + (a.purchaseCost || 0), 0);
        const totalSpecificExpenses = (batch.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);

        const feedRate = settings.consumptionRates[batch.type] || 1;
        const totalFeedCost = activeAnimals.length * daysActive * feedRate * settings.feedCostPerUnit;

        const laborAllocation = (settings.dailyLaborCost / 100) * activeAnimals.length * daysActive;

        // Include allocated general expense
        const allocatedExpense = expensePerAnimal * activeAnimals.length;

        const totalInvested = totalAnimalCost + totalSpecificExpenses + totalFeedCost + laborAllocation + allocatedExpense;
        const minSellPrice = totalInvested * (1 + (settings.marginPercentage / 100));

        // Calculate sold revenue and profit
        const soldRevenue = soldAnimals.reduce((sum, a) => sum + (a.soldPrice || 0), 0);
        const soldCost = soldAnimals.reduce((sum, a) => sum + (a.purchaseCost || 0), 0);
        const soldProfit = soldRevenue - soldCost;

        // Calculate deceased loss
        const deceasedLoss = deceasedAnimals.reduce((sum, a) => sum + (a.purchaseCost || 0), 0);

        return {
            totalInvested,
            totalAnimalCost,
            operationalCost: totalFeedCost + totalSpecificExpenses + laborAllocation,
            allocatedExpense,
            minSellPrice,
            daysActive,
            activeAnimals: activeAnimals.length,
            soldAnimals: soldAnimals.length,
            deceasedAnimals: deceasedAnimals.length,
            soldRevenue,
            soldProfit,
            deceasedLoss
        };
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Healthy': return 'bg-green-100 text-green-700';
            case 'Sick': return 'bg-orange-100 text-orange-700';
            case 'Sold': return 'bg-blue-100 text-blue-700';
            case 'Deceased': return 'bg-gray-100 text-gray-500';
            default: return 'bg-green-100 text-green-700';
        }
    };

    const handleDeleteAnimal = (animalId) => {
        if (window.confirm('Are you sure you want to delete this animal?')) {
            deleteAnimalFromBatch(selectedBatch.id, animalId);
        }
    };

    // --- RENDER: MAIN TABS (Sold/Deceased Views) ---
    if (mainTab === 'sold' && !selectedBatch) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Sold Animals</h1>
                        <p className="text-gray-500">Track all sold animals across batches</p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 border-b border-gray-200">
                    <button
                        onClick={() => setMainTab('active')}
                        className={`px-4 py-2 font-medium transition-colors ${mainTab === 'active' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        🐐 Active Batches
                    </button>
                    <button
                        onClick={() => setMainTab('sold')}
                        className={`px-4 py-2 font-medium transition-colors ${mainTab === 'sold' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        💰 Sold Animals
                    </button>
                    <button
                        onClick={() => setMainTab('deceased')}
                        className={`px-4 py-2 font-medium transition-colors ${mainTab === 'deceased' ? 'text-gray-600 border-b-2 border-gray-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        ⚰️ Deceased
                    </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-500 uppercase">Total Sold</p>
                        <p className="text-2xl font-bold text-blue-600">{allSoldAnimals.length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-500 uppercase">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-600">₹ {allSoldAnimals.reduce((sum, a) => sum + (a.soldPrice || 0), 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-500 uppercase">Total Cost</p>
                        <p className="text-2xl font-bold">₹ {allSoldAnimals.reduce((sum, a) => sum + (a.purchaseCost || 0), 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-500 uppercase">Net Profit</p>
                        <p className={`text-2xl font-bold ${allSoldAnimals.reduce((sum, a) => sum + ((a.soldPrice || 0) - (a.purchaseCost || 0)), 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹ {allSoldAnimals.reduce((sum, a) => sum + ((a.soldPrice || 0) - (a.purchaseCost || 0)), 0).toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Sold Animals Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <Table
                        headers={['ID', 'Batch', 'Type', 'Purchase Cost', 'Sold Price', 'Profit', 'Sold Date']}
                        data={allSoldAnimals}
                        renderRow={(item) => (
                            <>
                                <td className="px-6 py-4 font-medium">{item.id}</td>
                                <td className="px-6 py-4">{item.batchName}</td>
                                <td className="px-6 py-4">{item.batchType}</td>
                                <td className="px-6 py-4">₹ {(item.purchaseCost || 0).toLocaleString()}</td>
                                <td className="px-6 py-4 text-green-600 font-bold">₹ {(item.soldPrice || 0).toLocaleString()}</td>
                                <td className={`px-6 py-4 font-bold ${(item.soldPrice || 0) - (item.purchaseCost || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ₹ {((item.soldPrice || 0) - (item.purchaseCost || 0)).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-gray-500">{item.soldDate || 'N/A'}</td>
                            </>
                        )}
                        emptyMessage="No animals have been sold yet"
                    />
                </div>
            </div>
        );
    }

    if (mainTab === 'deceased' && !selectedBatch) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Deceased Animals</h1>
                        <p className="text-gray-500">Track losses from deceased animals</p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 border-b border-gray-200">
                    <button
                        onClick={() => setMainTab('active')}
                        className={`px-4 py-2 font-medium transition-colors ${mainTab === 'active' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        🐐 Active Batches
                    </button>
                    <button
                        onClick={() => setMainTab('sold')}
                        className={`px-4 py-2 font-medium transition-colors ${mainTab === 'sold' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        💰 Sold Animals
                    </button>
                    <button
                        onClick={() => setMainTab('deceased')}
                        className={`px-4 py-2 font-medium transition-colors ${mainTab === 'deceased' ? 'text-gray-600 border-b-2 border-gray-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        ⚰️ Deceased
                    </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-500 uppercase">Total Deceased</p>
                        <p className="text-2xl font-bold text-gray-600">{allDeceasedAnimals.length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-500 uppercase">Total Loss</p>
                        <p className="text-2xl font-bold text-red-600">₹ {allDeceasedAnimals.reduce((sum, a) => sum + (a.purchaseCost || 0), 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <p className="text-xs text-gray-500 uppercase">Avg Loss / Animal</p>
                        <p className="text-2xl font-bold text-red-600">
                            ₹ {allDeceasedAnimals.length > 0 ? Math.round(allDeceasedAnimals.reduce((sum, a) => sum + (a.purchaseCost || 0), 0) / allDeceasedAnimals.length).toLocaleString() : 0}
                        </p>
                    </div>
                </div>

                {/* Deceased Animals Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <Table
                        headers={['ID', 'Batch', 'Type', 'Gender', 'Weight', 'Loss Amount']}
                        data={allDeceasedAnimals}
                        renderRow={(item) => (
                            <>
                                <td className="px-6 py-4 font-medium">{item.id}</td>
                                <td className="px-6 py-4">{item.batchName}</td>
                                <td className="px-6 py-4">{item.batchType}</td>
                                <td className="px-6 py-4">{item.gender}</td>
                                <td className="px-6 py-4">{item.weight} kg</td>
                                <td className="px-6 py-4 text-red-600 font-bold">- ₹ {(item.purchaseCost || 0).toLocaleString()}</td>
                            </>
                        )}
                        emptyMessage="No deceased animals recorded"
                    />
                </div>
            </div>
        );
    }

    // --- RENDER: BATCH LIST ---
    if (!selectedBatch) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Livestock Batches</h1>
                        <p className="text-gray-500">Manage your farm by batches.</p>
                    </div>
                    <button
                        onClick={() => openBatchModal()}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-green-200 transition-all font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        New Batch
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 border-b border-gray-200">
                    <button
                        onClick={() => setMainTab('active')}
                        className={`px-4 py-2 font-medium transition-colors ${mainTab === 'active' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        🐐 Active Batches
                    </button>
                    <button
                        onClick={() => setMainTab('sold')}
                        className={`px-4 py-2 font-medium transition-colors ${mainTab === 'sold' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        💰 Sold Animals ({allSoldAnimals.length})
                    </button>
                    <button
                        onClick={() => setMainTab('deceased')}
                        className={`px-4 py-2 font-medium transition-colors ${mainTab === 'deceased' ? 'text-gray-600 border-b-2 border-gray-600' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        ⚰️ Deceased ({allDeceasedAnimals.length})
                    </button>
                </div>

                {/* Expense Allocation Info */}
                {expensePerAnimal > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100 flex items-center gap-3"
                    >
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="font-medium text-amber-800">Monthly Expense Allocation</p>
                            <p className="text-sm text-amber-600">
                                ₹{monthlyGeneralExpenses.toLocaleString()} general expenses ÷ {totalActiveAnimals} active animals = <strong>₹{expensePerAnimal}/animal</strong>
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Batch Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.batches.map(batch => {
                        const f = calculateBatchFinancials(batch);
                        return (
                            <motion.div
                                whileHover={{ y: -5 }}
                                key={batch.id}
                                onClick={() => setSelectedBatchId(batch.id)}
                                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800">{batch.name}</h3>
                                        <span className="text-sm text-gray-500">{batch.type} Batch</span>
                                    </div>
                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">{f.activeAnimals} Active</span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Total Invested</span>
                                        <span className="font-medium">₹ {Math.round(f.totalInvested).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Allocated Expense</span>
                                        <span className="font-medium text-amber-600">₹ {(f.allocatedExpense || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Sold</span>
                                        <span className="font-medium text-blue-600">{f.soldAnimals} (₹{f.soldRevenue?.toLocaleString() || 0})</span>
                                    </div>
                                    {settings.ownerMode && (
                                        <div className="flex justify-between pt-2 border-t border-gray-100">
                                            <span className="text-gray-500">Min. Sell Price</span>
                                            <span className="font-bold text-green-600">₹ {Math.round(f.minSellPrice).toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                    {/* Empty State */}
                    {data.batches.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                            <p>No batches yet. Click "New Batch" to start!</p>
                        </div>
                    )}
                </div>

                {/* Create Batch Modal */}
                <Modal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} title="Create New Batch">
                    <form onSubmit={handleBatchSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
                            <input
                                required
                                type="text"
                                placeholder="e.g., Sheep Batch 5"
                                value={batchForm.name}
                                onChange={e => setBatchForm({ ...batchForm, name: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Livestock Type</label>
                                <select
                                    value={batchForm.type}
                                    onChange={e => setBatchForm({ ...batchForm, type: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                                >
                                    <option value="Goat">Goat</option>
                                    <option value="Sheep">Sheep</option>
                                    <option value="Cow">Cow</option>
                                    <option value="Chicken">Chicken</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    required
                                    type="date"
                                    value={batchForm.startDate}
                                    onChange={e => setBatchForm({ ...batchForm, startDate: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors">
                            Create Batch
                        </button>
                    </form>
                </Modal>
            </div>
        );
    }

    // --- RENDER: BATCH DETAILS ---
    const financials = calculateBatchFinancials(selectedBatch);
    const activeAnimals = (selectedBatch.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased');

    return (
        <div className="space-y-6">
            {/* Undo/Back */}
            <button onClick={() => setSelectedBatchId(null)} className="flex items-center text-gray-500 hover:text-gray-800 font-medium">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Batches
            </button>

            <div className="flex flex-col md:flex-row justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-gray-900">{selectedBatch.name}</h1>
                        <button
                            onClick={() => openBatchModal(selectedBatch)}
                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-gray-500">{selectedBatch.type} • {selectedBatch.animals?.length || 0} Animals • {financials.daysActive} Days Active</p>
                </div>
                {settings.ownerMode && (
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Minimum Batch Sell Price</p>
                        <h2 className="text-3xl font-bold text-green-600">₹ {Math.round(financials.minSellPrice).toLocaleString()}</h2>
                        <p className="text-xs text-gray-400">Includes {settings.marginPercentage}% margin</p>
                    </div>
                )}
            </div>

            {/* Financial Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Total Animals Cost</p>
                    <p className="text-lg font-bold">₹ {financials.totalAnimalCost.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Operational Cost</p>
                    <p className="text-lg font-bold text-orange-600">₹ {Math.round(financials.operationalCost).toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Allocated Expense</p>
                    <p className="text-lg font-bold text-amber-600">₹ {(financials.allocatedExpense || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">₹{expensePerAnimal}/head</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Avg Cost / Head</p>
                    <p className="text-lg font-bold">₹ {Math.round(activeAnimals.length > 0 ? financials.totalInvested / activeAnimals.length : 0).toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Est. Profit</p>
                    <p className="text-lg font-bold text-green-600">₹ {Math.round(financials.minSellPrice - financials.totalInvested).toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Animal List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Animal List</h3>
                        <div className="flex gap-2">
                            {activeAnimals.length > 0 && (
                                <button
                                    onClick={openSellModal}
                                    className="flex items-center gap-1 text-sm bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-medium hover:bg-green-100 transition-colors"
                                >
                                    <DollarSign className="w-4 h-4" /> Sell Animals
                                </button>
                            )}
                            <button
                                onClick={() => openAnimalModal()}
                                className="flex items-center gap-1 text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Add Animals
                            </button>
                        </div>
                    </div>

                    {/* Animal Stats Pills */}
                    <div className="flex gap-2 mb-2">
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active: {financials.activeAnimals}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Sold: {financials.soldAnimals}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Deceased: {financials.deceasedAnimals}</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">Male: {(selectedBatch.animals || []).filter(a => a.gender === 'Male' && a.status !== 'Sold' && a.status !== 'Deceased').length}</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">Female: {(selectedBatch.animals || []).filter(a => a.gender === 'Female' && a.status !== 'Sold' && a.status !== 'Deceased').length}</span>
                    </div>

                    <Table
                        headers={['ID', 'Gender', 'Weight', 'Cost', 'Status', 'Action']}
                        data={selectedBatch.animals || []}
                        renderRow={(item) => (
                            <>
                                <td className="px-6 py-4 font-medium">{item.id}</td>
                                <td className="px-6 py-4">{item.gender}</td>
                                <td className="px-6 py-4">{Math.round(item.weight)} kg</td>
                                <td className="px-6 py-4">₹ {item.purchaseCost}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getStatusColor(item.status)}`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 flex gap-2">
                                    <button
                                        onClick={() => openAnimalModal(item)}
                                        className="text-gray-400 hover:text-blue-600 transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteAnimal(item.id)}
                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </>
                        )}
                    />
                </div>

                {/* Right: Expenses */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Batch Expenses</h3>
                        <button
                            onClick={() => setIsExpenseModalOpen(true)}
                            className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 flex items-center gap-1 font-medium transition-colors"
                        >
                            <Plus className="w-3 h-3" /> Add
                        </button>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {(selectedBatch.expenses || []).map((exp, i) => (
                            <div key={i} className="p-4 border-b border-gray-100 last:border-0 flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-gray-800">{exp.type}</p>
                                    <p className="text-xs text-gray-500">{exp.description}</p>
                                </div>
                                <span className="font-bold text-red-500">- ₹{exp.amount}</span>
                            </div>
                        ))}
                        {/* Implicit Costs */}
                        <div className="p-4 bg-gray-50 flex justify-between items-center border-t border-gray-100">
                            <div>
                                <p className="font-medium text-gray-600">Feed (Calc)</p>
                                <p className="text-xs text-gray-400">Based on consumption</p>
                            </div>
                            <span className="font-bold text-gray-600">- ₹{Math.round(settings.feedCostPerUnit * (settings.consumptionRates[selectedBatch.type] || 1) * (selectedBatch.animals || []).length * financials.daysActive)}</span>
                        </div>
                        {/* Allocated General Expense */}
                        <div className="p-4 bg-amber-50 flex justify-between items-center border-t border-amber-100">
                            <div>
                                <p className="font-medium text-amber-700">General Expense (Allocated)</p>
                                <p className="text-xs text-amber-500">₹{expensePerAnimal}/animal × {financials.activeAnimals} active</p>
                            </div>
                            <span className="font-bold text-amber-600">- ₹{(financials.allocatedExpense || 0).toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Sold Summary (if any) */}
                    {financials.soldAnimals > 0 && (
                        <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-xl border border-blue-100">
                            <h4 className="font-bold text-blue-800 mb-2">💰 Sold Summary</h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Animals Sold</span>
                                    <span className="font-medium">{financials.soldAnimals}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Revenue</span>
                                    <span className="font-medium text-green-600">₹ {financials.soldRevenue?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Profit</span>
                                    <span className={`font-bold ${financials.soldProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ₹ {financials.soldProfit?.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODALS --- */}

            {/* Create/Edit Batch Modal (Reused) */}
            <Modal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} title={isEditMode ? "Edit Batch" : "Create New Batch"}>
                <form onSubmit={handleBatchSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
                        <input
                            required
                            type="text"
                            placeholder="e.g., Sheep Batch 5"
                            value={batchForm.name}
                            onChange={e => setBatchForm({ ...batchForm, name: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Livestock Type</label>
                            <select
                                value={batchForm.type}
                                onChange={e => setBatchForm({ ...batchForm, type: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                            >
                                <option value="Goat">Goat</option>
                                <option value="Sheep">Sheep</option>
                                <option value="Cow">Cow</option>
                                <option value="Chicken">Chicken</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                                required
                                type="date"
                                value={batchForm.startDate}
                                onChange={e => setBatchForm({ ...batchForm, startDate: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                            />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors">
                        {isEditMode ? 'Update Batch' : 'Create Batch'}
                    </button>
                </form>
            </Modal>

            {/* Add/Edit Animals Modal */}
            <Modal isOpen={isAnimalModalOpen} onClose={() => setIsAnimalModalOpen(false)} title={editingAnimalId ? "Edit Animal" : "Add Animals to Batch"}>
                <form onSubmit={handleAnimalSubmit} className="space-y-4">

                    {/* Only show 'Count' if Adding */}
                    {!editingAnimalId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                                required
                                type="number"
                                min="1"
                                value={animalForm.count}
                                onChange={e => setAnimalForm({ ...animalForm, count: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                            <select
                                value={animalForm.gender}
                                onChange={e => setAnimalForm({ ...animalForm, gender: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                            <input
                                required
                                type="number"
                                placeholder="e.g. 20"
                                value={animalForm.weight}
                                onChange={e => setAnimalForm({ ...animalForm, weight: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost / Value (₹)</label>
                        <input
                            required
                            type="number"
                            placeholder="e.g. 5000"
                            value={animalForm.cost}
                            onChange={e => setAnimalForm({ ...animalForm, cost: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    {/* Status Field - Only useful when Editing */}
                    {editingAnimalId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={animalForm.status}
                                onChange={e => setAnimalForm({ ...animalForm, status: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="Healthy">Healthy</option>
                                <option value="Sick">Sick</option>
                                <option value="Sold">Sold</option>
                                <option value="Deceased">Deceased</option>
                            </select>
                        </div>
                    )}

                    <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                        {editingAnimalId ? 'Save Changes' : `Add ${animalForm.count} Animals`}
                    </button>
                </form>
            </Modal>

            {/* Add Details Expense Modal */}
            <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Add Batch Expense">
                <form onSubmit={handleAddExpense} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type</label>
                        <select
                            value={expenseForm.type}
                            onChange={e => setExpenseForm({ ...expenseForm, type: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                        >
                            <option value="Feed">Feed (Specific)</option>
                            <option value="Vaccine">Vaccine</option>
                            <option value="Transport">Transport</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input
                            type="text"
                            placeholder="Details..."
                            value={expenseForm.description}
                            onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                        <input
                            required
                            type="number"
                            placeholder="0.00"
                            value={expenseForm.amount}
                            onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                        />
                    </div>
                    <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors">
                        Save Expense
                    </button>
                </form>
            </Modal>

            {/* Sell Animals Modal */}
            <Modal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)} title="Sell Animals">
                <form onSubmit={handleSellAnimals} className="space-y-4">
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-xl border border-green-100">
                        <p className="text-sm text-gray-600 mb-1">Available to sell: <strong>{activeAnimals.length}</strong> animals</p>
                        <p className="text-sm text-gray-600">Avg. cost per animal: <strong>₹{Math.round(activeAnimals.length > 0 ? financials.totalInvested / activeAnimals.length : 0).toLocaleString()}</strong></p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Sell</label>
                        <input
                            required
                            type="number"
                            min="1"
                            max={activeAnimals.length}
                            value={sellForm.quantity}
                            onChange={e => updateSellFormPrice(Number(e.target.value), sellForm.marginPercent)}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Margin Percentage (%)</label>
                        <input
                            required
                            type="number"
                            min="0"
                            max="100"
                            value={sellForm.marginPercent}
                            onChange={e => updateSellFormPrice(sellForm.quantity, Number(e.target.value))}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                        />
                    </div>

                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-gray-600">Suggested Price / Animal</span>
                            <span className="font-bold text-green-600">₹ {sellForm.pricePerAnimal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-lg">
                            <span className="font-medium text-gray-800">Total Sale Price</span>
                            <span className="font-bold text-green-700">₹ {sellForm.totalPrice.toLocaleString()}</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Final Price per Animal (₹)</label>
                        <input
                            required
                            type="number"
                            value={sellForm.pricePerAnimal}
                            onChange={e => setSellForm({ ...sellForm, pricePerAnimal: Number(e.target.value), totalPrice: Number(e.target.value) * sellForm.quantity })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                        />
                    </div>

                    <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors">
                        💰 Sell {sellForm.quantity} Animal{sellForm.quantity > 1 ? 's' : ''}
                    </button>
                </form>
            </Modal>

        </div>
    );
};

export default Livestock;

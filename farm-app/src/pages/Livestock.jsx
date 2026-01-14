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
    const { data, addBatch, updateBatch, deleteAnimalFromBatch, deleteBatch, addWeightRecord, sellSelectedAnimals, addExpense } = useData();
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
            .reduce((sum, e) => sum + (Number(e.monthlyAmount) || Math.round(Number(e.amount) / 12) || 0), 0);

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

    // --- HANDLERS ---
    const handleBatchSubmit = (e) => {
        e.preventDefault();
        if (selectedBatch) {
            updateBatch(selectedBatch.id, batchForm);
        } else {
            addBatch(batchForm);
        }
        setIsBatchModalOpen(false);
        setBatchForm({ name: '', type: 'Goat', startDate: '', status: 'Raising' });
    };

    const handleAnimalSubmit = (e) => {
        e.preventDefault();
        if (selectedBatch) {
            if (editingAnimalId) {
                // Edit existing animal logic would go here
            } else {
                // Add new animals
                // FIX: Short ID generation (Max 6 chars)
                // Format: TypeInitial + '-' + 4 random alphanumeric
                const newAnimals = Array.from({ length: Number(animalForm.count) }).map((_, i) => {
                    const typeInitial = selectedBatch.type.charAt(0).toUpperCase();
                    // Generate 4 random chars
                    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
                    const shortId = `${typeInitial}-${random}`;

                    return {
                        id: shortId,
                        gender: animalForm.gender,
                        weight: animalForm.weight,
                        purchaseCost: Number(animalForm.cost),
                        status: animalForm.status,
                        entryDate: new Date().toISOString().split('T')[0],
                        weightHistory: [{ date: new Date().toISOString().split('T')[0], weight: Number(animalForm.weight) }]
                    };
                });

                const updatedAnimals = [...(selectedBatch.animals || []), ...newAnimals];
                updateBatch(selectedBatch.id, { animals: updatedAnimals });
            }
        }
        setIsAnimalModalOpen(false);
        setAnimalForm({ count: 1, gender: 'Female', weight: '', cost: '', status: 'Healthy' });
    };

    const handleDeleteAnimal = (animalId) => {
        if (!canEdit) return;
        if (window.confirm('Are you sure you want to delete this animal?')) {
            deleteAnimalFromBatch(selectedBatch.id, animalId);
        }
    };

    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        if (selectedBatch) {
            // FIX: Use addExpense from context to ensure it syncs to global expenses
            // The context function handles adding to 'expenses' collection AND updating the 'batch' document
            await addExpense({
                ...expenseForm,
                amount: Number(expenseForm.amount), // Ensure number
                category: expenseForm.type, // Map type to category
                batchId: selectedBatch.id,
                date: new Date().toISOString().split('T')[0]
            });
        }
        setIsExpenseModalOpen(false);
        setExpenseForm({ type: 'Feed', description: '', amount: '' });
    };

    const handleDeleteBatch = async () => {
        if (!canEdit) return;
        if (window.confirm('Are you sure you want to delete this ENTIRE batch? This action cannot be undone.')) {
            await deleteBatch(selectedBatch.id);
            setSelectedBatchId(null);
        }
    };

    // Selective Sell Handler
    const openSellModal = () => {
        // Calculate suggested price
        const financials = calculateBatchFinancials(selectedBatch);
        const activeAnimals = (selectedBatch.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased');

        if (activeAnimals.length === 0) {
            alert('No active animals to sell!');
            return;
        }

        const avgCostPerAnimal = activeAnimals.length > 0 ? financials.totalInvested / activeAnimals.length : 0;
        const suggestedPrice = Math.round(avgCostPerAnimal * (1 + 20 / 100)); // Default 20% margin

        setSellForm({
            pricePerAnimal: suggestedPrice,
            // Select all by default for now
            selectedIds: activeAnimals.map(a => a.id)
        });
        // Also populate selection state
        setSelectedAnimalsToSell(activeAnimals.map(a => a.id));
        setIsSellModalOpen(true);
    };

    const handleSellSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBatch) return;

        // Use the selected IDs
        await sellSelectedAnimals(selectedBatch.id, selectedAnimalsToSell, Number(sellForm.pricePerAnimal));
        setIsSellModalOpen(false);
    };

    const toggleAnimalSelection = (id) => {
        if (selectedAnimalsToSell.includes(id)) {
            setSelectedAnimalsToSell(prev => prev.filter(aid => aid !== id));
        } else {
            setSelectedAnimalsToSell(prev => [...prev, id]);
        }
    };

    // Weight Record Handler
    const handleWeightSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBatch || !selectedAnimalForWeight) return;

        await addWeightRecord(selectedBatch.id, selectedAnimalForWeight, Number(weightForm.weight), weightForm.date);
        setIsWeightModalOpen(false);
        setWeightForm({ weight: '', date: new Date().toISOString().split('T')[0] });
    };

    const openBatchModal = (batch = null) => {
        if (batch) {
            setBatchForm({ name: batch.name, type: batch.type, startDate: batch.date, status: 'Raising' });
        } else {
            setBatchForm({ name: '', type: 'Goat', startDate: '', status: 'Raising' });
        }
        setIsBatchModalOpen(true);
    };

    const openAnimalModal = (animal = null) => {
        if (animal) {
            setEditingAnimalId(animal.id);
            setAnimalForm({ count: 1, gender: animal.gender, weight: animal.weight, cost: animal.purchaseCost, status: animal.status });
        } else {
            setEditingAnimalId(null);
            setAnimalForm({ count: 1, gender: 'Female', weight: '', cost: '', status: 'Healthy' });
        }
        setIsAnimalModalOpen(true);
    };

    const calculateBatchFinancials = (batch) => {
        if (!batch) return {};

        const animals = batch.animals || [];
        const expenses = batch.expenses || [];
        const activeAnimals = animals.filter(a => a.status !== 'Sold' && a.status !== 'Deceased');
        const soldAnimals = animals.filter(a => a.status === 'Sold');
        const deceasedAnimals = animals.filter(a => a.status === 'Deceased');

        // Days active
        const startDate = new Date(batch.date || Date.now());
        const daysActive = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24)) || 1;

        // Costs
        const totalAnimalCost = animals.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0);
        const totalSpecificExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        // Feed Cost - NOW REMOVED AUTOMATIC CALCULATION as per user request
        // Only explicit expenses are counted
        const totalFeedCost = 0;

        const allocatedExpense = animals.length * expensePerAnimal; // Simple allocation based on total headcount history

        // Total Investment
        const totalInvested = totalAnimalCost + totalSpecificExpenses + totalFeedCost + allocatedExpense;

        // Revenue
        const soldRevenue = soldAnimals.reduce((sum, a) => sum + (Number(a.soldPrice) || 0), 0);
        const deceasedLoss = deceasedAnimals.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0);

        // Profit
        const soldProfit = soldRevenue - (soldAnimals.length > 0 ? (totalInvested / animals.length) * soldAnimals.length : 0);

        // Min Sell Price
        const marginMultiplier = 1 + (Number(settings.marginPercentage) || 20) / 100;
        const costPerHead = activeAnimals.length > 0 ? totalInvested / animals.length : 0;
        const minSellPrice = costPerHead * marginMultiplier;

        return {
            totalInvested,
            totalAnimalCost,
            operationalCost: totalSpecificExpenses, // Only specific expenses now
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

    // --- RENDER: MAIN LIST ---
    if (!selectedBatch) {
        if (mainTab === 'sold') {
            return (
                <div className="space-y-6 mb-20">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Sold Animals</h1>
                            <p className="text-gray-500">Track all sold animals across batches</p>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-2 border-b border-gray-200">
                        <button onClick={() => setMainTab('active')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'active' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}>🐐 Active Batches</button>
                        <button onClick={() => setMainTab('sold')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'sold' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>💰 Sold Animals</button>
                        <button onClick={() => setMainTab('deceased')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'deceased' ? 'text-gray-600 border-b-2 border-gray-600' : 'text-gray-500 hover:text-gray-800'}`}>⚰️ Deceased</button>
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

        if (mainTab === 'deceased') {
            return (
                <div className="space-y-6 mb-20">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Deceased Animals</h1>
                            <p className="text-gray-500">Track losses from deceased animals</p>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-2 border-b border-gray-200">
                        <button onClick={() => setMainTab('active')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'active' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}>🐐 Active Batches</button>
                        <button onClick={() => setMainTab('sold')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'sold' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>💰 Sold Animals</button>
                        <button onClick={() => setMainTab('deceased')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'deceased' ? 'text-gray-600 border-b-2 border-gray-600' : 'text-gray-500 hover:text-gray-800'}`}>⚰️ Deceased</button>
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

        // Active Batches View
        return (
            <div className="space-y-6 mb-20">
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
                    <button onClick={() => setMainTab('active')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'active' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}>🐐 Active Batches</button>
                    <button onClick={() => setMainTab('sold')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'sold' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>💰 Sold Animals ({allSoldAnimals.length})</button>
                    <button onClick={() => setMainTab('deceased')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'deceased' ? 'text-gray-600 border-b-2 border-gray-600' : 'text-gray-500 hover:text-gray-800'}`}>⚰️ Deceased ({allDeceasedAnimals.length})</button>
                </div>

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
                                    {/* FIX: Include Total Bought Cost */}
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Bought Cost</span>
                                        <span className="font-medium">₹ {Math.round(f.totalAnimalCost).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Total Invested</span>
                                        <span className="font-medium">₹ {Math.round(f.totalInvested).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Allocated Exp</span>
                                        <span className="font-medium text-amber-600">₹ {(f.allocatedExpense || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Sold</span>
                                        <span className="font-medium text-blue-600">{f.soldAnimals} (₹{f.soldRevenue?.toLocaleString() || 0})</span>
                                    </div>
                                    {/* FIX: Always show Min Sell Price as requested, or keep tied to ownerMode if user prefers. 
                                        User said "Total bough cost and minimum selling price as per expenses should be there in the batches".
                                        I will remove ownerMode check for this to ensure it's visible. */}
                                    <div className="flex justify-between pt-2 border-t border-gray-100">
                                        <span className="text-gray-500">Min. Sell Price</span>
                                        <span className="font-bold text-green-600">₹ {Math.round(f.minSellPrice).toLocaleString()}</span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Modals for List View */}
                <Modal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} title="Create New Batch">
                    <form onSubmit={handleBatchSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
                            <input required type="text" value={batchForm.name} onChange={e => setBatchForm({ ...batchForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 outline-none" placeholder="e.g., Spring 2024 Goats" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Livestock Type</label>
                            <select value={batchForm.type} onChange={e => setBatchForm({ ...batchForm, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 outline-none">
                                <option value="Goat">Goat</option>
                                <option value="Sheep">Sheep</option>
                                <option value="Poultry">Poultry</option>
                                <option value="Cow">Cow</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input required type="date" value={batchForm.startDate} onChange={e => setBatchForm({ ...batchForm, startDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 outline-none" />
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={() => setIsBatchModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Create Batch</button>
                        </div>
                    </form>
                </Modal>
            </div>
        );
    }

    // --- RENDER: BATCH DETAILS VIEW ---
    const financials = calculateBatchFinancials(selectedBatch);
    const activeAnimals = (selectedBatch.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased');

    return (
        <div className="space-y-6 mb-20">
            {/* Header & Back */}
            <button onClick={() => setSelectedBatchId(null)} className="flex items-center text-gray-500 hover:text-gray-800 font-medium">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Batches
            </button>

            <div className="flex flex-col md:flex-row justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-gray-900">{selectedBatch.name}</h1>
                        <button onClick={() => openBatchModal(selectedBatch)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><Edit2 className="w-4 h-4" /></button>
                        {/* Sell Button - Now in Header */}
                        {activeAnimals.length > 0 && (
                            <button onClick={openSellModal} className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors flex items-center gap-1" title="Sell Animals">
                                <DollarSign className="w-4 h-4" />
                                <span className="text-sm font-bold">Sell</span>
                            </button>
                        )}
                        {canEdit && (
                            <button onClick={handleDeleteBatch} className="p-2 text-red-300 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors" title="Delete Batch">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <p className="text-gray-500">{selectedBatch.type} • {selectedBatch.animals?.length || 0} Animals • {financials.daysActive} Days Active</p>
                </div>
                {/* Always show Min Sell Price in details too */}
                <div className="text-right">
                    <p className="text-sm text-gray-500">Minimum Sell Price</p>
                    <h2 className="text-3xl font-bold text-green-600">₹ {Math.round(financials.minSellPrice).toLocaleString()}</h2>
                </div>
            </div>

            {/* Detail Tabs */}
            <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
                <button onClick={() => setBatchTab('animals')} className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${batchTab === 'animals' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}>Overview</button>
                <button onClick={() => setBatchTab('weight')} className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${batchTab === 'weight' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>Weight Tracking</button>
            </div>

            {/* TAB: OVERVIEW (Animals + Expenses) */}
            {batchTab === 'animals' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Animal List */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">Animal List</h3>
                            <button onClick={() => openAnimalModal()} className="flex items-center gap-1 text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100 transition-colors">
                                <Plus className="w-4 h-4" /> Add Animals
                            </button>
                        </div>

                        {/* Stats Pills */}
                        <div className="flex gap-2 mb-2 flex-wrap">
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Active: {financials.activeAnimals}</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Sold: {financials.soldAnimals}</span>
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Total Bought Cost: ₹{financials.totalAnimalCost.toLocaleString()}</span>
                        </div>

                        <Table
                            headers={['ID', 'Gender', 'Weight', 'Cost', 'Status', 'Action']}
                            data={selectedBatch.animals || []}
                            renderRow={(item) => (
                                <>
                                    <td className="px-6 py-4 font-medium">{item.id}</td>
                                    <td className="px-6 py-4">{item.gender}</td>
                                    <td className="px-6 py-4 text-center">{Math.round(item.weight)} kg</td>
                                    <td className="px-6 py-4 text-center">₹ {item.purchaseCost}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getStatusColor(item.status)}`}>{item.status}</span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-2">
                                        <button onClick={() => openAnimalModal(item)} className="text-gray-400 hover:text-blue-600 transition-colors"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteAnimal(item.id)} className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </>
                            )}
                        />
                    </div>

                    {/* Right Column: Expenses */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">Batch Expenses</h3>
                            <button onClick={() => setIsExpenseModalOpen(true)} className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 flex items-center gap-1 font-medium transition-colors">
                                <Plus className="w-3 h-3" /> Add Expense
                            </button>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            {(selectedBatch.expenses || []).length > 0 ? (selectedBatch.expenses || []).map((exp, i) => (
                                <div key={i} className="p-4 border-b border-gray-100 last:border-0 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-gray-800">{exp.type}</p>
                                        <p className="text-xs text-gray-500">{exp.description}</p>
                                    </div>
                                    <span className="font-bold text-red-500">- ₹{exp.amount}</span>
                                </div>
                            )) : (
                                <div className="p-8 text-center text-gray-400"><p>No specific expenses recorded.</p></div>
                            )}
                            <div className="p-4 bg-amber-50 flex justify-between items-center border-t border-amber-100">
                                <div><p className="font-medium text-amber-800">Allocated General</p><p className="text-xs text-amber-600">Shared farm expenses</p></div>
                                <span className="font-bold text-amber-700">- ₹{financials.allocatedExpense || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: WEIGHT */}
            {batchTab === 'weight' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Weight Analysis</h3>
                        <button onClick={() => setIsWeightModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all font-medium">
                            <Scale className="w-4 h-4" /> Record Weight
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h4 className="font-bold text-gray-700 mb-4">Growth Chart</h4>
                            <div className="h-[300px] relative">
                                {selectedAnimalForWeight && (selectedBatch.animals.find(a => a.id === selectedAnimalForWeight)?.weightHistory || []).length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={(selectedBatch.animals.find(a => a.id === selectedAnimalForWeight)?.weightHistory || []).map(r => ({ ...r, weight: Number(r.weight) }))}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                            <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} unit=" kg" />
                                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#10B981' }} />
                                            <Line type="monotone" dataKey="weight" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 4 }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-2xl">
                                        <div className="text-center text-gray-400">
                                            <Scale className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p>{selectedAnimalForWeight ? "No weight history for this animal" : "Select an animal to view growth chart"}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 max-h-[400px] overflow-y-auto">
                            <h4 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Select Animal</h4>
                            <div className="space-y-2">
                                {activeAnimals.map(animal => (
                                    <button key={animal.id} onClick={() => setSelectedAnimalForWeight(animal.id)} className={`w-full text-left px-4 py-3 rounded-xl transition-all ${selectedAnimalForWeight === animal.id ? 'bg-blue-50 text-blue-700 font-medium ring-2 ring-blue-500/20' : 'hover:bg-gray-50 text-gray-600'}`}>
                                        <div className="flex justify-between items-center"><span>{animal.id}</span><span className="text-sm text-gray-400">{animal.weight} kg</span></div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODALS --- */}
            {/* Animal Modal */}
            <Modal isOpen={isAnimalModalOpen} onClose={() => setIsAnimalModalOpen(false)} title={editingAnimalId ? "Edit Animal" : "Add Animals"}>
                <form onSubmit={handleAnimalSubmit} className="space-y-4">
                    {!editingAnimalId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Animals</label>
                            <input required type="number" min="1" max="50" value={animalForm.count} onChange={e => setAnimalForm({ ...animalForm, count: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                            <select value={animalForm.gender} onChange={e => setAnimalForm({ ...animalForm, gender: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20">
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                            <input required type="number" step="0.1" value={animalForm.weight} onChange={e => setAnimalForm({ ...animalForm, weight: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Animal</label>
                        <input required type="number" value={animalForm.cost} onChange={e => setAnimalForm({ ...animalForm, cost: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select value={animalForm.status} onChange={e => setAnimalForm({ ...animalForm, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20">
                            <option value="Healthy">Healthy</option>
                            <option value="Sick">Sick</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsAnimalModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">{editingAnimalId ? 'Save Changes' : 'Add Animals'}</button>
                    </div>
                </form>
            </Modal>

            {/* Expense Modal */}
            <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} title="Add Batch Expense">
                <form onSubmit={handleExpenseSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type</label>
                        <select value={expenseForm.type} onChange={e => setExpenseForm({ ...expenseForm, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20">
                            <option value="Feed">Feed</option>
                            <option value="Medicine">Medicine</option>
                            <option value="Labor">Labor</option>
                            <option value="Transport">Transport</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input required type="text" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" placeholder="e.g., Veterinary visit" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                        <input required type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Add Expense</button>
                    </div>
                </form>
            </Modal>

            {/* Weight Modal */}
            <Modal isOpen={isWeightModalOpen} onClose={() => setIsWeightModalOpen(false)} title="Record Weight">
                <form onSubmit={handleWeightSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Animal</label>
                        <select required value={selectedAnimalForWeight || ''} onChange={e => setSelectedAnimalForWeight(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20">
                            <option value="">Select an animal...</option>
                            {activeAnimals.map(a => <option key={a.id} value={a.id}>{a.id} (Curr: {a.weight}kg)</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Weight (kg)</label>
                        <input required type="number" step="0.1" value={weightForm.weight} onChange={e => setWeightForm({ ...weightForm, weight: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input required type="date" value={weightForm.date} onChange={e => setWeightForm({ ...weightForm, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsWeightModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Record</button>
                    </div>
                </form>
            </Modal>

            {/* Sell Modal */}
            <Modal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)} title="Sell Animals">
                <form onSubmit={handleSellSubmit} className="space-y-4">
                    <p className="text-sm text-gray-500 mb-4">Select which animals to sell from this batch.</p>

                    <div className="max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-2 bg-gray-50">
                        {activeAnimals.map(a => (
                            <label key={a.id} className="flex items-center gap-3 p-2 bg-white rounded border border-gray-100 cursor-pointer hover:bg-gray-50">
                                <input
                                    type="checkbox"
                                    checked={selectedAnimalsToSell.includes(a.id)}
                                    onChange={() => toggleAnimalSelection(a.id)}
                                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                />
                                <div>
                                    <span className="font-medium text-gray-800">{a.id}</span>
                                    <span className="text-gray-500 text-sm ml-2">({a.gender}, {a.weight}kg)</span>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sold Price per Animal</label>
                        <input required type="number" value={sellForm.pricePerAnimal} onChange={e => setSellForm({ ...sellForm, pricePerAnimal: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsSellModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Confirm Sale</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Livestock;

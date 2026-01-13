import React, { useState } from 'react';
import { Plus, ArrowLeft, Trash2, Calendar, Edit2, Save, X } from 'lucide-react';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { motion } from 'framer-motion';

const Livestock = () => {
    const { settings } = useSettings();
    const { data, addBatch, updateBatch } = useData();
    const [selectedBatchId, setSelectedBatchId] = useState(null);

    // Modals State
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [isAnimalModalOpen, setIsAnimalModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Animal Edit State
    const [editingAnimalId, setEditingAnimalId] = useState(null);

    // Forms State
    const [batchForm, setBatchForm] = useState({ name: '', type: 'Goat', startDate: '', status: 'Raising' });

    const [animalForm, setAnimalForm] = useState({
        count: 1,
        gender: 'Female',
        weight: '',
        cost: '',
        status: 'Healthy' // Added status for edit
    });

    const [expenseForm, setExpenseForm] = useState({
        type: 'Feed',
        description: '',
        amount: ''
    });

    // --- DERIVED DATA ---
    const selectedBatch = data.batches.find(b => b.id === selectedBatchId);

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
            // Edit Mode
            setEditingAnimalId(animal.id);
            setAnimalForm({
                count: 1, // Irrelevant for edit
                gender: animal.gender,
                weight: animal.weight,
                cost: animal.purchaseCost,
                status: animal.status || 'Healthy'
            });
        } else {
            // Add Mode
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
            // UPDATE Existing Animal
            updatedAnimals = selectedBatch.animals.map(a =>
                a.id === editingAnimalId
                    ? {
                        ...a,
                        gender: animalForm.gender,
                        weight: Number(animalForm.weight),
                        purchaseCost: Number(animalForm.cost),
                        status: animalForm.status
                    }
                    : a
            );
        } else {
            // ADD New Animals
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


    const calculateBatchFinancials = (batch) => {
        if (!batch || !batch.startDate) return { totalInvested: 0, minSellPrice: 0 };
        const daysActive = Math.floor((new Date() - new Date(batch.startDate)) / (1000 * 60 * 60 * 24)) || 0;

        const totalAnimalCost = (batch.animals || []).reduce((sum, a) => sum + (a.purchaseCost || 0), 0);
        const totalSpecificExpenses = (batch.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);

        const feedRate = settings.consumptionRates[batch.type] || 1;
        const totalFeedCost = (batch.animals || []).length * daysActive * feedRate * settings.feedCostPerUnit;

        // Labor allocation logic
        const laborAllocation = (settings.dailyLaborCost / 100) * (batch.animals || []).length * daysActive;

        const totalInvested = totalAnimalCost + totalSpecificExpenses + totalFeedCost + laborAllocation;
        const minSellPrice = totalInvested * (1 + (settings.marginPercentage / 100));

        return {
            totalInvested,
            totalAnimalCost,
            operationalCost: totalFeedCost + totalSpecificExpenses + laborAllocation,
            minSellPrice,
            daysActive
        };
    };

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
                        <Plus className="w-5 h-5" /> New Batch
                    </button>
                </div>

                {/* Batches Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.batches.length > 0 ? (
                        data.batches.map(batch => {
                            const financials = calculateBatchFinancials(batch);
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
                                            <span className="text-sm text-gray-500">{batch.type} • {batch.startDate}</span>
                                        </div>
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">
                                            {batch.status}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Animals</span>
                                            <span className="font-medium text-gray-900">{batch.animals?.length || 0} Head</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Invested</span>
                                            <span className="font-medium text-gray-900">₹ {Math.round(financials.totalInvested).toLocaleString()}</span>
                                        </div>
                                        {settings.ownerMode && (
                                            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm text-green-700 font-bold bg-green-50 p-2 rounded-lg">
                                                <span>Target Sell</span>
                                                <span>₹ {Math.round(financials.minSellPrice).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                            <p>No batches found. Create one to get started!</p>
                        </div>
                    )}
                </div>

                {/* Create/Edit Batch Modal */}
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
            </div>
        );
    }

    // --- RENDER: BATCH DETAILS ---
    const financials = calculateBatchFinancials(selectedBatch);

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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Total Animals Cost</p>
                    <p className="text-lg font-bold">₹ {financials.totalAnimalCost.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Operational Cost</p>
                    <p className="text-lg font-bold text-orange-600">₹ {Math.round(financials.operationalCost).toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Avg Cost / Head</p>
                    <p className="text-lg font-bold">₹ {Math.round(selectedBatch.animals?.length ? financials.totalInvested / selectedBatch.animals.length : 0).toLocaleString()}</p>
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
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">Male: {(selectedBatch.animals || []).filter(a => a.gender === 'Male').length}</span>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">Female: {(selectedBatch.animals || []).filter(a => a.gender === 'Female').length}</span>
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
                                <td className="px-6 py-4 text-green-600 text-xs font-bold uppercase">{item.status}</td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => openAnimalModal(item)}
                                        className="text-gray-400 hover:text-blue-600 transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" />
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
                    </div>
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

                    {/* Status Field - Only useful when Editing or strictly adding healthy ones */}
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

        </div>
    );
};

export default Livestock;

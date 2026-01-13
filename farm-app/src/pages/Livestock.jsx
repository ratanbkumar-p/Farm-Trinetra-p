import React, { useState } from 'react';
import { Plus, ArrowLeft, Trash2, Calendar } from 'lucide-react';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { motion } from 'framer-motion';

const Livestock = () => {
    const { settings } = useSettings();
    const { data, addBatch, updateBatch } = useData();
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [newBatch, setNewBatch] = useState({ name: '', type: 'Goat', startDate: '', status: 'Raising' });

    // --- ACTIONS ---
    const handleCreateBatch = (e) => {
        e.preventDefault();
        addBatch(newBatch);
        setIsModalOpen(false);
        setNewBatch({ name: '', type: 'Goat', startDate: '', status: 'Raising' });
    };

    const calculateBatchFinancials = (batch) => {
        if (!batch.startDate) return { totalInvested: 0, minSellPrice: 0 };
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
                        onClick={() => setIsModalOpen(true)}
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
                                    onClick={() => setSelectedBatch(batch)}
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

                {/* Add Batch Modal */}
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Batch">
                    <form onSubmit={handleCreateBatch} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
                            <input
                                required
                                type="text"
                                placeholder="e.g., Sheep Batch 5"
                                value={newBatch.name}
                                onChange={e => setNewBatch({ ...newBatch, name: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Livestock Type</label>
                                <select
                                    value={newBatch.type}
                                    onChange={e => setNewBatch({ ...newBatch, type: e.target.value })}
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
                                    value={newBatch.startDate}
                                    onChange={e => setNewBatch({ ...newBatch, startDate: e.target.value })}
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
    // Using selectedBatch directly might be stale if we update context. 
    // Better to find it in data.batches
    const liveBatch = data.batches.find(b => b.id === selectedBatch.id) || selectedBatch;
    const financials = calculateBatchFinancials(liveBatch);

    return (
        <div className="space-y-6">
            {/* Undo/Back */}
            <button onClick={() => setSelectedBatch(null)} className="flex items-center text-gray-500 hover:text-gray-800 font-medium">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Batches
            </button>

            <div className="flex flex-col md:flex-row justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{liveBatch.name}</h1>
                    <p className="text-gray-500">{liveBatch.type} • {liveBatch.animals?.length || 0} Animals • {financials.daysActive} Days Active</p>
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
                    <p className="text-lg font-bold">₹ {Math.round(liveBatch.animals.length ? financials.totalInvested / liveBatch.animals.length : 0).toLocaleString()}</p>
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
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">Male: {(liveBatch.animals || []).filter(a => a.gender === 'Male').length}</span>
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded">Female: {(liveBatch.animals || []).filter(a => a.gender === 'Female').length}</span>
                        </div>
                    </div>
                    <Table
                        headers={['ID', 'Gender', 'Weight', 'Cost', 'Status']}
                        data={liveBatch.animals || []}
                        renderRow={(item) => (
                            <>
                                <td className="px-6 py-4 font-medium">{item.id}</td>
                                <td className="px-6 py-4">{item.gender}</td>
                                <td className="px-6 py-4">{Math.round(item.weight)} kg</td>
                                <td className="px-6 py-4">₹ {item.purchaseCost}</td>
                                <td className="px-6 py-4 text-green-600 text-xs font-bold uppercase">{item.status}</td>
                            </>
                        )}
                    />
                </div>

                {/* Right: Expenses */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Batch Expenses</h3>
                        <button className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100 flex gap-1">
                            <Plus className="w-3 h-3" /> Add
                        </button>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {(liveBatch.expenses || []).map((exp, i) => (
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
                            <span className="font-bold text-gray-600">- ₹{Math.round(settings.feedCostPerUnit * (settings.consumptionRates[liveBatch.type] || 1) * (liveBatch.animals || []).length * financials.daysActive)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Livestock;

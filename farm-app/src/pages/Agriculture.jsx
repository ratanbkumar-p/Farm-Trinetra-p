import React, { useState } from 'react';
import { Plus, Leaf, ArrowLeft, Edit2, Trash2, TrendingUp, Wallet, Shovel, Bug } from 'lucide-react';
import Table from '../components/ui/Table';
import { motion } from 'framer-motion';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';

const LABOR_TYPES = ['Sowing', 'Weeding', 'Harvesting', 'Fertilizer Application', 'Pesticide Application', 'Irrigation', 'Other'];

const Agriculture = () => {
    const { data, addCrop, updateCrop, deleteCrop, addCropSale, addCropExpense, deleteCropSale, deleteExpense } = useData();
    const { isSuperAdmin } = useAuth();
    const { settings } = useSettings();

    // State
    const [selectedCropId, setSelectedCropId] = useState(null);
    const [isCropModalOpen, setIsCropModalOpen] = useState(false);
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);
    const [isPesticideModalOpen, setIsPesticideModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [cropTab, setCropTab] = useState('sales'); // 'sales' | 'labor' | 'pesticides'

    // Forms
    const [cropForm, setCropForm] = useState({
        name: '',
        variety: '',
        seedCost: '',
        plantedDate: new Date().toISOString().split('T')[0],
        status: 'Growing'
    });

    const [saleForm, setSaleForm] = useState({
        date: new Date().toISOString().split('T')[0],
        quantity: '',
        unit: 'kg',
        amount: ''
    });

    const [laborForm, setLaborForm] = useState({
        date: new Date().toISOString().split('T')[0],
        laborType: 'Sowing',
        description: '',
        amount: ''
    });

    const [pesticideForm, setPesticideForm] = useState({
        date: new Date().toISOString().split('T')[0],
        pesticideName: '',
        otherName: '',
        quantity: '',
        unit: 'liters',
        cost: '',
        notes: ''
    });

    // Derived Data
    const selectedCrop = data.crops.find(c => c.id === selectedCropId);

    // Handlers
    const handleDeleteCrop = async () => {
        if (!isSuperAdmin) return;
        if (window.confirm('Are you sure you want to delete this crop? This action cannot be undone.')) {
            await deleteCrop(selectedCrop.id);
            setSelectedCropId(null);
        }
    };

    // Calculate stats
    const getTotalStats = () => {
        let totalSeedCost = 0;
        let totalLaborCost = 0;
        let totalRevenue = 0;

        data.crops.forEach(crop => {
            totalSeedCost += Number(crop.seedCost) || 0;
            totalRevenue += (crop.sales || []).reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        });

        // Get labor costs from expenses linked to crops
        data.expenses.forEach(exp => {
            if (exp.cropId) {
                totalLaborCost += Number(exp.amount) || 0;
            }
        });

        const totalExpenditure = totalSeedCost + totalLaborCost;
        const margin = totalRevenue - totalExpenditure;

        return { totalSeedCost, totalLaborCost, totalExpenditure, totalRevenue, margin };
    };

    const getCropStats = (crop) => {
        const seedCost = Number(crop.seedCost) || 0;
        const revenue = (crop.sales || []).reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

        const cropExpenses = data.expenses.filter(e => e.cropId === crop.id);

        const pesticideCost = cropExpenses
            .filter(e => e.category === 'Pesticide Application' || e.paidTo === 'Pesticide' || e.laborType === 'Pesticide Application')
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const laborCost = cropExpenses
            .filter(e => e.category !== 'Pesticide Application' && e.paidTo !== 'Pesticide' && e.laborType !== 'Pesticide Application')
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const totalCost = seedCost + laborCost + pesticideCost;
        const margin = revenue - totalCost;
        return { seedCost, laborCost, pesticideCost, totalCost, revenue, margin };
    };

    const stats = getTotalStats();

    const getStatusColor = (status) => {
        switch (status) {
            case 'Growing': return 'bg-green-100 text-green-700';
            case 'Harvested': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    // Handlers
    const openCropModal = (crop = null) => {
        if (crop) {
            setCropForm(crop);
            setIsEditMode(true);
        } else {
            setCropForm({
                name: '',
                variety: '',
                seedCost: '',
                plantedDate: new Date().toISOString().split('T')[0],
                status: 'Growing'
            });
            setIsEditMode(false);
        }
        setIsCropModalOpen(true);
    };

    const handleCropSubmit = (e) => {
        e.preventDefault();
        if (isEditMode) {
            updateCrop(cropForm.id, cropForm);
        } else {
            addCrop(cropForm);
        }
        setIsCropModalOpen(false);
    };

    const handleSaleSubmit = (e) => {
        e.preventDefault();
        addCropSale(selectedCrop.id, saleForm);
        setIsSaleModalOpen(false);
        setSaleForm({
            date: new Date().toISOString().split('T')[0],
            quantity: '',
            unit: 'kg',
            amount: ''
        });
    };

    const handleLaborSubmit = (e) => {
        e.preventDefault();
        addCropExpense(selectedCrop.id, {
            date: laborForm.date,
            laborType: laborForm.laborType,
            description: laborForm.description,
            amount: Number(laborForm.amount),
            paidTo: 'Labor'
        });
        setIsLaborModalOpen(false);
        setLaborForm({
            date: new Date().toISOString().split('T')[0],
            laborType: 'Sowing',
            description: '',
            amount: ''
        });
    };

    const handlePesticideSubmit = (e) => {
        e.preventDefault();
        const pestName = pesticideForm.pesticideName === 'Other' ? pesticideForm.otherName : pesticideForm.pesticideName;
        if (!pestName) {
            alert('Please select or enter a pesticide name');
            return;
        }

        const pestRecord = {
            id: Date.now().toString(),
            date: pesticideForm.date,
            name: pestName,
            quantity: pesticideForm.quantity,
            unit: pesticideForm.unit,
            cost: Number(pesticideForm.cost) || 0,
            notes: pesticideForm.notes
        };

        const updatedPesticides = [...(selectedCrop.pesticides || []), pestRecord];
        updateCrop(selectedCrop.id, { ...selectedCrop, pesticides: updatedPesticides });

        if (pesticideForm.cost) {
            addCropExpense(selectedCrop.id, {
                date: pesticideForm.date,
                laborType: 'Pesticide Application',
                description: pestName,
                amount: Number(pesticideForm.cost),
                paidTo: 'Pesticide'
            });
        }

        setIsPesticideModalOpen(false);
        setPesticideForm({
            date: new Date().toISOString().split('T')[0],
            pesticideName: '',
            otherName: '',
            quantity: '',
            unit: 'liters',
            cost: '',
            notes: ''
        });
    };

    // --- CROP LIST VIEW ---
    if (!selectedCrop) {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Agriculture Management</h1>
                        <p className="text-gray-500 mt-1">Track crops, labor costs, and revenue.</p>
                    </div>
                    <button
                        onClick={() => openCropModal()}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-green-200 transition-all font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        Add Crop
                    </button>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
                    >
                        <p className="text-xs text-gray-500 uppercase">Total Expenditure</p>
                        <p className="text-lg font-bold text-red-600">₹ {stats.totalExpenditure.toLocaleString()}</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
                    >
                        <p className="text-xs text-gray-500 uppercase">Seeds Cost</p>
                        <p className="text-lg font-bold">₹ {stats.totalSeedCost.toLocaleString()}</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
                    >
                        <p className="text-xs text-gray-500 uppercase">Labor Cost</p>
                        <p className="text-lg font-bold text-orange-600">₹ {stats.totalLaborCost.toLocaleString()}</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
                    >
                        <p className="text-xs text-gray-500 uppercase">Revenue</p>
                        <p className="text-lg font-bold text-green-600">₹ {stats.totalRevenue.toLocaleString()}</p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
                    >
                        <p className="text-xs text-gray-500 uppercase">Profit Margin</p>
                        <p className={`text-lg font-bold ${stats.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹ {stats.margin.toLocaleString()}
                        </p>
                    </motion.div>
                </div>

                {/* Crops Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.crops.length > 0 ? (
                        data.crops.map(crop => {
                            const cropStats = getCropStats(crop);
                            return (
                                <motion.div
                                    whileHover={{ y: -5 }}
                                    key={crop.id}
                                    onClick={() => setSelectedCropId(crop.id)}
                                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <Leaf className="w-5 h-5 text-green-500" />
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-800">{crop.name}</h3>
                                                <span className="text-sm text-gray-500">{crop.variety}</span>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getStatusColor(crop.status)}`}>
                                            {crop.status}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Planted</span>
                                            <span className="font-medium">{crop.plantedDate}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Seed Cost</span>
                                            <span className="font-medium">₹ {cropStats.seedCost.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Revenue</span>
                                            <span className="font-medium text-green-600">₹ {cropStats.revenue.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-gray-100">
                                            <span className="text-gray-500">Margin</span>
                                            <span className={`font-bold ${cropStats.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                ₹ {cropStats.margin.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                            <Leaf className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No crops found. Add one to get started!</p>
                        </div>
                    )}
                </div>

                {/* Add/Edit Crop Modal */}
                <Modal isOpen={isCropModalOpen} onClose={() => setIsCropModalOpen(false)} title={isEditMode ? "Edit Crop" : "Add New Crop"}>
                    <form onSubmit={handleCropSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Crop Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g., Tomato"
                                    value={cropForm.name}
                                    onChange={e => setCropForm({ ...cropForm, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Variety</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Roma"
                                    value={cropForm.variety}
                                    onChange={e => setCropForm({ ...cropForm, variety: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Seed Cost (₹)</label>
                                <input
                                    required
                                    type="number"
                                    placeholder="0"
                                    value={cropForm.seedCost}
                                    onChange={e => setCropForm({ ...cropForm, seedCost: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Planted Date</label>
                                <input
                                    required
                                    type="date"
                                    value={cropForm.plantedDate}
                                    onChange={e => setCropForm({ ...cropForm, plantedDate: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={cropForm.status}
                                onChange={e => setCropForm({ ...cropForm, status: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                            >
                                <option value="Growing">Growing</option>
                                <option value="Harvested">Harvested</option>
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors">
                            {isEditMode ? 'Update Crop' : 'Add Crop'}
                        </button>
                    </form>
                </Modal>
            </div>
        );
    }

    // --- CROP DETAIL VIEW ---
    const cropStats = getCropStats(selectedCrop);
    const cropExpenses = data.expenses.filter(e => e.cropId === selectedCrop.id);

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <button onClick={() => setSelectedCropId(null)} className="flex items-center text-gray-500 hover:text-gray-800 font-medium">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Crops
            </button>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex items-center gap-3">
                    <Leaf className="w-8 h-8 text-green-500" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{selectedCrop.name}</h1>
                        <p className="text-gray-500">{selectedCrop.variety} • Planted: {selectedCrop.plantedDate}</p>
                    </div>
                    <button onClick={() => openCropModal(selectedCrop)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    {isSuperAdmin && (
                        <button onClick={handleDeleteCrop} className="p-2 text-gray-400 hover:bg-red-100 hover:text-red-600 rounded-full">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <span className={`px-4 py-2 rounded-xl text-sm font-bold h-fit ${getStatusColor(selectedCrop.status)}`}>
                    {selectedCrop.status}
                </span>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Seed Cost</p>
                    <p className="text-lg font-bold">₹ {cropStats.seedCost.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Labor Cost</p>
                    <p className="text-lg font-bold text-orange-600">₹ {cropStats.laborCost.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Pesticide Cost</p>
                    <p className="text-lg font-bold text-yellow-600">₹ {cropStats.pesticideCost.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Total Cost</p>
                    <p className="text-lg font-bold text-red-600">₹ {cropStats.totalCost.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Revenue</p>
                    <p className="text-lg font-bold text-green-600">₹ {cropStats.revenue.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Margin</p>
                    <p className={`text-lg font-bold ${cropStats.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹ {cropStats.margin.toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Tab Buttons */}
            <div className="flex gap-2 border-b border-gray-200 pb-2">
                <button
                    onClick={() => setCropTab('sales')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${cropTab === 'sales' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <Wallet className="w-4 h-4" /> Sales
                </button>
                <button
                    onClick={() => setCropTab('labor')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${cropTab === 'labor' ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <Shovel className="w-4 h-4" /> Labor
                </button>
                <button
                    onClick={() => setCropTab('pesticides')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${cropTab === 'pesticides' ? 'bg-yellow-100 text-yellow-700' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                    <Bug className="w-4 h-4" /> Pesticides
                </button>
            </div>

            {/* Tab Content */}
            {cropTab === 'sales' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-green-500" /> Sales
                        </h3>
                        <button
                            onClick={() => setIsSaleModalOpen(true)}
                            className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 flex items-center gap-1 font-medium"
                        >
                            <Plus className="w-3 h-3" /> Add Sale
                        </button>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {(selectedCrop.sales || []).length > 0 ? (
                            (selectedCrop.sales || []).map((sale, i) => (
                                <div key={i} className="p-4 border-b border-gray-100 last:border-0 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-gray-800">{sale.date}</p>
                                        <p className="text-xs text-gray-500">{sale.quantity} {sale.unit}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-green-600">+ ₹ {Number(sale.amount).toLocaleString()}</span>
                                        {isSuperAdmin && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Delete this sale record?')) {
                                                        deleteCropSale(selectedCrop.id, sale.id);
                                                    }
                                                }}
                                                className="text-gray-400 hover:text-red-500"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-400">No sales recorded yet</div>
                        )}
                    </div>
                </div>
            )}

            {/* Labor Expenses Section */}
            {cropTab === 'labor' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Shovel className="w-5 h-5 text-orange-500" /> Labor Expenses
                        </h3>
                        <button
                            onClick={() => setIsLaborModalOpen(true)}
                            className="text-xs bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-100 flex items-center gap-1 font-medium"
                        >
                            <Plus className="w-3 h-3" /> Add Labor
                        </button>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {cropExpenses.length > 0 ? (
                            cropExpenses.map((exp, i) => (
                                <div key={i} className="p-4 border-b border-gray-100 last:border-0 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-gray-800">{exp.category}</p>
                                        <p className="text-xs text-gray-500">{exp.date}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-red-500">- ₹ {Number(exp.amount).toLocaleString()}</span>
                                        {isSuperAdmin && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Delete this expense record?')) {
                                                        deleteExpense(exp.id);
                                                    }
                                                }}
                                                className="text-gray-400 hover:text-red-500"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-400">No labor expenses recorded yet</div>
                        )}
                    </div>
                </div>
            )}

            {/* Pesticides Section */}
            {cropTab === 'pesticides' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Bug className="w-5 h-5 text-yellow-500" /> Pesticides
                        </h3>
                        <button
                            onClick={() => setIsPesticideModalOpen(true)}
                            className="text-xs bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg hover:bg-yellow-100 flex items-center gap-1 font-medium"
                        >
                            <Plus className="w-3 h-3" /> Add Pesticide
                        </button>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {(selectedCrop.pesticides || []).length > 0 ? (
                            (selectedCrop.pesticides || []).map((pest, i) => (
                                <div key={i} className="p-4 border-b border-gray-100 last:border-0 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-gray-800">{pest.name}</p>
                                        <p className="text-xs text-gray-500">{pest.date} • {pest.quantity} {pest.unit}</p>
                                        {pest.notes && <p className="text-xs text-gray-400 mt-1">{pest.notes}</p>}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-red-500">- ₹ {Number(pest.cost).toLocaleString()}</span>
                                        {isSuperAdmin && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm('Delete this pesticide record?')) {
                                                        const updatedPesticides = (selectedCrop.pesticides || []).filter(p => p.id !== pest.id);
                                                        updateCrop(selectedCrop.id, { ...selectedCrop, pesticides: updatedPesticides });
                                                    }
                                                }}
                                                className="text-gray-400 hover:text-red-500"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-400">No pesticide applications recorded yet</div>
                        )}
                    </div>
                </div>
            )}

            {/* Add Sale Modal */}
            <Modal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} title="Record Sale">
                <form onSubmit={handleSaleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            required
                            type="date"
                            value={saleForm.date}
                            onChange={e => setSaleForm({ ...saleForm, date: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                                required
                                type="number"
                                placeholder="0"
                                value={saleForm.quantity}
                                onChange={e => setSaleForm({ ...saleForm, quantity: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                            <select
                                value={saleForm.unit}
                                onChange={e => setSaleForm({ ...saleForm, unit: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                            >
                                <option value="kg">kg</option>
                                <option value="quintal">Quintal</option>
                                <option value="pieces">Pieces</option>
                                <option value="bundles">Bundles</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount Received (₹)</label>
                        <input
                            required
                            type="number"
                            placeholder="0"
                            value={saleForm.amount}
                            onChange={e => setSaleForm({ ...saleForm, amount: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                        />
                    </div>
                    <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors">
                        Record Sale
                    </button>
                </form>
            </Modal>

            {/* Add Labor Modal */}
            <Modal isOpen={isLaborModalOpen} onClose={() => setIsLaborModalOpen(false)} title="Add Labor Expense">
                <form onSubmit={handleLaborSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            required
                            type="date"
                            value={laborForm.date}
                            onChange={e => setLaborForm({ ...laborForm, date: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Labor Type</label>
                        <select
                            value={laborForm.laborType}
                            onChange={e => setLaborForm({ ...laborForm, laborType: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-orange-500/20"
                        >
                            {LABOR_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                        <input
                            type="text"
                            placeholder="Additional details..."
                            value={laborForm.description}
                            onChange={e => setLaborForm({ ...laborForm, description: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                        <input
                            required
                            type="number"
                            placeholder="0"
                            value={laborForm.amount}
                            onChange={e => setLaborForm({ ...laborForm, amount: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-orange-500/20"
                        />
                    </div>
                    <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors">
                        Add Labor Expense
                    </button>
                </form>
            </Modal>

            {/* Add Pesticide Modal */}
            <Modal isOpen={isPesticideModalOpen} onClose={() => setIsPesticideModalOpen(false)} title="Add Pesticide Application">
                <form onSubmit={handlePesticideSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            required
                            type="date"
                            value={pesticideForm.date}
                            onChange={e => setPesticideForm({ ...pesticideForm, date: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-yellow-500/20"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pesticide Name</label>
                        <select
                            value={pesticideForm.pesticideName}
                            onChange={e => setPesticideForm({ ...pesticideForm, pesticideName: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-yellow-500/20"
                        >
                            <option value="">Select Pesticide...</option>
                            {(settings?.pesticideNames || []).map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    {pesticideForm.pesticideName === 'Other' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Enter Pesticide Name</label>
                            <input
                                required
                                type="text"
                                placeholder="Enter pesticide name..."
                                value={pesticideForm.otherName}
                                onChange={e => setPesticideForm({ ...pesticideForm, otherName: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-yellow-500/20"
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                                type="number"
                                step="0.1"
                                placeholder="0"
                                value={pesticideForm.quantity}
                                onChange={e => setPesticideForm({ ...pesticideForm, quantity: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-yellow-500/20"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                            <select
                                value={pesticideForm.unit}
                                onChange={e => setPesticideForm({ ...pesticideForm, unit: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-yellow-500/20"
                            >
                                <option value="liters">Liters</option>
                                <option value="ml">ML</option>
                                <option value="kg">KG</option>
                                <option value="grams">Grams</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost (₹)</label>
                        <input
                            type="number"
                            placeholder="0"
                            value={pesticideForm.cost}
                            onChange={e => setPesticideForm({ ...pesticideForm, cost: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-yellow-500/20"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                        <input
                            type="text"
                            placeholder="Additional details..."
                            value={pesticideForm.notes}
                            onChange={e => setPesticideForm({ ...pesticideForm, notes: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-yellow-500/20"
                        />
                    </div>
                    <button type="submit" className="w-full bg-yellow-600 text-white py-3 rounded-xl font-bold hover:bg-yellow-700 transition-colors">
                        Add Pesticide Record
                    </button>
                </form>
            </Modal>

            {/* Edit Crop Modal (reused) */}
            <Modal isOpen={isCropModalOpen} onClose={() => setIsCropModalOpen(false)} title="Edit Crop">
                <form onSubmit={handleCropSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Crop Name</label>
                            <input
                                required
                                type="text"
                                value={cropForm.name}
                                onChange={e => setCropForm({ ...cropForm, name: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Variety</label>
                            <input
                                type="text"
                                value={cropForm.variety}
                                onChange={e => setCropForm({ ...cropForm, variety: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={cropForm.status}
                            onChange={e => setCropForm({ ...cropForm, status: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-green-500/20"
                        >
                            <option value="Growing">Growing</option>
                            <option value="Harvested">Harvested</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors">
                        Update Crop
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Agriculture;


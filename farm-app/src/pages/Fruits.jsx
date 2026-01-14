import React, { useState } from 'react';
import { Plus, Apple, ArrowLeft, Edit2, Trash2, Wallet, Shovel } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';

const Fruits = () => {
    const { data, addFruit, updateFruit, deleteFruit, addFruitSale, addExpense } = useData();
    const { isSuperAdmin } = useAuth();
    // ... existing code ...

    const handleDeleteFruit = async () => {
        if (!isSuperAdmin) return;
        if (window.confirm('Are you sure you want to delete this fruit? This action cannot be undone.')) {
            await deleteFruit(selectedFruit.id);
            setSelectedFruitId(null);
        }
    };

    // ... inside render ...
    {/* Header */ }
    <div className="flex flex-col md:flex-row justify-between gap-6">
        <div className="flex items-center gap-3">
            <Apple className="w-8 h-8 text-red-500" />
            <div>
                <h1 className="text-3xl font-bold text-gray-900">{selectedFruit.name}</h1>
                <p className="text-gray-500">{selectedFruit.variety} • Planted: {selectedFruit.plantedDate}</p>
            </div>
            <button onClick={() => openFruitModal(selectedFruit)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                <Edit2 className="w-4 h-4" />
            </button>
            {isSuperAdmin && (
                <button onClick={handleDeleteFruit} className="p-2 text-red-300 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors" title="Delete Fruit">
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
        <span className={`px-4 py-2 rounded-xl text-sm font-bold h-fit ${getStatusColor(selectedFruit.status)}`}>
            {selectedFruit.status}
        </span>
    </div>

    // Modals
    const [isFruitModalOpen, setIsFruitModalOpen] = useState(false);
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Forms
    const [fruitForm, setFruitForm] = useState({
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
        laborType: 'Planting',
        description: '',
        amount: ''
    });

    const fruits = data.fruits || [];
    const selectedFruit = fruits.find(f => f.id === selectedFruitId);

    // Calculate stats
    const getTotalStats = () => {
        let totalSeedCost = 0;
        let totalLaborCost = 0;
        let totalRevenue = 0;

        fruits.forEach(fruit => {
            totalSeedCost += Number(fruit.seedCost) || 0;
            totalRevenue += (fruit.sales || []).reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        });

        // Get labor costs from expenses linked to fruits
        data.expenses.forEach(exp => {
            if (exp.fruitId) {
                totalLaborCost += Number(exp.amount) || 0;
            }
        });

        const totalExpenditure = totalSeedCost + totalLaborCost;
        const margin = totalRevenue - totalExpenditure;

        return { totalSeedCost, totalLaborCost, totalExpenditure, totalRevenue, margin };
    };

    const getFruitStats = (fruit) => {
        const seedCost = Number(fruit.seedCost) || 0;
        const revenue = (fruit.sales || []).reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        const laborCost = data.expenses
            .filter(e => e.fruitId === fruit.id)
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const totalCost = seedCost + laborCost;
        const margin = revenue - totalCost;
        return { seedCost, laborCost, totalCost, revenue, margin };
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
    const openFruitModal = (fruit = null) => {
        if (fruit) {
            setFruitForm(fruit);
            setIsEditMode(true);
        } else {
            setFruitForm({
                name: '',
                variety: '',
                seedCost: '',
                plantedDate: new Date().toISOString().split('T')[0],
                status: 'Growing'
            });
            setIsEditMode(false);
        }
        setIsFruitModalOpen(true);
    };

    const handleFruitSubmit = (e) => {
        e.preventDefault();
        if (isEditMode) {
            updateFruit(fruitForm.id, fruitForm);
        } else {
            addFruit(fruitForm);
        }
        setIsFruitModalOpen(false);
    };

    const handleSaleSubmit = (e) => {
        e.preventDefault();
        addFruitSale(selectedFruit.id, saleForm);
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
        addExpense({
            date: laborForm.date,
            category: laborForm.laborType,
            description: `${selectedFruit?.name || 'Fruit'}: ${laborForm.description || laborForm.laborType}`,
            amount: Number(laborForm.amount),
            paidTo: 'Labor',
            fruitId: selectedFruit.id
        });
        setIsLaborModalOpen(false);
        setLaborForm({
            date: new Date().toISOString().split('T')[0],
            laborType: 'Planting',
            description: '',
            amount: ''
        });
    };

    // --- FRUIT LIST VIEW ---
    if (!selectedFruit) {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">🍎 Fruits Management</h1>
                        <p className="text-gray-500 mt-1">Track fruit trees/plants, labor costs, and revenue.</p>
                    </div>
                    <button
                        onClick={() => openFruitModal()}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-red-200 transition-all font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        Add Fruit
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
                        <p className="text-xs text-gray-500 uppercase">Plants Cost</p>
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

                {/* Fruits Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {fruits.length > 0 ? (
                        fruits.map(fruit => {
                            const fruitStats = getFruitStats(fruit);
                            return (
                                <motion.div
                                    whileHover={{ y: -5 }}
                                    key={fruit.id}
                                    onClick={() => setSelectedFruitId(fruit.id)}
                                    className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <Apple className="w-5 h-5 text-red-500" />
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-800">{fruit.name}</h3>
                                                <span className="text-sm text-gray-500">{fruit.variety}</span>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getStatusColor(fruit.status)}`}>
                                            {fruit.status}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Planted</span>
                                            <span className="font-medium">{fruit.plantedDate}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Plant Cost</span>
                                            <span className="font-medium">₹ {fruitStats.seedCost.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Revenue</span>
                                            <span className="font-medium text-green-600">₹ {fruitStats.revenue.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-gray-100">
                                            <span className="text-gray-500">Margin</span>
                                            <span className={`font-bold ${fruitStats.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                ₹ {fruitStats.margin.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                            <Apple className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No fruits found. Add one to get started!</p>
                        </div>
                    )}
                </div>

                {/* Add/Edit Fruit Modal */}
                <Modal isOpen={isFruitModalOpen} onClose={() => setIsFruitModalOpen(false)} title={isEditMode ? "Edit Fruit" : "Add New Fruit"}>
                    <form onSubmit={handleFruitSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fruit Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g., Mango"
                                    value={fruitForm.name}
                                    onChange={e => setFruitForm({ ...fruitForm, name: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-red-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Variety</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Alphonso"
                                    value={fruitForm.variety}
                                    onChange={e => setFruitForm({ ...fruitForm, variety: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-red-500/20"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Plant Cost (₹)</label>
                                <input
                                    required
                                    type="number"
                                    placeholder="0"
                                    value={fruitForm.seedCost}
                                    onChange={e => setFruitForm({ ...fruitForm, seedCost: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-red-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Planted Date</label>
                                <input
                                    required
                                    type="date"
                                    value={fruitForm.plantedDate}
                                    onChange={e => setFruitForm({ ...fruitForm, plantedDate: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-red-500/20"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={fruitForm.status}
                                onChange={e => setFruitForm({ ...fruitForm, status: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-red-500/20"
                            >
                                <option value="Growing">Growing</option>
                                <option value="Harvested">Harvested</option>
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
                            {isEditMode ? 'Update Fruit' : 'Add Fruit'}
                        </button>
                    </form>
                </Modal>
            </div>
        );
    }

    // --- FRUIT DETAIL VIEW ---
    const fruitStats = getFruitStats(selectedFruit);
    const fruitExpenses = data.expenses.filter(e => e.fruitId === selectedFruit.id);

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <button onClick={() => setSelectedFruitId(null)} className="flex items-center text-gray-500 hover:text-gray-800 font-medium">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Fruits
            </button>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex items-center gap-3">
                    <Apple className="w-8 h-8 text-red-500" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{selectedFruit.name}</h1>
                        <p className="text-gray-500">{selectedFruit.variety} • Planted: {selectedFruit.plantedDate}</p>
                    </div>
                    <button onClick={() => openFruitModal(selectedFruit)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full">
                        <Edit2 className="w-4 h-4" />
                    </button>
                </div>
                <span className={`px-4 py-2 rounded-xl text-sm font-bold h-fit ${getStatusColor(selectedFruit.status)}`}>
                    {selectedFruit.status}
                </span>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Plant Cost</p>
                    <p className="text-lg font-bold">₹ {fruitStats.seedCost.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Labor Cost</p>
                    <p className="text-lg font-bold text-orange-600">₹ {fruitStats.laborCost.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Total Cost</p>
                    <p className="text-lg font-bold text-red-600">₹ {fruitStats.totalCost.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Revenue</p>
                    <p className="text-lg font-bold text-green-600">₹ {fruitStats.revenue.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase">Margin</p>
                    <p className={`text-lg font-bold ${fruitStats.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹ {fruitStats.margin.toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Section */}
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
                        {(selectedFruit.sales || []).length > 0 ? (
                            (selectedFruit.sales || []).map((sale, i) => (
                                <div key={i} className="p-4 border-b border-gray-100 last:border-0 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-gray-800">{sale.date}</p>
                                        <p className="text-xs text-gray-500">{sale.quantity} {sale.unit}</p>
                                    </div>
                                    <span className="font-bold text-green-600">+ ₹ {Number(sale.amount).toLocaleString()}</span>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-400">No sales recorded yet</div>
                        )}
                    </div>
                </div>

                {/* Labor Expenses Section */}
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
                        {fruitExpenses.length > 0 ? (
                            fruitExpenses.map((exp, i) => (
                                <div key={i} className="p-4 border-b border-gray-100 last:border-0 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-gray-800">{exp.category}</p>
                                        <p className="text-xs text-gray-500">{exp.date}</p>
                                    </div>
                                    <span className="font-bold text-red-500">- ₹ {Number(exp.amount).toLocaleString()}</span>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-400">No labor expenses recorded yet</div>
                        )}
                    </div>
                </div>
            </div>

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
                                <option value="dozen">Dozen</option>
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

            {/* Edit Fruit Modal (reused) */}
            <Modal isOpen={isFruitModalOpen} onClose={() => setIsFruitModalOpen(false)} title="Edit Fruit">
                <form onSubmit={handleFruitSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fruit Name</label>
                            <input
                                required
                                type="text"
                                value={fruitForm.name}
                                onChange={e => setFruitForm({ ...fruitForm, name: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-red-500/20"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Variety</label>
                            <input
                                type="text"
                                value={fruitForm.variety}
                                onChange={e => setFruitForm({ ...fruitForm, variety: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-red-500/20"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={fruitForm.status}
                            onChange={e => setFruitForm({ ...fruitForm, status: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-red-500/20"
                        >
                            <option value="Growing">Growing</option>
                            <option value="Harvested">Harvested</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
                        Update Fruit
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Fruits;

import React, { useState } from 'react';
import { Plus, TrendingDown, Filter, Calendar, Trash2, Users, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const Expenses = () => {
    const { data, addExpense, addYearlyExpense, deleteYearlyExpense, deleteExpense, updateExpense, updateYearlyExpense } = useData();
    const { isSuperAdmin } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isYearlyModalOpen, setIsYearlyModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('regular'); // 'regular' or 'yearly'
    const [filterBatchId, setFilterBatchId] = useState('all');
    const [editingExpense, setEditingExpense] = useState(null);
    const [editingYearlyExpense, setEditingYearlyExpense] = useState(null);

    const [newExpense, setNewExpense] = useState({
        date: new Date().toISOString().split('T')[0],
        category: 'Feed',
        description: '',
        amount: '',
        paidTo: '',
        batchId: ''
    });

    const [newYearlyExpense, setNewYearlyExpense] = useState({
        name: '',
        description: '',
        amount: '',
        startDate: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingExpense) {
            // Edit mode
            updateExpense(editingExpense.id, {
                ...newExpense,
                amount: parseFloat(newExpense.amount)
            });
            setEditingExpense(null);
        } else {
            // Add mode
            addExpense({
                ...newExpense,
                amount: parseFloat(newExpense.amount)
            });
        }
        setIsModalOpen(false);
        setNewExpense({
            date: new Date().toISOString().split('T')[0],
            category: 'Feed',
            description: '',
            amount: '',
            paidTo: '',
            batchId: ''
        });
    };

    const openEditModal = (expense) => {
        setEditingExpense(expense);
        setNewExpense({
            date: expense.date || new Date().toISOString().split('T')[0],
            category: expense.category || 'Feed',
            description: expense.description || '',
            amount: expense.amount?.toString() || '',
            paidTo: expense.paidTo || '',
            batchId: expense.batchId || ''
        });
        setIsModalOpen(true);
    };

    const handleAddYearly = (e) => {
        e.preventDefault();
        if (editingYearlyExpense) {
            updateYearlyExpense(editingYearlyExpense.id, {
                ...newYearlyExpense,
                amount: parseFloat(newYearlyExpense.amount)
            });
            setEditingYearlyExpense(null);
        } else {
            addYearlyExpense({
                ...newYearlyExpense,
                amount: parseFloat(newYearlyExpense.amount)
            });
        }
        setIsYearlyModalOpen(false);
        setNewYearlyExpense({
            name: '',
            description: '',
            amount: '',
            startDate: new Date().toISOString().split('T')[0]
        });
    };

    const openEditYearlyModal = (expense) => {
        setEditingYearlyExpense(expense);
        setNewYearlyExpense({
            name: expense.name,
            description: expense.description || '',
            amount: expense.amount?.toString() || '',
            startDate: expense.startDate || new Date().toISOString().split('T')[0]
        });
        setIsYearlyModalOpen(true);
    };

    // Calculate total expenses for current month
    const currentMonth = new Date().getMonth();

    // 1. Regular Expenses
    const regularExpenses = data.expenses
        .filter(e => new Date(e.date).getMonth() === currentMonth)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

    // 2. Yearly Expenses (Monthly Portion)
    const yearlyMonthly = (data.yearlyExpenses || [])
        .reduce((sum, e) => sum + (e.monthlyAmount || Math.round(e.amount / 12) || 0), 0);

    // 3. Employee Salaries (Monthly)
    const monthlySalaries = (data.employees || [])
        .filter(e => e.status === 'Active')
        .reduce((sum, e) => sum + (Number(e.salary) || 0), 0);

    const totalMonthlyExpenses = regularExpenses + yearlyMonthly + monthlySalaries;

    // Filter expenses by batch
    const filteredExpenses = filterBatchId === 'all'
        ? data.expenses
        : data.expenses.filter(e => e.batchId === filterBatchId);

    // Helper to get batch name by id
    const getBatchName = (batchId, cropId) => {
        if (cropId) {
            const crop = data.crops.find(c => c.id === cropId);
            return crop ? `🌱 ${crop.name}` : 'Crop';
        }
        if (!batchId) return 'General';
        const batch = data.batches.find(b => b.id === batchId);
        return batch ? `${batch.name} (${batch.type})` : 'Unknown';
    };

    const navigate = useNavigate();

    // Navigate to batch or crop detail
    const handleBatchClick = (expense, e) => {
        e.stopPropagation();
        if (expense.cropId) {
            navigate('/agriculture');
        } else if (expense.batchId) {
            navigate('/livestock');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Expense Tracking</h1>
                    <p className="text-gray-500 mt-1">Manage farm operational costs.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setIsYearlyModalOpen(true); setEditingYearlyExpense(null); }}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-blue-200 transition-all font-medium"
                    >
                        <Calendar className="w-5 h-5" />
                        Add Yearly
                    </button>
                    <button
                        onClick={() => { setIsModalOpen(true); setEditingExpense(null); }}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-red-200 transition-all font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        Add Expense
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('regular')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'regular' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Regular Expenses
                </button>
                <button
                    onClick={() => setActiveTab('yearly')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'yearly' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    📅 Yearly Expenses
                </button>
            </div>

            {activeTab === 'regular' ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-red-50 rounded-xl text-red-600">
                                <TrendingDown className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Monthly</p>
                                <h3 className="text-xl font-bold text-gray-800">₹ {totalMonthlyExpenses.toLocaleString()}</h3>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Staff Salaries</p>
                                <h3 className="text-xl font-bold text-orange-600">₹ {monthlySalaries.toLocaleString()}</h3>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                                <Calendar className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Yearly Split</p>
                                <h3 className="text-xl font-bold text-blue-600">₹ {yearlyMonthly.toLocaleString()}</h3>
                            </div>
                        </div>

                        {/* Batch Filter */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-gray-50 rounded-xl text-gray-600">
                                <Filter className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-500 mb-1">Filter by Batch</p>
                                <select
                                    value={filterBatchId}
                                    onChange={e => setFilterBatchId(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-gray-50 rounded-lg border-none outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                                >
                                    <option value="all">All Expenses</option>
                                    <option value="">General (No Batch)</option>
                                    {data.batches.map(batch => (
                                        <option key={batch.id} value={batch.id}>
                                            {batch.name} ({batch.type})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <Table
                        headers={['ID', 'Date', 'Batch', 'Category', 'Description', 'Paid To', 'Amount', ...(isSuperAdmin ? ['Action'] : [])]}
                        data={filteredExpenses}
                        renderRow={(item) => (
                            <>
                                <td className="px-6 py-4 font-medium text-gray-900">{item.id}</td>
                                <td className="px-6 py-4">{item.date}</td>
                                <td className="px-6 py-4">
                                    {(item.batchId || item.cropId) ? (
                                        <button
                                            onClick={(e) => handleBatchClick(item, e)}
                                            className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${item.cropId ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}
                                        >
                                            {getBatchName(item.batchId, item.cropId)} →
                                        </button>
                                    ) : (
                                        <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-600">
                                            General
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-600">{item.category}</span>
                                </td>
                                <td className="px-6 py-4">{item.description}</td>
                                <td className="px-6 py-4">{item.paidTo}</td>
                                <td className="px-6 py-4 font-bold text-red-600">- ₹ {item.amount.toLocaleString()}</td>
                                {isSuperAdmin && (
                                    <td className="px-6 py-4 flex gap-2">
                                        <button
                                            onClick={() => openEditModal(item)}
                                            className="text-gray-400 hover:text-blue-600 transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (window.confirm('Delete this expense?')) {
                                                    deleteExpense(item.id);
                                                }
                                            }}
                                            className="text-gray-400 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                )}
                            </>
                        )}
                    />
                </>
            ) : (
                /* Yearly Expenses Tab */
                <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <p className="text-blue-700 text-sm">
                            💡 Yearly expenses (like land lease, insurance) are automatically divided by 12 and added to your monthly expense calculations.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(data.yearlyExpenses || []).length > 0 ? (
                            (data.yearlyExpenses || []).map(expense => (
                                <div key={expense.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-gray-800">{expense.name}</h3>
                                            <p className="text-xs text-gray-500">{expense.description}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => openEditYearlyModal(expense)}
                                                className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => deleteYearlyExpense(expense.id)}
                                                className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Annual Amount</span>
                                            <span className="font-bold text-red-600">₹ {Number(expense.amount).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Monthly Split</span>
                                            <span className="font-bold text-blue-600">₹ {(expense.monthlyAmount || Math.round(expense.amount / 12)).toLocaleString()}/mo</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-400">Started</span>
                                            <span className="text-gray-500">{expense.startDate}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No yearly expenses added yet.</p>
                                <p className="text-sm mt-1">Add expenses like land lease, insurance, etc.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Add/Edit Regular Expense Modal */}
            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingExpense(null); }} title={editingExpense ? "Edit Expense" : "Add Expense"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="date"
                                required
                                value={newExpense.date}
                                onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-red-500/20"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                            <input
                                type="number"
                                required
                                placeholder="0.00"
                                value={newExpense.amount}
                                onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-red-500/20"
                            />
                        </div>
                    </div>

                    {/* Batch Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Link to Batch (Optional)</label>
                        <select
                            value={newExpense.batchId}
                            onChange={e => setNewExpense({ ...newExpense, batchId: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-red-500/20"
                        >
                            <option value="">General (No Batch)</option>
                            {data.batches.map(batch => (
                                <option key={batch.id} value={batch.id}>
                                    {batch.name} ({batch.type})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                            value={newExpense.category}
                            onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-red-500/20"
                        >
                            <option value="Feed">Feed</option>
                            <option value="Medicine">Medicine</option>
                            <option value="Labor">Labor</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input
                            type="text"
                            placeholder="Details..."
                            value={newExpense.description}
                            onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-red-500/20"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Paid To</label>
                        <input
                            type="text"
                            placeholder="Vendor Name"
                            value={newExpense.paidTo}
                            onChange={e => setNewExpense({ ...newExpense, paidTo: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-red-500/20"
                        />
                    </div>
                    <button type="submit" className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
                        {editingExpense ? 'Update Expense' : 'Save Expense'}
                    </button>
                </form>
            </Modal>

            {/* Add Yearly Expense Modal */}
            <Modal isOpen={isYearlyModalOpen} onClose={() => { setIsYearlyModalOpen(false); setEditingYearlyExpense(null); }} title={editingYearlyExpense ? "Edit Yearly Expense" : "Add Yearly Expense"}>
                <form onSubmit={handleAddYearly} className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700 mb-2">
                        Annual expenses are automatically divided by 12 for monthly calculations.
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expense Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g., Land Lease, Insurance"
                            value={newYearlyExpense.name}
                            onChange={e => setNewYearlyExpense({ ...newYearlyExpense, name: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                        <input
                            type="text"
                            placeholder="Additional details..."
                            value={newYearlyExpense.description}
                            onChange={e => setNewYearlyExpense({ ...newYearlyExpense, description: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Annual Amount (₹)</label>
                            <input
                                type="number"
                                required
                                placeholder="0"
                                value={newYearlyExpense.amount}
                                onChange={e => setNewYearlyExpense({ ...newYearlyExpense, amount: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                required
                                value={newYearlyExpense.startDate}
                                onChange={e => setNewYearlyExpense({ ...newYearlyExpense, startDate: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>
                    {newYearlyExpense.amount && (
                        <div className="bg-gray-50 p-3 rounded-lg text-sm">
                            <span className="text-gray-500">Monthly amount: </span>
                            <span className="font-bold text-blue-600">₹ {Math.round(Number(newYearlyExpense.amount) / 12).toLocaleString()}</span>
                        </div>
                    )}
                    <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                        {editingYearlyExpense ? 'Update Yearly Expense' : 'Save Yearly Expense'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Expenses;

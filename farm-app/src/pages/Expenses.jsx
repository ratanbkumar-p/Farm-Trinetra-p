import React, { useState } from 'react';
import { Plus, TrendingDown } from 'lucide-react';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { useData } from '../context/DataContext';

const Expenses = () => {
    const { data, addExpense } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newExpense, setNewExpense] = useState({
        date: new Date().toISOString().split('T')[0],
        category: 'Feed',
        description: '',
        amount: '',
        paidTo: ''
    });

    const handleAdd = (e) => {
        e.preventDefault();
        addExpense({
            ...newExpense,
            amount: parseFloat(newExpense.amount)
        });
        setIsModalOpen(false);
        setNewExpense({
            date: new Date().toISOString().split('T')[0],
            category: 'Feed',
            description: '',
            amount: '',
            paidTo: ''
        });
    };

    // Calculate total expenses for current month
    const currentMonth = new Date().getMonth();
    const totalExpenses = data.expenses
        .filter(e => new Date(e.date).getMonth() === currentMonth)
        .reduce((sum, e) => sum + (e.amount || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Expense Tracking</h1>
                    <p className="text-gray-500 mt-1">Manage farm operational costs.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-red-200 transition-all font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Add Expense
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-50 rounded-xl text-red-600">
                        <TrendingDown className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Total Expenses (This Month)</p>
                        <h3 className="text-xl font-bold text-gray-800">₹ {totalExpenses.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            <Table
                headers={['ID', 'Date', 'Category', 'Description', 'Paid To', 'Amount']}
                data={data.expenses}
                renderRow={(item) => (
                    <>
                        <td className="px-6 py-4 font-medium text-gray-900">{item.id}</td>
                        <td className="px-6 py-4">{item.date}</td>
                        <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-600">{item.category}</span>
                        </td>
                        <td className="px-6 py-4">{item.description}</td>
                        <td className="px-6 py-4">{item.paidTo}</td>
                        <td className="px-6 py-4 font-bold text-red-600">- ₹ {item.amount.toLocaleString()}</td>
                    </>
                )}
            />

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Expense">
                <form onSubmit={handleAdd} className="space-y-4">
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
                        Save Expense
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Expenses;

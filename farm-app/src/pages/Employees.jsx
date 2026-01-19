import React, { useState } from 'react';
import { Plus, UserCheck, Phone, ChevronDown, ChevronUp, Camera, Upload, CreditCard, Wallet, Calendar, DollarSign, Trash2, ShieldCheck, User, Edit2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '../lib/utils';

const Employees = () => {
    const { data, addEmployee, updateEmployee, addEmployeePayment, deleteEmployeePayment } = useData();
    const { isSuperAdmin } = useAuth();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [expandedId, setExpandedId] = useState(null);
    const [selectedEmployeeForPayment, setSelectedEmployeeForPayment] = useState(null);
    const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState(null);
    const [activeTab, setActiveTab] = useState('details'); // 'details' | 'payments'

    const [newEmployee, setNewEmployee] = useState({
        id: '',
        name: '',
        role: 'Helper',
        phone: '',
        salary: '',
        aadhar: '',
        photo: null,
        status: 'Active'
    });

    const [paymentForm, setPaymentForm] = useState({
        type: 'Salary',
        amount: '',
        month: new Date().toISOString().slice(0, 7), // YYYY-MM
        note: ''
    });

    const [editForm, setEditForm] = useState({
        id: '',
        name: '',
        role: '',
        phone: '',
        salary: '',
        aadhar: '',
        photo: null,
        status: 'Active'
    });

    const handlePhotoUpload = async (e, mode = 'add') => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const compressed = await compressImage(reader.result, 600, 600, 0.6);
                if (mode === 'edit') {
                    setEditForm({ ...editForm, photo: compressed });
                } else {
                    setNewEmployee({ ...newEmployee, photo: compressed });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        await addEmployee({
            ...newEmployee,
            salary: parseFloat(newEmployee.salary),
            payments: []
        });
        setIsAddModalOpen(false);
        setNewEmployee({ id: '', name: '', role: 'Helper', phone: '', salary: '', aadhar: '', photo: null, status: 'Active' });
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        if (selectedEmployeeForPayment) {
            await addEmployeePayment(selectedEmployeeForPayment.id, {
                ...paymentForm,
                amount: parseFloat(paymentForm.amount),
                date: new Date().toISOString()
            });
            setIsPaymentModalOpen(false);
            setPaymentForm({ type: 'Salary', amount: '', month: new Date().toISOString().slice(0, 7), note: '' });
        }
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        if (selectedEmployeeForEdit) {
            await updateEmployee(selectedEmployeeForEdit.id, {
                ...editForm,
                salary: parseFloat(editForm.salary)
            });
            setIsEditModalOpen(false);
            setExpandedId(null);
        }
    };

    const openEditModal = (employee) => {
        setSelectedEmployeeForEdit(employee);
        setEditForm({
            id: employee.id,
            name: employee.name,
            role: employee.role,
            phone: employee.phone || '',
            salary: employee.salary || '',
            aadhar: employee.aadhar || '',
            photo: employee.photo || null,
            status: employee.status || 'Active'
        });
        setIsEditModalOpen(true);
    };

    // Calculation Helpers
    const calculateNetSalary = (employee, targetMonth) => {
        const salary = parseFloat(employee.salary || 0);
        const payments = employee.payments || [];
        const monthlyAdvances = payments
            .filter(p => p.type === 'Advance' && p.month === targetMonth)
            .reduce((sum, p) => sum + p.amount, 0);
        return salary - monthlyAdvances;
    };

    const activeStaff = data.employees.filter(e => e.status === 'Active').length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
                    <p className="text-gray-500 mt-1">Staff details and payroll.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-200 transition-all font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Add Employee
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600 font-bold text-lg">
                        {activeStaff}
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Active Staff</p>
                        <h3 className="text-lg font-bold text-gray-800">Currently Working</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-xl text-green-600">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Monthly Payroll</p>
                        <h3 className="text-lg font-bold text-gray-800">₹ {data.employees.filter(e => e.status === 'Active').reduce((sum, e) => sum + (e.salary || 0), 0).toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            {/* Employee List - Summary Cards */}
            <div className="space-y-4">
                {data.employees.map((employee) => (
                    <div key={employee.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all">
                        {/* Summary View */}

                        <div
                            onClick={() => setExpandedId(expandedId === employee.id ? null : employee.id)}
                            className="p-4 md:p-6 flex items-center justify-between gap-6 cursor-pointer hover:bg-gray-50/50 transition-colors"
                        >
                            <div className="flex items-center gap-6 flex-1">
                                <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl bg-gray-100 overflow-hidden border-2 border-white shadow-md flex-shrink-0 group relative">
                                    {employee.photo ? (
                                        <img src={employee.photo} alt={employee.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50 uppercase">
                                            <User className="w-8 h-8 md:w-12 md:h-12" />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-gray-900">{employee.name}</h3>
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${employee.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {employee.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 font-medium">{employee.role} • ID: <span className="text-blue-600 font-bold">{employee.id}</span></p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="hidden md:block text-right mr-4">
                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">Monthly Salary</p>
                                    <p className="text-lg font-black text-gray-800">₹ {employee.salary?.toLocaleString()}</p>
                                </div>
                                {isSuperAdmin && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openEditModal(employee); }}
                                        className="p-2 hover:bg-blue-50 rounded-xl transition-colors border border-gray-100 text-blue-600 z-10 relative"
                                        title="Edit Employee"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                )}
                                <div className="p-2 rounded-xl border border-gray-100 bg-white">
                                    {expandedId === employee.id ? <ChevronUp className="w-6 h-6 text-gray-400" /> : <ChevronDown className="w-6 h-6 text-gray-400" />}
                                </div>
                            </div>
                        </div>

                        {/* Expanded View */}
                        <AnimatePresence>
                            {expandedId === employee.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-gray-50 bg-gray-50/30"
                                >
                                    <div className="p-4 md:p-6 space-y-6">
                                        {/* Tabs */}
                                        <div className="flex gap-4 border-b border-gray-100 pb-2">
                                            <button
                                                onClick={() => setActiveTab('details')}
                                                className={`pb-2 text-sm font-bold transition-all ${activeTab === 'details' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
                                            >
                                                Identity & Contact
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('payments')}
                                                className={`pb-2 text-sm font-bold transition-all ${activeTab === 'payments' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
                                            >
                                                Payments & Advances
                                            </button>
                                        </div>

                                        {activeTab === 'details' ? (
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                {/* Smaller Photo Preview */}
                                                <div className="md:col-span-1">
                                                    <div className="w-24 h-32 md:w-32 md:h-40 rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm mx-auto md:mx-0">
                                                        {employee.photo ? (
                                                            <img src={employee.photo} alt={employee.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                                                <User className="w-12 h-12" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Aadhar Card</p>
                                                        <p className="text-gray-800 font-bold text-lg flex items-center gap-2">
                                                            <ShieldCheck className="w-5 h-5 text-blue-500" />
                                                            {employee.aadhar || 'Not Provided'}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Primary Contact</p>
                                                        <a
                                                            href={`tel:${employee.phone}`}
                                                            className="text-blue-600 hover:text-blue-700 font-bold text-lg flex items-center gap-2 group/tel transition-colors"
                                                        >
                                                            <Phone className="w-5 h-5 text-green-500 group-hover/tel:scale-110 transition-transform" />
                                                            {employee.phone || 'N/A'}
                                                        </a>
                                                    </div>
                                                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm md:col-span-2">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Employment Since</p>
                                                        <p className="text-gray-800 font-bold text-lg flex items-center gap-2">
                                                            <Calendar className="w-5 h-5 text-amber-500" />
                                                            {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {/* Payroll Header */}
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-100">
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-400 uppercase">Current Month Net (est.)</p>
                                                        <h3 className="text-2xl font-black text-gray-900">
                                                            ₹ {calculateNetSalary(employee, new Date().toISOString().slice(0, 7)).toLocaleString()}
                                                        </h3>
                                                        <p className="text-[10px] text-gray-500 mt-1">
                                                            Monthly Salary (₹{employee.salary?.toLocaleString()}) - Month Advances (₹{(employee.payments || []).filter(p => p.type === 'Advance' && p.month === new Date().toISOString().slice(0, 7)).reduce((sum, p) => sum + p.amount, 0).toLocaleString()})
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2 w-full md:w-auto">
                                                        <button
                                                            onClick={() => { setSelectedEmployeeForPayment(employee); setPaymentForm({ ...paymentForm, type: 'Advance', month: new Date().toISOString().slice(0, 7) }); setIsPaymentModalOpen(true); }}
                                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-amber-50 text-amber-600 px-4 py-2 rounded-xl text-sm font-bold border border-amber-100 transition-all hover:bg-amber-100"
                                                        >
                                                            <Wallet className="w-4 h-4" /> Add Advance
                                                        </button>
                                                        <button
                                                            onClick={() => { setSelectedEmployeeForPayment(employee); setPaymentForm({ ...paymentForm, type: 'Salary', month: new Date().toISOString().slice(0, 7) }); setIsPaymentModalOpen(true); }}
                                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-xl text-sm font-bold border border-green-100 transition-all hover:bg-green-100"
                                                        >
                                                            <CreditCard className="w-4 h-4" /> Log Salary
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Payment History */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                                        <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 uppercase flex justify-between">
                                                            <span>Advances</span>
                                                            <span className="text-amber-600">Total: ₹{(employee.payments || []).filter(p => p.type === 'Advance').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</span>
                                                        </div>
                                                        <div className="divide-y divide-gray-50 max-h-[200px] overflow-y-auto">
                                                            {(employee.payments || []).filter(p => p.type === 'Advance').length > 0 ? (
                                                                (employee.payments || []).filter(p => p.type === 'Advance').sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => (
                                                                    <div key={p.id} className="p-3 flex justify-between items-center group bg-amber-50/20">
                                                                        <div>
                                                                            <p className="text-sm font-bold text-gray-800">₹ {p.amount.toLocaleString()}</p>
                                                                            <p className="text-[10px] text-gray-500">{new Date(p.date).toLocaleDateString()} {p.note && `• ${p.note}`}</p>
                                                                        </div>
                                                                        <button onClick={() => deleteEmployeePayment(employee.id, p.id)} className="p-1.5 text-red-300 hover:text-red-500 transition-all">
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            ) : <p className="p-4 text-center text-xs text-gray-400">No advances yet</p>}
                                                        </div>
                                                    </div>

                                                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                                                        <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 uppercase flex justify-between">
                                                            <span>Salary Logs</span>
                                                            <span className="text-green-600">Paid: ₹{(employee.payments || []).filter(p => p.type === 'Salary').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</span>
                                                        </div>
                                                        <div className="divide-y divide-gray-50 max-h-[200px] overflow-y-auto">
                                                            {(employee.payments || []).filter(p => p.type === 'Salary').length > 0 ? (
                                                                (employee.payments || []).filter(p => p.type === 'Salary').sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => (
                                                                    <div key={p.id} className="p-3 flex justify-between items-center group">
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                <p className="text-sm font-bold text-gray-800">₹ {p.amount.toLocaleString()}</p>
                                                                                <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-bold text-gray-500 uppercase">{p.month}</span>
                                                                            </div>
                                                                            <p className="text-[10px] text-gray-500">{new Date(p.date).toLocaleDateString()}</p>
                                                                        </div>
                                                                        <button onClick={() => deleteEmployeePayment(employee.id, p.id)} className="p-1.5 text-red-300 hover:text-red-500 transition-all">
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            ) : <p className="p-4 text-center text-xs text-gray-400">No salary records</p>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>

            {/* Modal: Add Employee */}
            < Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Employee">
                <form onSubmit={handleAdd} className="space-y-6">
                    {/* Photo Upload Section */}
                    <div className="flex justify-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-blue-400">
                                {newEmployee.photo ? (
                                    <img src={newEmployee.photo} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <Camera className="w-8 h-8 text-gray-300 mb-2" />
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Photo</p>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="user"
                                    onChange={handlePhotoUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                            {newEmployee.photo && (
                                <button type="button" onClick={() => setNewEmployee({ ...newEmployee, photo: null })} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full border border-red-200 shadow-sm transition-all hover:bg-red-200">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Employee ID</label>
                            <input required type="text" placeholder="e.g., E101" value={newEmployee.id} onChange={e => setNewEmployee({ ...newEmployee, id: e.target.value.toUpperCase() })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Full Name</label>
                            <input required type="text" placeholder="John Doe" value={newEmployee.name} onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Role</label>
                            <input required type="text" value={newEmployee.role} onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Monthly Salary (₹)</label>
                            <input required type="number" value={newEmployee.salary} onChange={e => setNewEmployee({ ...newEmployee, salary: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-green-700" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Aadhar Number</label>
                            <input type="text" maxLength="12" placeholder="1234 5678 9012" value={newEmployee.aadhar} onChange={e => setNewEmployee({ ...newEmployee, aadhar: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Contact Number</label>
                            <input required type="tel" placeholder="10-digit number" value={newEmployee.phone} onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all transform hover:-translate-y-1 active:translate-y-0">
                        Register Employee
                    </button>
                </form>
            </Modal>

            {/* Modal: Add Payment / Advance */}
            <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={`Log ${paymentForm.type} for ${selectedEmployeeForPayment?.name}`}>
                <form onSubmit={handleAddPayment} className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Payment Type</p>
                        <div className="flex gap-2">
                            {['Salary', 'Advance'].map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setPaymentForm({ ...paymentForm, type: t })}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all border ${paymentForm.type === t ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Amount (₹)</label>
                            <input required type="number" autoFocus value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 text-lg font-black text-gray-900" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">For Month</label>
                            <input required type="month" value={paymentForm.month} onChange={e => setPaymentForm({ ...paymentForm, month: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Short Note</label>
                        <input type="text" placeholder="Reason or reference..." value={paymentForm.note} onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>

                    {paymentForm.type === 'Salary' && selectedEmployeeForPayment && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-1">
                            <div className="flex justify-between text-xs font-bold text-amber-700 uppercase">
                                <span>Monthly Net Due:</span>
                                <span>₹ {calculateNetSalary(selectedEmployeeForPayment, paymentForm.month).toLocaleString()}</span>
                            </div>
                            <p className="text-[10px] text-amber-600 italic">* Deducts all advances taken for {paymentForm.month}</p>
                        </div>
                    )}

                    <button type="submit" className={`w-full text-white py-4 rounded-xl font-black text-lg shadow-lg transition-all ${paymentForm.type === 'Salary' ? 'bg-green-600 shadow-green-100 hover:bg-green-700' : 'bg-amber-600 shadow-amber-100 hover:bg-amber-700'}`}>
                        Confirm {paymentForm.type} Entry
                    </button>
                </form>
            </Modal>
            {/* Modal: Edit Employee */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Employee">
                <form onSubmit={handleEdit} className="space-y-6">
                    {/* Photo Upload Section */}
                    <div className="flex justify-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-blue-400">
                                {editForm.photo ? (
                                    <img src={editForm.photo} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <Camera className="w-8 h-8 text-gray-300 mb-2" />
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Photo</p>
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="user"
                                    onChange={(e) => handlePhotoUpload(e, 'edit')}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                            {editForm.photo && (
                                <button type="button" onClick={() => setEditForm({ ...editForm, photo: null })} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full border border-red-200 shadow-sm transition-all hover:bg-red-200">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Employee ID</label>
                            <input disabled type="text" value={editForm.id} className="w-full px-4 py-3 bg-gray-100 rounded-xl border border-gray-100 outline-none font-bold text-gray-500 cursor-not-allowed" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Full Name</label>
                            <input required type="text" placeholder="John Doe" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Role</label>
                            <input required type="text" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Status</label>
                            <select
                                value={editForm.status}
                                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                            >
                                <option value="Active">Active</option>
                                <option value="On Leave">On Leave</option>
                                <option value="Left">Left</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Monthly Salary (₹)</label>
                            <input required type="number" value={editForm.salary} onChange={e => setEditForm({ ...editForm, salary: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-green-700" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Contact Number</label>
                            <input required type="tel" placeholder="10-digit number" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Aadhar Number</label>
                        <input type="text" maxLength="12" placeholder="1234 5678 9012" value={editForm.aadhar} onChange={e => setEditForm({ ...editForm, aadhar: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>

                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all transform hover:-translate-y-1 active:translate-y-0">
                        Update Employee Details
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Employees;

import React, { useState } from 'react';
import { Plus, UserCheck, Phone } from 'lucide-react';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { useData } from '../context/DataContext';

const Employees = () => {
    const { data, addEmployee } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newEmployee, setNewEmployee] = useState({
        name: '',
        role: 'Helper',
        phone: '',
        salary: '',
        status: 'Active'
    });

    const handleAdd = (e) => {
        e.preventDefault();
        addEmployee({
            ...newEmployee,
            salary: parseFloat(newEmployee.salary)
        });
        setIsModalOpen(false);
        setNewEmployee({
            name: '',
            role: 'Helper',
            phone: '',
            salary: '',
            status: 'Active'
        });
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
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-200 transition-all font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Add Employee
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Active Staff</p>
                        <h3 className="text-xl font-bold text-gray-800">{activeStaff} Present</h3>
                    </div>
                </div>
            </div>

            <Table
                headers={['ID', 'Name', 'Role', 'Phone', 'Salary', 'Status']}
                data={data.employees}
                renderRow={(item) => (
                    <>
                        <td className="px-6 py-4 font-medium text-gray-900">{item.id}</td>
                        <td className="px-6 py-4 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                                {item.name.charAt(0)}
                            </div>
                            {item.name}
                        </td>
                        <td className="px-6 py-4">{item.role}</td>
                        <td className="px-6 py-4 text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {item.phone}
                        </td>
                        <td className="px-6 py-4">₹ {item.salary.toLocaleString()}</td>
                        <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-md text-xs font-semibold ${item.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {item.status}
                            </span>
                        </td>
                    </>
                )}
            />

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Employee">
                <form onSubmit={handleAdd} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                            type="text"
                            required
                            placeholder="Full Name"
                            value={newEmployee.name}
                            onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <input
                                type="text"
                                required
                                value={newEmployee.role}
                                onChange={e => setNewEmployee({ ...newEmployee, role: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                value={newEmployee.status}
                                onChange={e => setNewEmployee({ ...newEmployee, status: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="Active">Active</option>
                                <option value="On Leave">On Leave</option>
                                <option value="Left">Left</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                type="tel"
                                value={newEmployee.phone}
                                onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Salary (₹)</label>
                            <input
                                type="number"
                                required
                                value={newEmployee.salary}
                                onChange={e => setNewEmployee({ ...newEmployee, salary: e.target.value })}
                                className="w-full px-4 py-2 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
                        Save Employee
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Employees;

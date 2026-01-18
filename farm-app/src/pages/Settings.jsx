import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
// Removed useTheme import
import { Users, Shield, Eye, ShieldCheck, UserPlus, Trash2, Mail, Stethoscope, Plus, Syringe, Clock, Bell, Bug } from 'lucide-react';
import Modal from '../components/ui/Modal';

const Settings = () => {
    const { user, isSuperAdmin, isAdmin, allUsers, allowedUsers, updateUserRole, userRole, inviteUser, removeInvite } = useAuth();
    const { settings, updateSetting } = useSettings();

    // Modal State
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'viewer' });
    const [newMedicalOption, setNewMedicalOption] = useState('');

    const handleAddMedicalOption = (e) => {
        e.preventDefault();
        if (newMedicalOption.trim()) {
            const currentOptions = settings.medicalOptions || [];
            if (!currentOptions.includes(newMedicalOption.trim())) {
                updateSetting('medicalOptions', [...currentOptions, newMedicalOption.trim()]);
                setNewMedicalOption('');
            }
        }
    };

    const handleDeleteMedicalOption = (option) => {
        if (window.confirm(`Delete "${option}"?`)) {
            const currentOptions = settings.medicalOptions || [];
            updateSetting('medicalOptions', currentOptions.filter(o => o !== option));
        }
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'super_admin':
                return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Super Admin</span>;
            case 'admin':
                return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1"><Shield className="w-3 h-3" />Admin</span>;
            default:
                return <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full flex items-center gap-1"><Eye className="w-3 h-3" />Viewer</span>;
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await updateUserRole(userId, newRole);
        } catch (error) {
            alert('Failed to update role: ' + error.message);
        }
    };

    const handleInviteSubmit = async (e) => {
        e.preventDefault();
        try {
            await inviteUser(inviteForm.email, inviteForm.name, inviteForm.role);
            setIsInviteModalOpen(false);
            setInviteForm({ email: '', name: '', role: 'viewer' });
            alert('User invited successfully!');
        } catch (error) {
            alert('Failed to invite: ' + error.message);
        }
    };

    const handleRemoveInvite = async (id) => {
        if (window.confirm('Remove this invitation?')) {
            try {
                await removeInvite(id);
            } catch (e) {
                alert('Error: ' + e.message);
            }
        }
    };

    // Check super admin by email directly
    const currentUserIsSuperAdmin = user?.email?.toLowerCase() === 'bratankumar93@gmail.com';

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-500 mt-1">Manage users and app configuration.</p>
                </div>
            </div>

            {/* Current User Info */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4">Your Account</h3>
                <div className="flex items-center gap-4">
                    {user?.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName} className="w-14 h-14 rounded-full border-2 border-green-200" />
                    ) : (
                        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xl">
                            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
                        </div>
                    )}
                    <div>
                        <p className="font-medium text-gray-800 text-lg">{user?.displayName || 'User'}</p>
                        <p className="text-gray-500">{user?.email}</p>
                        <div className="mt-1">
                            {getRoleBadge(currentUserIsSuperAdmin ? 'super_admin' : userRole)}
                        </div>
                    </div>
                </div>
            </div>

            {/* User Management - Super Admin Only */}
            {currentUserIsSuperAdmin && (
                <div className="space-y-6">
                    {/* Active Users */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Users className="w-5 h-5 text-purple-600" />
                                </div>
                                <h3 className="font-bold text-gray-800">Active Users</h3>
                            </div>
                            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Super Admin Only</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Manage logged-in users and their roles.</p>

                        <div className="space-y-3">
                            {allUsers.length > 0 ? allUsers.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        {u.photoURL ? (
                                            <img src={u.photoURL} alt={u.displayName} className="w-10 h-10 rounded-full" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                                                {u.displayName?.charAt(0) || u.email?.charAt(0) || '?'}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-gray-800">{u.displayName || 'Unknown'}</p>
                                            <p className="text-xs text-gray-500">{u.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {u.email?.toLowerCase() === 'bratankumar93@gmail.com' ? (
                                            getRoleBadge('super_admin')
                                        ) : (
                                            <select
                                                value={u.role || 'viewer'}
                                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 outline-none"
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="viewer">Viewer</option>
                                            </select>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-4 text-gray-400">
                                    <p>No active users found.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Invited / Allowed Users */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Mail className="w-5 h-5 text-blue-600" />
                                </div>
                                <h3 className="font-bold text-gray-800">Invited Users</h3>
                            </div>
                            <button
                                onClick={() => setIsInviteModalOpen(true)}
                                className="text-sm bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 flex items-center gap-2"
                            >
                                <UserPlus className="w-4 h-4" /> Invite User
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Pre-approve users by email. They will get the assigned role when they log in.</p>

                        <div className="space-y-3">
                            {allowedUsers && allowedUsers.length > 0 ? allowedUsers.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">{u.displayName || 'Invited User'}</p>
                                            <p className="text-xs text-gray-500">{u.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded shadow-sm capitalize">
                                            {u.role}
                                        </span>
                                        <button
                                            onClick={() => handleRemoveInvite(u.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                                    <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">No pending invitations.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Viewer Info */}
            {!currentUserIsSuperAdmin && (
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 text-center">
                    <Eye className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="font-medium text-gray-600">
                        {isAdmin ? 'Admin Access' : 'View Only Access'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {isAdmin
                            ? 'You can view and edit data. Contact super admin for user management.'
                            : 'Contact the super admin to request edit permissions.'}
                    </p>
                </div>
            )}



            {currentUserIsSuperAdmin && (
                <div className="space-y-6 mb-6">
                    {/* Vaccines Section */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Syringe className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="font-bold text-gray-800">Manage Vaccines</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {(settings?.vaccineNames || []).map((option, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-100">
                                    <span className="font-medium text-sm">{option}</span>
                                    <button onClick={() => {
                                        const newOpts = (settings.vaccineNames || []).filter(o => o !== option);
                                        updateSetting('vaccineNames', newOpts);
                                    }} className="text-blue-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                id="newVaccine"
                                placeholder="Add new vaccine..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = e.target.value.trim();
                                        if (val) {
                                            updateSetting('vaccineNames', [...(settings.vaccineNames || []), val]);
                                            e.target.value = '';
                                        }
                                    }
                                }}
                            />
                            <button onClick={() => {
                                const val = document.getElementById('newVaccine').value.trim();
                                if (val) {
                                    updateSetting('vaccineNames', [...(settings.vaccineNames || []), val]);
                                    document.getElementById('newVaccine').value = '';
                                }
                            }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Medicines Section */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Stethoscope className="w-5 h-5 text-purple-600" />
                            </div>
                            <h3 className="font-bold text-gray-800">Manage Medicines</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {(settings?.medicineNames || []).map((option, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-purple-50 text-purple-800 px-3 py-1.5 rounded-lg border border-purple-100">
                                    <span className="font-medium text-sm">{option}</span>
                                    <button onClick={() => {
                                        const newOpts = (settings.medicineNames || []).filter(o => o !== option);
                                        updateSetting('medicineNames', newOpts);
                                    }} className="text-purple-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                id="newMedicine"
                                placeholder="Add new medicine..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 outline-none"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = e.target.value.trim();
                                        if (val) {
                                            updateSetting('medicineNames', [...(settings.medicineNames || []), val]);
                                            e.target.value = '';
                                        }
                                    }
                                }}
                            />
                            <button onClick={() => {
                                const val = document.getElementById('newMedicine').value.trim();
                                if (val) {
                                    updateSetting('medicineNames', [...(settings.medicineNames || []), val]);
                                    document.getElementById('newMedicine').value = '';
                                }
                            }} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Pesticides Section */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <Bug className="w-5 h-5 text-yellow-600" />
                            </div>
                            <h3 className="font-bold text-gray-800">Manage Pesticides</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {(settings?.pesticideNames || []).map((option, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-yellow-50 text-yellow-800 px-3 py-1.5 rounded-lg border border-yellow-100">
                                    <span className="font-medium text-sm">{option}</span>
                                    <button onClick={() => {
                                        const newOpts = (settings.pesticideNames || []).filter(o => o !== option);
                                        updateSetting('pesticideNames', newOpts);
                                    }} className="text-yellow-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                id="newPesticide"
                                placeholder="Add new pesticide..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500/20 outline-none"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = e.target.value.trim();
                                        if (val) {
                                            updateSetting('pesticideNames', [...(settings.pesticideNames || []), val]);
                                            e.target.value = '';
                                        }
                                    }
                                }}
                            />
                            <button onClick={() => {
                                const val = document.getElementById('newPesticide').value.trim();
                                if (val) {
                                    updateSetting('pesticideNames', [...(settings.pesticideNames || []), val]);
                                    document.getElementById('newPesticide').value = '';
                                }
                            }} className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Deworming Schedule Section */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Clock className="w-5 h-5 text-green-600" />
                            </div>
                            <h3 className="font-bold text-gray-800">Deworming Schedule</h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Set the interval (in days) for deworming each animal type.</p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            {['Goat', 'Sheep', 'Cattle', 'Buffalo'].map((type) => (
                                <div key={type} className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-600 uppercase">{type}</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={settings?.dewormingSchedule?.[type] || 90}
                                            onChange={(e) => {
                                                updateSetting('dewormingSchedule', {
                                                    ...(settings?.dewormingSchedule || {}),
                                                    [type]: parseInt(e.target.value) || 0
                                                });
                                            }}
                                            className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-green-500/20 outline-none bg-blue-50/30"
                                        />
                                        <span className="text-sm text-gray-500">days</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-3">
                                <Bell className="w-5 h-5 text-red-500" />
                                <div className="flex-1">
                                    <label className="text-sm font-medium text-gray-700">Notification Alert Buffer</label>
                                    <p className="text-xs text-gray-500">Show alert dashboard this many days before due date.</p>
                                </div>
                                <div className="flex items-center gap-2 w-32">
                                    <input
                                        type="number"
                                        value={settings.dewormingNotificationDays || 7}
                                        onChange={(e) => updateSetting('dewormingNotificationDays', parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center"
                                    />
                                    <span className="text-sm text-gray-500">days</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-2">About</h3>
                <div className="text-sm text-gray-500 space-y-1">
                    <p><strong>App:</strong> Trinetra Farms Management</p>
                    <p><strong>Version:</strong> 2.1</p>
                    <p><strong>Super Admin:</strong> bratankumar93@gmail.com</p>
                </div>
            </div>

            {/* Invite Modal */}
            <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Invite New User">
                <form onSubmit={handleInviteSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            required
                            type="email"
                            placeholder="user@example.com"
                            value={inviteForm.email}
                            onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name (Optional)</label>
                        <input
                            type="text"
                            placeholder="John Doe"
                            value={inviteForm.name}
                            onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select
                            value={inviteForm.role}
                            onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500/20 outline-none"
                        >
                            <option value="viewer">Viewer (Read Only)</option>
                            <option value="admin">Admin (Read & Write)</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsInviteModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Send Invite</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Settings;

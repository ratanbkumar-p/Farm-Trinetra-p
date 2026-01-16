import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
// Removed useTheme import
import { Users, Shield, Eye, ShieldCheck, UserPlus, Trash2, Mail } from 'lucide-react';
import Modal from '../components/ui/Modal';

const Settings = () => {
    const { user, isSuperAdmin, isAdmin, allUsers, allowedUsers, updateUserRole, userRole, inviteUser, removeInvite } = useAuth();

    // Modal State
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'viewer' });

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

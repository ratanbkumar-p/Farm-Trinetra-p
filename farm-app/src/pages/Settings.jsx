import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, Eye, ShieldCheck, UserPlus } from 'lucide-react';

const Settings = () => {
    const { user, isSuperAdmin, isAdmin, allUsers, updateUserRole, userRole } = useAuth();

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

    // Check super admin by email directly
    const currentUserIsSuperAdmin = user?.email?.toLowerCase() === 'bratankumar93@gmail.com';

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
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
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <h3 className="font-bold text-gray-800">User Management</h3>
                        <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Super Admin Only</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Manage user roles. Admins can edit data, Viewers can only view.</p>

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
                            <div className="text-center py-8 text-gray-400">
                                <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No other users have logged in yet.</p>
                                <p className="text-sm">Share the app link with your team!</p>
                            </div>
                        )}
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

            {/* App Info */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-2">About</h3>
                <div className="text-sm text-gray-500 space-y-1">
                    <p><strong>App:</strong> Trinetra Farms Management</p>
                    <p><strong>Version:</strong> 2.0</p>
                    <p><strong>Super Admin:</strong> bratankumar93@gmail.com</p>
                </div>
            </div>
        </div>
    );
};

export default Settings;

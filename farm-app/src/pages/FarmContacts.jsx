import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Phone, Edit2, X, Users, FolderPlus, ChevronDown, ChevronUp, Search, Loader2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import ContactCard from '../components/contacts/ContactCard';
import Modal from '../components/ui/Modal';

const FarmContacts = ({ embedded = false }) => {
    const {
        data,
        addContactGroup, updateContactGroup, deleteContactGroup,
        addFarmContact, updateFarmContact, deleteFarmContact
    } = useData();
    const { farmContacts = [], contactGroups = [] } = data;
    const { isSuperAdmin, isAdmin } = useAuth();
    const canEdit = isSuperAdmin || isAdmin;

    // State
    const [selectedGroupId, setSelectedGroupId] = useState('all');
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [editingContact, setEditingContact] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Forms
    const [groupForm, setGroupForm] = useState({ name: '', emoji: '👷' });
    const [contactForm, setContactForm] = useState({
        name: '',
        phone: '',
        notes: '',
        rate: '',
        groupId: ''
    });

    // Emoji options for groups
    const emojiOptions = ['👷', '🚜', '🔧', '🚛', '📦', '💰', '🏛️', '🌾', '🐄', '🔌', '🏗️', '🧑‍🌾', '💊', '🛠️', '🌱'];

    // Handlers
    const handleGroupSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingGroup) {
                await updateContactGroup(editingGroup.id, groupForm);
            } else {
                await addContactGroup(groupForm);
            }
            setIsGroupModalOpen(false);
            setEditingGroup(null);
            setGroupForm({ name: '', emoji: '👷' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingContact) {
                await updateFarmContact(editingContact.id, contactForm);
            } else {
                await addFarmContact({ ...contactForm, groupId: contactForm.groupId || selectedGroupId });
            }
            setIsContactModalOpen(false);
            setEditingContact(null);
            setContactForm({ name: '', phone: '', notes: '', rate: '', groupId: '' });
        } finally {
            setIsSaving(false);
        }
    };

    const openEditGroup = (group) => {
        setEditingGroup(group);
        setGroupForm({ name: group.name, emoji: group.emoji || '👷' });
        setIsGroupModalOpen(true);
    };

    const openEditContact = (contact) => {
        setEditingContact(contact);
        setContactForm({
            name: contact.name,
            phone: contact.phone,
            notes: contact.notes || '',
            rate: contact.rate || '',
            groupId: contact.groupId || ''
        });
        setIsContactModalOpen(true);
    };

    const handleDeleteGroup = async (id) => {
        const contactCount = farmContacts.filter(c => c.groupId === id).length;
        const msg = contactCount > 0
            ? `This will also delete ${contactCount} contact(s). Continue?`
            : 'Delete this group?';
        if (window.confirm(msg)) {
            await deleteContactGroup(id);
            if (selectedGroupId === id) setSelectedGroupId('all');
        }
    };

    const handleDeleteContact = async (id) => {
        if (window.confirm('Delete this contact?')) {
            await deleteFarmContact(id);
        }
    };

    // Filter contacts
    const filteredContacts = farmContacts.filter(c => {
        const matchesGroup = selectedGroupId === 'all' || c.groupId === selectedGroupId;
        const matchesSearch = !searchQuery ||
            c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone?.includes(searchQuery);
        return matchesGroup && matchesSearch;
    });

    const getGroupForContact = (groupId) => contactGroups.find(g => g.id === groupId);

    return (
        <div className={`${embedded ? '' : 'max-w-4xl mx-auto'} space-y-4`}>
            <PageHeader
                actionsOnly={embedded}
                section="contacts"
                subtitle={`${farmContacts.length} people — labourers, buyers and suppliers, one tap away.`}
                actions={canEdit && (
                    <>
                        <button
                            onClick={() => { setEditingGroup(null); setGroupForm({ name: '', emoji: '👷' }); setIsGroupModalOpen(true); }}
                            className="flex items-center gap-2 bg-white ring-1 ring-gray-200 text-gray-700 hover:ring-gray-300 px-4 py-3 rounded-2xl font-bold shadow-sm"
                            title="Add Group"
                        >
                            <FolderPlus className="w-5 h-5" />
                            Group
                        </button>
                        <button
                            onClick={() => { setEditingContact(null); setContactForm({ name: '', phone: '', notes: '', rate: '', groupId: selectedGroupId === 'all' ? '' : selectedGroupId }); setIsContactModalOpen(true); }}
                            className="flex items-center gap-2 px-5 py-3 bg-forest text-white rounded-2xl font-bold hover:bg-green-900 shadow-[0_3px_0_#0b2416]"
                        >
                            <Plus className="w-5 h-5" />
                            Add contact
                        </button>
                    </>
                )}
            />

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 bg-white shadow-sm"
                />
            </div>

            {/* Group Tabs - Horizontal Scroll */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                <button
                    onClick={() => setSelectedGroupId('all')}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition whitespace-nowrap ${selectedGroupId === 'all'
                        ? 'bg-forest text-white shadow-md'
                        : 'bg-white ring-1 ring-gray-200 text-gray-600'
                        }`}
                >
                    All ({farmContacts.length})
                </button>
                {contactGroups.map(group => {
                    const count = farmContacts.filter(c => c.groupId === group.id).length;
                    return (
                        <button
                            key={group.id}
                            onClick={() => setSelectedGroupId(group.id)}
                            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition flex items-center gap-1.5 whitespace-nowrap ${selectedGroupId === group.id
                                ? 'bg-forest text-white shadow-md'
                                : 'bg-white ring-1 ring-gray-200 text-gray-600'
                                }`}
                        >
                            <span>{group.emoji || '📁'}</span>
                            <span>{group.name}</span>
                            <span className="opacity-70">({count})</span>
                        </button>
                    );
                })}
                {canEdit && contactGroups.length > 0 && (
                    <button
                        onClick={() => openEditGroup(contactGroups.find(g => g.id === selectedGroupId) || contactGroups[0])}
                        className="flex-shrink-0 px-3 py-2 rounded-full text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                        title="Edit selected group"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Contacts List */}
            {filteredContacts.length === 0 ? (
                <EmptyState
                    emoji="📇"
                    title={contactGroups.length === 0 ? 'Start with a group' : 'Nobody here yet'}
                    message={contactGroups.length === 0
                        ? 'Make groups like “Labour”, “Buyers” or “Feed suppliers”, then add people to them.'
                        : 'Add people to this group so they’re one tap away.'}
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredContacts.map((contact, idx) => {
                        const group = getGroupForContact(contact.groupId);
                        return (
                            <ContactCard
                                key={contact.id}
                                index={idx}
                                name={contact.name}
                                phone={contact.phone}
                                emoji={group?.emoji || '👤'}
                                tag={group?.name}
                                details={[contact.rate ? `💰 ${contact.rate}` : null]}
                                notes={contact.notes}
                                canEdit={canEdit}
                                onEdit={() => openEditContact(contact)}
                                onDelete={() => handleDeleteContact(contact.id)}
                            />
                        );
                    })}
                </div>
            )}

            {/* Group Management (when a group is selected) */}
            {canEdit && selectedGroupId !== 'all' && (
                <div className="flex justify-center gap-2 pt-2">
                    <button
                        onClick={() => openEditGroup(contactGroups.find(g => g.id === selectedGroupId))}
                        className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1"
                    >
                        <Edit2 className="w-3 h-3" />
                        Edit Group
                    </button>
                    <span className="text-gray-300">•</span>
                    <button
                        onClick={() => handleDeleteGroup(selectedGroupId)}
                        className="text-xs text-gray-400 hover:text-red-600 flex items-center gap-1"
                    >
                        <Trash2 className="w-3 h-3" />
                        Delete Group
                    </button>
                </div>
            )}

            {/* Group Modal */}
            <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title={editingGroup ? 'Edit Group' : 'Add Group'}>
                <form onSubmit={handleGroupSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                        <input
                            required
                            value={groupForm.name}
                            onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                            placeholder="e.g., Daily Wage Workers"
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                        <div className="flex flex-wrap gap-2">
                            {emojiOptions.map(emoji => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setGroupForm({ ...groupForm, emoji })}
                                    className={`w-10 h-10 text-xl rounded-lg transition ${groupForm.emoji === emoji
                                        ? 'bg-indigo-100 ring-2 ring-indigo-500'
                                        : 'bg-gray-100 hover:bg-gray-200'
                                        }`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            editingGroup ? 'Update Group' : 'Create Group'
                        )}
                    </button>
                </form>
            </Modal>

            {/* Contact Modal */}
            <Modal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} title={editingContact ? 'Edit Contact' : 'Add Contact'}>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input
                            required
                            value={contactForm.name}
                            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                            placeholder="e.g., Ramu"
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                        <input
                            required
                            type="tel"
                            value={contactForm.phone}
                            onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                            placeholder="9876543210"
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
                        <select
                            value={contactForm.groupId}
                            onChange={(e) => setContactForm({ ...contactForm, groupId: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            <option value="">No Group</option>
                            {contactGroups.map(g => (
                                <option key={g.id} value={g.id}>{g.emoji} {g.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Rate / Cost</label>
                        <input
                            value={contactForm.rate}
                            onChange={(e) => setContactForm({ ...contactForm, rate: e.target.value })}
                            placeholder="e.g., ₹500/day"
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            value={contactForm.notes}
                            onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                            placeholder="Any additional info..."
                            rows={2}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            editingContact ? 'Update Contact' : 'Add Contact'
                        )}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default FarmContacts;

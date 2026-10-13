import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Phone, MapPin, Stethoscope, Syringe, X, Edit2, Loader2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import ContactCard from '../components/contacts/ContactCard';

const Contacts = ({ embedded = false }) => {
    const { data, addContact, deleteContact, updateContact } = useData();
    const { contacts } = data;
    const { user, userRole, isAdmin, isSuperAdmin, canEdit: authCanEdit } = useAuth();
    const [isAdding, setIsAdding] = useState(false);
    const [editingContactId, setEditingContactId] = useState(null);
    const [contactForm, setContactForm] = useState({
        name: '',
        phone: '',
        location: '',
        type: 'Doctor'
    });
    const [isSaving, setIsSaving] = useState(false);

    const canEdit = authCanEdit;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingContactId) {
                await updateContact(editingContactId, contactForm);
            } else {
                await addContact(contactForm);
            }
            setIsAdding(false);
            setEditingContactId(null);
            setContactForm({ name: '', phone: '', location: '', type: 'Doctor' });
        } catch (error) {
            console.error("Error submitting contact:", error);
            alert("Failed to save contact");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (contact) => {
        setEditingContactId(contact.id);
        setContactForm({
            name: contact.name,
            phone: contact.phone,
            location: contact.location || '',
            type: contact.type || 'Doctor'
        });
        setIsAdding(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this contact?')) {
            await deleteContact(id);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <PageHeader
                actionsOnly={embedded}
                emoji="🩺"
                title="Vet contacts"
                subtitle="Doctors and assistants you can call when an animal is unwell."
                section="contacts"
                actions={(isSuperAdmin || canEdit) && !isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-forest text-white rounded-2xl font-bold hover:bg-green-900 shadow-[0_3px_0_#0b2416]"
                    >
                        <Plus className="w-5 h-5" />
                        Add vet contact
                    </button>
                )}
            />

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Add Form Section (Left or Top depending on state) */}
                <AnimatePresence>
                    {isAdding && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="lg:col-span-4"
                        >
                            <div className="bg-white p-6 rounded-3xl ring-1 ring-green-200 shadow-md sticky top-24">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-900">{editingContactId ? 'Edit Contact' : 'New Contact'}</h2>
                                    <button onClick={() => { setIsAdding(false); setEditingContactId(null); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700 ml-1">Full Name</label>
                                        <input
                                            required
                                            value={contactForm.name}
                                            onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white"
                                            placeholder="e.g. Dr. Ramesh"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700 ml-1">Phone Number</label>
                                        <input
                                            required
                                            type="tel"
                                            value={contactForm.phone}
                                            onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                                            className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white"
                                            placeholder="9876543210"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700 ml-1">Location / Clinic</label>
                                        <input
                                            value={contactForm.location}
                                            onChange={(e) => setContactForm(prev => ({ ...prev, location: e.target.value }))}
                                            className="w-full h-12 px-4 rounded-2xl border border-gray-300 bg-white"
                                            placeholder="e.g. Village Name / Town"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 ml-1">Role Type</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['Doctor', 'Assistant'].map(type => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setContactForm(prev => ({ ...prev, type }))}
                                                    className={`h-12 rounded-xl border text-sm font-bold transition-all ${contactForm.type === type
                                                        ? 'bg-green-50 border-green-200 text-green-700 ring-2 ring-green-500/20'
                                                        : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-white hover:border-gray-200'
                                                        }`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="w-full h-14 bg-forest text-white font-bold rounded-2xl shadow-[0_3px_0_#0b2416] flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                {editingContactId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                                {editingContactId ? 'Update Contact' : 'Save Contact'}
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Contacts Grid */}
                <div className={`${isAdding ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
                    {(!contacts || contacts.length === 0) ? (
                        <EmptyState
                            emoji="🩺"
                            title="No vets saved yet"
                            message="Add the doctors and assistants you call when an animal is unwell — then it’s one tap to call or WhatsApp."
                            action={!isAdding && (isSuperAdmin || canEdit) && (
                                <button onClick={() => setIsAdding(true)} className="px-5 py-3 bg-forest text-white font-bold rounded-2xl shadow-[0_3px_0_#0b2416]">
                                    Add your first vet
                                </button>
                            )}
                        />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {contacts.map((contact, idx) => (
                                <ContactCard
                                    key={contact.id}
                                    index={idx}
                                    name={contact.name}
                                    phone={contact.phone}
                                    emoji={contact.type === 'Doctor' ? '🩺' : '💉'}
                                    tag={contact.type === 'Doctor' ? 'Vet doctor' : 'Vet assistant'}
                                    tone={contact.type === 'Doctor' ? 'blue' : 'amber'}
                                    location={contact.location}
                                    canEdit={isSuperAdmin || canEdit}
                                    onEdit={() => handleEdit(contact)}
                                    onDelete={() => handleDelete(contact.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Contacts;

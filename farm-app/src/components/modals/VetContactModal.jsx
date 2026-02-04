import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Phone, MapPin, Stethoscope, Syringe, User, Edit2, Loader2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

const VetContactModal = ({ isOpen, onClose }) => {
    const { contacts, addContact, deleteContact, updateContact } = useData();
    const { isAdmin, isSuperAdmin, canEdit: authCanEdit } = useAuth();
    const [isAdding, setIsAdding] = useState(false);
    const [editingContactId, setEditingContactId] = useState(null);
    const [contactForm, setContactForm] = useState({
        name: '',
        phone: '',
        location: '',
        type: 'Doctor'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [deletingContactId, setDeletingContactId] = useState(null);

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
            setDeletingContactId(id);
            try {
                await deleteContact(id);
            } catch (error) {
                console.error("Error deleting contact:", error);
                alert("Failed to delete contact");
            } finally {
                setDeletingContactId(null);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden relative z-10 flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white sticky top-0 z-20">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Stethoscope className="w-6 h-6 text-green-600" />
                            Veterinary Contacts
                        </h2>
                        <p className="text-gray-500 text-sm">Doctors, Assistants, and Medical Support</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {!isAdding && (isSuperAdmin || canEdit) && (
                            <button
                                onClick={() => setIsAdding(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition shadow-sm"
                            >
                                <Plus className="w-5 h-5" />
                                Add Contact
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar bg-gray-50/50 flex-1">

                    {/* ADD FORM SECTION */}
                    <AnimatePresence>
                        {isAdding && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden mb-6"
                            >
                                <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-gray-800">{editingContactId ? 'Edit Contact Details' : 'New Contact Details'}</h3>
                                        <button onClick={() => { setIsAdding(false); setEditingContactId(null); }} className="text-gray-400 hover:text-gray-600">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                            <input
                                                required
                                                value={contactForm.name}
                                                onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                                                className="w-full rounded-xl border-gray-300 focus:border-green-500 focus:ring-green-500"
                                                placeholder="Dr. Name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                            <input
                                                required
                                                type="tel"
                                                value={contactForm.phone}
                                                onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                                                className="w-full rounded-xl border-gray-300 focus:border-green-500 focus:ring-green-500"
                                                placeholder="9876543210"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                            <input
                                                value={contactForm.location}
                                                onChange={(e) => setContactForm(prev => ({ ...prev, location: e.target.value }))}
                                                className="w-full rounded-xl border-gray-300 focus:border-green-500 focus:ring-green-500"
                                                placeholder="Clinic / Village"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                            <div className="flex gap-2">
                                                {['Doctor', 'Assistant'].map(type => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => setContactForm(prev => ({ ...prev, type }))}
                                                        className={`flex-1 py-2 px-3 rounded-xl border text-sm font-medium transition-all ${contactForm.type === type
                                                            ? 'bg-green-50 border-green-200 text-green-700 ring-1 ring-green-500'
                                                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 pt-2">
                                            <button
                                                type="submit"
                                                disabled={isSaving}
                                                className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                            >
                                                {isSaving ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Saving...</> : (editingContactId ? 'Update Contact' : 'Save Contact')}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* LIST SECTION */}
                    {(!contacts || contacts.length === 0) ? (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Stethoscope className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">No Contacts Yet</h3>
                            <p className="text-gray-500">Add veterinary doctors to access them quickly.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {contacts.map(contact => (
                                <div key={contact.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group relative">
                                    {(isSuperAdmin || canEdit) && (
                                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                            <button
                                                onClick={() => handleEdit(contact)}
                                                className="p-1 text-gray-300 hover:text-blue-500 transition-all"
                                                title="Edit Contact"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(contact.id)}
                                                disabled={deletingContactId === contact.id}
                                                className="p-1 text-gray-300 hover:text-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Delete Contact"
                                            >
                                                {deletingContactId === contact.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex items-start gap-4 mb-4">
                                        <div className={`p-3 rounded-xl shrink-0 ${contact.type === 'Doctor' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                            {contact.type === 'Doctor' ? <Stethoscope className="w-6 h-6" /> : <Syringe className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-lg leading-tight">{contact.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${contact.type === 'Doctor' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {contact.type}
                                                </span>
                                                {contact.location && (
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {contact.location}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <a
                                        href={`tel:${contact.phone}`}
                                        className="flex items-center justify-center gap-2 w-max mx-auto px-4 py-1.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold hover:bg-green-500 hover:text-white transition-all duration-300"
                                    >
                                        <Phone className="w-3.5 h-3.5" />
                                        Call {contact.phone}
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default VetContactModal;

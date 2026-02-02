import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Phone, MapPin, Stethoscope, Syringe, X, Edit2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const Contacts = () => {
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

    const canEdit = authCanEdit;

    const handleSubmit = async (e) => {
        e.preventDefault();
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
        <div className="max-w-[1920px] mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                            <Stethoscope className="w-8 h-8" />
                        </div>
                        Veterinary Contacts
                    </h1>
                    <p className="text-gray-500 mt-1">Manage and access your farm's medical support directory.</p>
                </div>

                {(isSuperAdmin || canEdit) && !isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-200"
                    >
                        <Plus className="w-5 h-5" />
                        Add New Contact
                    </button>
                )}
            </div>

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
                            <div className="bg-white p-6 rounded-2xl border border-green-100 shadow-sm sticky top-24">
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
                                            className="w-full h-12 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500 transition-all"
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
                                            className="w-full h-12 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500 transition-all"
                                            placeholder="9876543210"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700 ml-1">Location / Clinic</label>
                                        <input
                                            value={contactForm.location}
                                            onChange={(e) => setContactForm(prev => ({ ...prev, location: e.target.value }))}
                                            className="w-full h-12 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-500 transition-all"
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
                                        className="w-full h-14 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-200 flex items-center justify-center gap-2 mt-4"
                                    >
                                        {editingContactId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                        {editingContactId ? 'Update Contact' : 'Save Contact'}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Contacts Grid */}
                <div className={`${isAdding ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
                    {(!contacts || contacts.length === 0) ? (
                        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-20 flex flex-col items-center justify-center text-center">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <Stethoscope className="w-12 h-12 text-gray-300" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">No Contacts Found</h3>
                            <p className="text-gray-500 mt-2 max-w-sm">You haven't added any veterinary contacts yet. Start by adding your first doctor or assistant.</p>
                            {!isAdding && (isSuperAdmin || canEdit) && (
                                <button
                                    onClick={() => setIsAdding(true)}
                                    className="mt-8 px-8 py-3 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition shadow-lg"
                                >
                                    Add Your First Contact
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-x-6 gap-y-10 pt-6">
                            {contacts.map((contact, idx) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={contact.id}
                                    className="bg-white px-4 pb-4 pt-12 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-green-500/5 transition-all group relative flex flex-col items-center text-center"
                                >
                                    {(isSuperAdmin || canEdit) && (
                                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                                            <button
                                                onClick={() => handleEdit(contact)}
                                                className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all"
                                                title="Edit Contact"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(contact.id)}
                                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                title="Delete Contact"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Avatar Circle */}
                                    <div className={`absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full flex items-center justify-center shadow-lg border-4 border-white shrink-0 transition-transform group-hover:scale-110 ${contact.type === 'Doctor' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'}`}>
                                        {contact.type === 'Doctor' ? <Stethoscope className="w-7 h-7" /> : <Syringe className="w-7 h-7" />}
                                    </div>

                                    <div className="mb-4 w-full overflow-hidden">
                                        <h3 className="font-black text-gray-900 truncate mb-1">{contact.name}</h3>
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full tracking-widest ${contact.type === 'Doctor' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {contact.type}
                                            </span>
                                            {contact.location && (
                                                <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1 truncate max-w-full justify-center">
                                                    <MapPin className="w-3 h-3" />
                                                    {contact.location}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="w-full mt-auto space-y-2">
                                        <a
                                            href={`tel:${contact.phone}`}
                                            className="flex items-center justify-center gap-2 w-max mx-auto px-4 py-1.5 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-all shadow-md active:scale-95"
                                        >
                                            <Phone className="w-3.5 h-3.5 fill-current" />
                                            Call Now
                                        </a>
                                        <p className="text-[11px] text-gray-300 font-bold tracking-tighter">
                                            {contact.phone}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Contacts;

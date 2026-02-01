import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import {
    Package,
    Plus,
    Search,
    AlertTriangle,
    Pill,
    Edit2,
    Trash2,
    ChevronDown,
    ChevronUp,
    Syringe,
    Stethoscope,
    Activity,
    Thermometer,
    Download
} from 'lucide-react';

const Inventory = () => {
    const { data, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useData();
    const { canEdit } = useAuth();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Medicine');
    const [editingItem, setEditingItem] = useState(null);
    const [loadingSeed, setLoadingSeed] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        category: 'Medicine',
        quantity: '',
        unit: 'ml',
        lowStockThreshold: 10,
        description: '',
        targetLivestock: [],
        ailments: []
    });

    // Constants
    const CATEGORIES = ['Medicine', 'Vaccine', 'Supplement', 'Equipment', 'Other'];
    const UNITS = ['ml', 'L', 'mg', 'g', 'kg', 'tablet', 'dose', 'vial', 'piece', 'box'];
    const LIVESTOCK_TYPES = ['Goat', 'Sheep', 'Chicken', 'Cow', 'Buffalo'];

    // VETERINARY SEED DATA (Indian Context)
    const SEED_DATA = [
        { name: 'Albendazole (Albomar)', category: 'Medicine', quantity: 500, unit: 'ml', lowStockThreshold: 100, targetLivestock: ['Goat', 'Sheep', 'Cow'], ailments: ['Worms', 'Liver Fluke', 'Digestive'], description: 'Broad spectrum dewormer. Oral administration.' },
        { name: 'Ivermectin (High-Tek)', category: 'Medicine', quantity: 10, unit: 'vial', lowStockThreshold: 2, targetLivestock: ['Goat', 'Sheep', 'Cow'], ailments: ['Worms', 'Ticks', 'Mites', 'Lice'], description: 'Injectable for internal and external parasites.' },
        { name: 'Oxytetracycline (LA)', category: 'Medicine', quantity: 10, unit: 'vial', lowStockThreshold: 2, targetLivestock: ['Goat', 'Sheep', 'Cow'], ailments: ['Infection', 'Wound', 'Pneumonia'], description: 'Long acting antibiotic injection.' },
        { name: 'Enrofloxacin 10%', category: 'Medicine', quantity: 100, unit: 'ml', lowStockThreshold: 20, targetLivestock: ['Chicken', 'Goat'], ailments: ['CRD', 'Respiratory', 'Diarrhea'], description: 'Oral solution for respiratory infections.' },
        { name: 'Meloxicam (Melonex)', category: 'Medicine', quantity: 100, unit: 'ml', lowStockThreshold: 10, targetLivestock: ['Goat', 'Sheep', 'Cow'], ailments: ['Fever', 'Pain', 'Inflammation'], description: 'NSAID for pain relief and fever reduction.' },
        { name: 'PPR Vaccine (Raksha)', category: 'Vaccine', quantity: 5, unit: 'vial', lowStockThreshold: 1, targetLivestock: ['Goat', 'Sheep'], ailments: ['PPR', 'Plague'], description: 'Annual vaccine for Peste des Petits Ruminants.' },
        { name: 'FMD Vaccine', category: 'Vaccine', quantity: 5, unit: 'vial', lowStockThreshold: 1, targetLivestock: ['Cow', 'Buffalo', 'Goat'], ailments: ['Foot and Mouth', 'FMD'], description: 'Bi-annual vaccine for Foot and Mouth Disease.' },
        { name: 'Ranikhet (LaSota)', category: 'Vaccine', quantity: 1000, unit: 'dose', lowStockThreshold: 200, targetLivestock: ['Chicken'], ailments: ['Newcastle Disease', 'Ranikhet'], description: 'Live vaccine for poultry.' },
        { name: 'Liver Tonic (Stimuliv)', category: 'Supplement', quantity: 1000, unit: 'ml', lowStockThreshold: 200, targetLivestock: ['Goat', 'Cow', 'Chicken'], ailments: ['Liver', 'Appetite', 'Digestion'], description: 'Hepato-protective and appetite stimulant.' },
        { name: 'Calcium (Ostovet)', category: 'Supplement', quantity: 5, unit: 'L', lowStockThreshold: 1, targetLivestock: ['Cow', 'Goat'], ailments: ['Milk Fever', 'Weakness', 'Bones'], description: 'Liquid calcium for milk production and bone health.' },
        { name: 'Tincture Iodine', category: 'Other', quantity: 500, unit: 'ml', lowStockThreshold: 50, targetLivestock: ['Goat', 'Sheep', 'Cow', 'Chicken'], ailments: ['Wound', 'Antiseptic'], description: 'For dressing wounds and cuts.' },
        { name: 'Himax Ointment', category: 'Medicine', quantity: 10, unit: 'piece', lowStockThreshold: 2, targetLivestock: ['Goat', 'Sheep', 'Cow'], ailments: ['Wound', 'Maggots', 'Skin'], description: 'Antiseptic fly repellent ointment.' }
    ];

    // Stats
    const totalItems = data.inventory?.length || 0;
    const lowStockItems = (data.inventory || []).filter(item => Number(item.quantity) <= Number(item.lowStockThreshold || 0));

    // Filter & Search Logic
    const filteredInventory = (data.inventory || []).filter(item => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = item.name.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower) ||
            (item.ailments || []).some(a => a.toLowerCase().includes(searchLower));

        const matchesCategory = categoryFilter === 'All' ? true : item.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const loadStarterKit = async () => {
        if (!window.confirm("This will add standard medicines to your inventory. Proceed?")) return;
        setLoadingSeed(true);
        try {
            for (const item of SEED_DATA) {
                const exists = data.inventory.some(i => i.name === item.name);
                if (!exists) {
                    await addInventoryItem(item);
                }
            }
            alert("Veterinary Kit Loaded Successfully!");
        } catch (e) {
            console.error(e);
            alert("Error loading kit.");
        } finally {
            setLoadingSeed(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                quantity: Number(formData.quantity),
                lowStockThreshold: Number(formData.lowStockThreshold)
            };

            if (editingItem) {
                await updateInventoryItem(editingItem.id, payload);
            } else {
                await addInventoryItem(payload);
            }
            closeModal();
        } catch (error) {
            console.error("Error saving inventory:", error);
        }
    };

    const openAddModal = () => {
        setEditingItem(null);
        setFormData({
            name: '',
            category: categoryFilter === 'All' ? 'Medicine' : categoryFilter,
            quantity: '',
            unit: 'ml',
            lowStockThreshold: 10,
            description: '',
            targetLivestock: [],
            ailments: []
        });
        setIsModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            category: item.category || 'Medicine',
            quantity: item.quantity,
            unit: item.unit || 'ml',
            lowStockThreshold: item.lowStockThreshold || 0,
            description: item.description || '',
            targetLivestock: item.targetLivestock || [],
            ailments: item.ailments || []
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete this inventory item?")) {
            await deleteInventoryItem(id);
        }
    };

    const toggleLivestockTarget = (type) => {
        const current = formData.targetLivestock;
        if (current.includes(type)) {
            setFormData({ ...formData, targetLivestock: current.filter(t => t !== type) });
        } else {
            setFormData({ ...formData, targetLivestock: [...current, type] });
        }
    };

    const [ailmentInput, setAilmentInput] = useState('');
    const addAilment = () => {
        if (!ailmentInput.trim()) return;
        if (!formData.ailments.includes(ailmentInput.trim())) {
            setFormData({ ...formData, ailments: [...formData.ailments, ailmentInput.trim()] });
        }
        setAilmentInput('');
    };
    const removeAilment = (tag) => {
        setFormData({ ...formData, ailments: formData.ailments.filter(a => a !== tag) });
    };

    const adjustQuantity = (item, amount) => {
        if (!canEdit) return;
        const newQty = Math.max(0, Number(item.quantity) + amount);
        updateInventoryItem(item.id, { quantity: newQty });
    };

    const getCategoryIcon = (cat) => {
        switch (cat) {
            case 'Medicine': return <Pill className="w-5 h-5 text-blue-500" />;
            case 'Vaccine': return <Syringe className="w-5 h-5 text-pink-500" />;
            case 'Supplement': return <Activity className="w-5 h-5 text-green-500" />;
            case 'Equipment': return <Stethoscope className="w-5 h-5 text-gray-500" />;
            default: return <Package className="w-5 h-5 text-gray-400" />;
        }
    };

    const getCategoryColor = (cat) => {
        switch (cat) {
            case 'Medicine': return 'bg-blue-50 border-blue-100 text-blue-700';
            case 'Vaccine': return 'bg-pink-50 border-pink-100 text-pink-700';
            case 'Supplement': return 'bg-green-50 border-green-100 text-green-700';
            case 'Equipment': return 'bg-gray-50 border-gray-100 text-gray-700';
            default: return 'bg-gray-50 border-gray-100 text-gray-600';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <Thermometer className="w-8 h-8 text-red-500" />
                        Veterinary Inventory
                    </h1>
                    <p className="text-gray-500 mt-1">Manage medicines, vaccines, and farm supplies.</p>
                </div>
                <div className="flex gap-2">
                    {canEdit && data.inventory.length < 5 && (
                        <button
                            onClick={loadStarterKit}
                            disabled={loadingSeed}
                            className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-800 px-4 py-2.5 rounded-xl transition-all font-bold"
                        >
                            <Download className="w-5 h-5" />
                            {loadingSeed ? 'Loading...' : 'Load Starter Kit'}
                        </button>
                    )}
                    {canEdit && (
                        <button
                            onClick={openAddModal}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-green-200 transition-all font-bold"
                        >
                            <Plus className="w-5 h-5" />
                            Add Item
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Stock</p>
                    <div className="flex items-end justify-between mt-2">
                        <span className="text-3xl font-black text-gray-800">{totalItems}</span>
                        <Package className="w-8 h-8 text-gray-100" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Low Stock</p>
                    <div className="flex items-end justify-between mt-2">
                        <span className={`text-3xl font-black ${lowStockItems.length > 0 ? 'text-red-600' : 'text-gray-800'}`}>{lowStockItems.length}</span>
                        <AlertTriangle className={`w-8 h-8 ${lowStockItems.length > 0 ? 'text-red-100' : 'text-gray-100'}`} />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-bold text-pink-400 uppercase tracking-widest">Vaccines</p>
                    <div className="flex items-end justify-between mt-2">
                        <span className="text-3xl font-black text-gray-800">{(data.inventory || []).filter(i => i.category === 'Vaccine').length}</span>
                        <Syringe className="w-8 h-8 text-pink-100" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Medicines</p>
                    <div className="flex items-end justify-between mt-2">
                        <span className="text-3xl font-black text-gray-800">{(data.inventory || []).filter(i => i.category === 'Medicine').length}</span>
                        <Pill className="w-8 h-8 text-blue-100" />
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search for 'Fever', 'Worms', 'Pain' or Medicine Name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-lg placeholder:text-gray-400"
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                        onClick={() => setCategoryFilter('All')}
                        className={`px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${categoryFilter === 'All' ? 'bg-gray-800 text-white shadow-lg' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                    >
                        All
                    </button>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${categoryFilter === cat ? getCategoryColor(cat) + ' shadow-md' : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                        >
                            {cat === 'Medicine' && <Pill className="w-4 h-4" />}
                            {cat === 'Vaccine' && <Syringe className="w-4 h-4" />}
                            {cat === 'Supplement' && <Activity className="w-4 h-4" />}
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInventory.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col h-full relative">
                        {Number(item.quantity) <= Number(item.lowStockThreshold || 0) && (
                            <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10 shadow-sm">
                                LOW STOCK
                            </div>
                        )}

                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${getCategoryColor(item.category).split(' ')[0]}`}>
                                        {getCategoryIcon(item.category)}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 leading-tight">{item.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${getCategoryColor(item.category)}`}>
                                                {item.category}
                                            </span>
                                            {(item.targetLivestock || []).slice(0, 3).map(target => (
                                                <span key={target} className="text-[10px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                                    {target}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 mb-4 bg-gray-50/50 p-3 rounded-xl italic border border-dashed border-gray-200">
                                "{item.description || 'No description provided'}"
                            </p>

                            {item.ailments && item.ailments.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Treats / Used For</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {item.ailments.map(ailment => (
                                            <span key={ailment} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg border border-blue-100">
                                                {ailment}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                                <div>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-2xl font-black ${Number(item.quantity) <= Number(item.lowStockThreshold || 0) ? 'text-red-600' : 'text-gray-800'}`}>
                                            {item.quantity}
                                        </span>
                                        <span className="text-sm font-bold text-gray-400">{item.unit}</span>
                                    </div>
                                </div>
                                {canEdit && (
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                            <button onClick={() => adjustQuantity(item, -1)} className="p-1.5 hover:bg-white hover:text-red-500 rounded-md shadow-sm transition-all text-gray-600">
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => adjustQuantity(item, 1)} className="p-1.5 hover:bg-white hover:text-green-500 rounded-md shadow-sm transition-all text-gray-600">
                                                <ChevronUp className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex gap-1 border-l border-gray-200 pl-2">
                                            <button onClick={() => openEditModal(item)} className="p-2 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredInventory.length === 0 && (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-400">No items found</h3>
                    <p className="text-gray-400 mt-2">Try adjusting your filters or add a new item.</p>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? "Edit Inventory Item" : "Add New Item"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Item Name</label>
                            <input
                                required
                                type="text"
                                placeholder="e.g. Ivermectin"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Low Stock Limit</label>
                            <input
                                type="number"
                                value={formData.lowStockThreshold}
                                onChange={e => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-red-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Quantity</label>
                            <input
                                required
                                type="number"
                                value={formData.quantity}
                                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-xl"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Unit</label>
                            <select
                                value={formData.unit}
                                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Treats / Used For (Tags)</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                placeholder="e.g. Fever"
                                value={ailmentInput}
                                onChange={e => setAilmentInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAilment())}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                            />
                            <button type="button" onClick={addAilment} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold">Add</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.ailments.map(tag => (
                                <span key={tag} className="px-2 py-1 bg-white border border-gray-200 rounded-md text-xs font-bold text-gray-700 flex items-center gap-1">
                                    {tag}
                                    <button type="button" onClick={() => removeAilment(tag)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Target Livestock</label>
                        <div className="flex flex-wrap gap-2">
                            {LIVESTOCK_TYPES.map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => toggleLivestockTarget(type)}
                                    className={`px-3 py-2 rounded-xl text-sm font-bold border transition-all ${formData.targetLivestock.includes(type)
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Instructions / Description</label>
                        <textarea
                            rows="2"
                            placeholder="Usage instructions..."
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1 active:translate-y-0"
                    >
                        {editingItem ? 'Update Item' : 'Add Item'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Inventory;

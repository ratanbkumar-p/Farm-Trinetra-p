import React, { useState, useMemo, useEffect, memo } from 'react';
import { Plus, ArrowLeft, Trash2, Edit2, X, IndianRupee, TrendingUp, Scale, Check, ArrowUp, ArrowDown, Minus, ChevronDown, ChevronUp, Stethoscope, Syringe, RotateCcw, Users, ArrowRight, Loader2, HeartCrack, FileDown, CalendarDays } from 'lucide-react';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { batchOwnCosts, animalCostBreakdown, useCosting } from '../lib/costing';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useLocation } from 'react-router-dom';
import { useUI } from '../context/UIContext';
import PageHeader from '../components/ui/PageHeader';
import SegmentedTabs from '../components/ui/SegmentedTabs';
import EmptyState from '../components/ui/EmptyState';
import RecordDeathModal from '../components/livestock/RecordDeathModal';
import DeathDetailsModal from '../components/livestock/DeathDetailsModal';
import DeceasedView from '../components/livestock/DeceasedView';
import BatchMortalityPanel from '../components/livestock/BatchMortalityPanel';
import SharedCostsCard from '../components/livestock/SharedCostsCard';
import SoldView from '../components/livestock/SoldView';
import PoultryFlockOverview from '../components/livestock/PoultryFlockOverview';
import { DEATH_REASONS, groupDeaths, isPoultryType, todayISO, formatDate, relativeDay } from '../components/livestock/livestockUtils';
import { ANIMAL_EMOJI } from '../lib/navigation';
import { notify, celebrate } from '../lib/notify';

// Helper for Age Formatting
const formatAge = (y, m, d) => {
    const parts = [];
    if (y > 0) parts.push(`${y} ${y === 1 ? 'Year' : 'Years'}`);
    if (m > 0) parts.push(`${m} ${m === 1 ? 'Month' : 'Months'}`);
    if (d > 0) parts.push(`${d} ${d === 1 ? 'Day' : 'Days'}`);
    return parts.length > 0 ? parts.join(' ') : '0 Days';
};

// --- PERFORMANCE OPTIMIZED MODAL ---
const GlobalPdfModal = memo(({
    isOpen, onClose,
    globalPdfFilterTypes, setGlobalPdfFilterTypes,
    globalPdfBatchId, setGlobalPdfBatchId,
    globalPdfStartDate, setGlobalPdfStartDate,
    globalPdfEndDate, setGlobalPdfEndDate,
    dataBatches, handleGlobalPdfDownload
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Download Global Sales PDF">
            <div className="space-y-4">
                <p className="text-sm text-gray-600">Select which options to include in your global sales report:</p>

                {/* Types */}
                <div className="flex gap-2 flex-wrap mb-4">
                    {['Goat', 'Sheep', 'Poultry', 'Cow'].map(type => (
                        <label key={type} className="flex items-center gap-2 p-2 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors text-sm">
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 rounded"
                                checked={globalPdfFilterTypes.includes(type)}
                                onChange={(e) => {
                                    if (e.target.checked) setGlobalPdfFilterTypes(prev => [...prev, type]);
                                    else setGlobalPdfFilterTypes(prev => prev.filter(t => t !== type));
                                }}
                            />
                            <span className="font-medium text-gray-700">{type}</span>
                        </label>
                    ))}
                </div>

                {/* Batch Dropdown */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Batch (Optional)</label>
                    <select
                        value={globalPdfBatchId}
                        onChange={e => setGlobalPdfBatchId(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="">All Batches</option>
                        {dataBatches.map(b => (
                            <option key={b.id} value={b.id}>{b.name} ({b.type})</option>
                        ))}
                    </select>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                        <input
                            type="date"
                            value={globalPdfStartDate}
                            onChange={e => setGlobalPdfStartDate(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                        <input
                            type="date"
                            value={globalPdfEndDate}
                            onChange={e => setGlobalPdfEndDate(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button
                        onClick={handleGlobalPdfDownload}
                        disabled={globalPdfFilterTypes.length === 0}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                        Generate PDF
                    </button>
                </div>
            </div>
        </Modal>
    );
});

const Livestock = () => {
    const location = useLocation();
    const { settings } = useSettings();
    const { data, addBatch, updateBatch, deleteAnimalFromBatch, deleteBatch, addExpense, updateExpense, deleteExpense, revertSoldAnimal, recordDeaths, updateDeathDetails, reviveAnimals } = useData();
    const { canEdit, isSuperAdmin, isAdmin } = useAuth();
    const costing = useCosting();
    const { openSell } = useUI();
    const canEditRecords = isSuperAdmin || isAdmin;
    const [selectedBatchId, setSelectedBatchId] = useState(null);

    // Main Tab for Livestock view: 'active' | 'sold' | 'deceased'
    const [mainTab, setMainTab] = useState('active');
    const [isSaving, setIsSaving] = useState(false);

    // Batch Detail Tab: 'animals' | 'expenses' | 'weight' | 'sold'
    const [batchTab, setBatchTab] = useState('animals');

    // Modals State
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [isAnimalModalOpen, setIsAnimalModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

    // Hierarchical View States
    const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);

    // Animal Edit State
    const [editingAnimalId, setEditingAnimalId] = useState(null);
    const [editingAnimalBatchId, setEditingAnimalBatchId] = useState(null);


    // Weight tracking state
    const [selectedAnimalForWeight, setSelectedAnimalForWeight] = useState(null);
    const [weightForm, setWeightForm] = useState({ weight: '', date: new Date().toISOString().split('T')[0] });

    // Forms State
    const [batchForm, setBatchForm] = useState({ name: '', type: 'Goat', startDate: '', status: 'Raising', color: '#3B82F6' });

    const [animalForm, setAnimalForm] = useState({
        count: 1,
        gender: 'Female',
        weight: '',
        cost: '',
        status: 'Healthy',
        ageYears: '',
        ageMonths: '',
        ageDays: '',
        category: 'Kid',
        date: new Date().toISOString().split('T')[0],
        deceasedDate: '',
        deathReason: 'Sickness'
    });

    const [expenseForm, setExpenseForm] = useState({
        type: 'Feed',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
    });

    const [editingBatchExpense, setEditingBatchExpense] = useState(null);

    // Navigation Handler: Quick Jump / dashboard links open a batch directly
    useEffect(() => {
        if (location.state?.selectBatchId) {
            setSelectedBatchId(location.state.selectBatchId);
            setBatchTab('animals');
        } else if (location.state?.tab) {
            setSelectedBatchId(null);
            setMainTab(location.state.tab);
        }
    }, [location.state]);


    // Weight Edit State
    const [editingWeightRecord, setEditingWeightRecord] = useState(null);

    // Expansion State
    const [expandedAnimalId, setExpandedAnimalId] = useState(null);

    // Medical State
    const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
    const [selectedAnimalForMedical, setSelectedAnimalForMedical] = useState(null); // For Filtering History
    const [medicalTargetMode, setMedicalTargetMode] = useState('All'); // 'All' or 'Select'
    const [selectedMedicalAnimals, setSelectedMedicalAnimals] = useState([]); // Array of IDs
    const [editingMedicalRecordId, setEditingMedicalRecordId] = useState(null); // Add Edit State
    const [medicalForm, setMedicalForm] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'Vaccination',
        name: '',
        otherName: '',
        cost: '',
        notes: '',
        addToExpenses: false,
        targetMode: 'All', // 'All', 'Select'
        selectedAnimals: []
    });

    // Collapsible State for Mobile Optimization
    const [isAdultsOpen, setIsAdultsOpen] = useState(false);
    const [isKidsOpen, setIsKidsOpen] = useState(false);

    const toggleAnimalExpand = (id) => {
        setExpandedAnimalId(prev => prev === id ? null : id);
    };



    // Flock Management State (Chicken/Poultry)
    // Mortality: record-death modal (batchId + optional preselected animals) and edit/fix-date modal
    const [deathModal, setDeathModal] = useState({ open: false, batchId: null, presetIds: [] });
    const [deathEditRecord, setDeathEditRecord] = useState(null);
    const [isBulkSaleOpen, setIsBulkSaleOpen] = useState(false);
    const [isFlockEditOpen, setIsFlockEditOpen] = useState(false);

    const [bulkSaleForm, setBulkSaleForm] = useState({ count: '', pricePerAnimal: '', soldDate: new Date().toISOString().split('T')[0] });
    const [flockEditForm, setFlockEditForm] = useState({ avgWeight: '', avgCost: '', status: 'Healthy', notes: '', boughtDate: '', targetGroup: 'Healthy' });

    // Sick Transition State
    // Sick Transition State
    const [isSickTransitionOpen, setIsSickTransitionOpen] = useState(false);
    const [sickTransitionForm, setSickTransitionForm] = useState({ count: '', fromStatus: '', toStatus: '', notes: '' });


    // Dashboard Expansion State

    // Global PDF Modal State
    const [isGlobalPdfModalOpen, setIsGlobalPdfModalOpen] = useState(false);
    const [globalPdfFilterTypes, setGlobalPdfFilterTypes] = useState(['Goat', 'Sheep', 'Poultry', 'Cow']);
    const [globalPdfStartDate, setGlobalPdfStartDate] = useState('');
    const [globalPdfEndDate, setGlobalPdfEndDate] = useState('');
    const [globalPdfBatchId, setGlobalPdfBatchId] = useState('');

    // --- HANDLERS FOR FLOCK ---
    const openRecordDeath = (batchId, presetIds = []) => {
        setDeathModal({ open: true, batchId, presetIds });
    };

    const handleRecordDeaths = async ({ animalIds, date, reason, notes }) => {
        try {
            await recordDeaths(deathModal.batchId, animalIds, { date, reason, notes });
            setDeathModal({ open: false, batchId: null, presetIds: [] });
            notify.success(`${animalIds.length} death${animalIds.length === 1 ? '' : 's'} recorded for ${formatDate(date)}.`, { title: 'Saved with date' });
        } catch (err) {
            console.error('Error recording death:', err);
            notify.error('Could not save. Check your connection and try again.');
        }
    };

    const handleUpdateDeath = async (details) => {
        if (!deathEditRecord) return;
        try {
            await updateDeathDetails(deathEditRecord.batchId, deathEditRecord.ids, details);
            setDeathEditRecord(null);
            notify.success('Death record updated.');
        } catch (err) {
            console.error('Error updating death record:', err);
            notify.error('Could not update this record.');
        }
    };

    const handleUndoSale = async (animal) => {
        if (!window.confirm(`Undo the sale of ${animal.id}? It goes back to ${animal.batchName} as alive.`)) return;
        await revertSoldAnimal(animal.batchId, animal.id);
        notify.info(`${animal.id} is back in ${animal.batchName}.`, { title: 'Sale undone' });
    };

    const handleReviveRecord = async (record) => {
        if (!window.confirm(`Undo this death record for ${record.label}? ${record.count === 1 ? 'The animal' : 'They'} will go back to the batch as alive.`)) return;
        try {
            await reviveAnimals(record.batchId, record.ids);
            notify.info(`${record.label} moved back to the batch.`, { title: 'Death record removed' });
        } catch (err) {
            console.error('Error undoing death:', err);
            notify.error('Could not undo this record.');
        }
    };

    const handleBulkSale = async (e) => {
        e.preventDefault();
        const count = parseInt(bulkSaleForm.count);
        if (isNaN(count) || count <= 0) return alert("Invalid count");

        setIsSaving(true);
        try {
            const active = (selectedBatch?.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased');
            // Sort by ID
            active.sort((a, b) => {
                const numA = parseInt(a.id.split('-').pop());
                const numB = parseInt(b.id.split('-').pop());
                return numA - numB;
            });

            if (count > active.length) {
                setIsSaving(false);
                return alert(`Only ${active.length} active animals available.`);
            }

            const toUpdate = active.slice(0, count);
            const updatedAnimals = (selectedBatch?.animals || []).map(a => {
                if (toUpdate.find(u => u.id === a.id)) {
                    return { ...a, status: 'Sold', soldPrice: Number(bulkSaleForm.pricePerAnimal), soldDate: bulkSaleForm.soldDate };
                }
                return a;
            });

            await updateBatch(selectedBatch.id, { animals: updatedAnimals });
            setIsBulkSaleOpen(false);
            setBulkSaleForm({ count: '', pricePerAnimal: '', soldDate: new Date().toISOString().split('T')[0] });
        } finally {
            setIsSaving(false);
        }
    };

    const handleFlockEdit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Determine target animals based on targetGroup
            const targetStatus = flockEditForm.targetGroup === 'Sick' ? 'Sick' : 'Healthy';

            // Find animals matching the target status (Healthy ones might have undefined or 'Healthy' status)
            const targetAnimals = (selectedBatch?.animals || []).filter(a => {
                const status = a.status || 'Healthy';
                return status === targetStatus;
            });

            const updatedAnimals = (selectedBatch?.animals || []).map(a => {
                const currentStatus = a.status || 'Healthy';

                // Only update animals in the target group
                if (currentStatus === targetStatus) {
                    // Update weight history if changed
                    let newHistory = a.weightHistory || [];
                    if (flockEditForm.avgWeight && Number(flockEditForm.avgWeight) !== Number(a.weight)) {
                        newHistory = [...newHistory, { date: new Date().toISOString().split('T')[0], weight: Number(flockEditForm.avgWeight) }];
                    }

                    // Preserve existing fields if form value is empty/null, otherwise update
                    return {
                        ...a,
                        weight: flockEditForm.avgWeight ? Number(flockEditForm.avgWeight) : a.weight,
                        // Only update status if explicitly changed (though usually this edit is for attributes, not status change)
                        // status: flockEditForm.status || a.status, 
                        // Revised: If we are 'treating' sick animals, maybe we just update weight/notes, not status here. 
                        // Status change is handled by Transition.

                        weightHistory: newHistory,
                        // Apply new fields
                        purchaseCost: flockEditForm.avgCost ? Number(flockEditForm.avgCost) : a.purchaseCost,
                        boughtDate: flockEditForm.boughtDate || a.boughtDate,
                        notes: flockEditForm.notes ? (a.notes ? a.notes + '; ' + flockEditForm.notes : flockEditForm.notes) : a.notes
                    };
                }
                return a;
            });

            await updateBatch(selectedBatch.id, { animals: updatedAnimals });
            setIsFlockEditOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSickTransition = async (e) => {
        e.preventDefault();
        const count = parseInt(sickTransitionForm.count);
        if (isNaN(count) || count <= 0) return alert("Invalid count");

        setIsSaving(true);
        try {
            // Filter source animals (Healthy or Sick)
            const sourceAnimals = (selectedBatch?.animals || []).filter(a => {
                const status = a.status || 'Healthy';
                return status === sickTransitionForm.fromStatus;
            });

            // Sort by ID to take next available
            sourceAnimals.sort((a, b) => {
                const numA = parseInt(a.id.split('-').pop());
                const numB = parseInt(b.id.split('-').pop());
                return numA - numB;
            });

            if (count > sourceAnimals.length) {
                setIsSaving(false);
                return alert(`Only ${sourceAnimals.length} animals available in ${sickTransitionForm.fromStatus} state.`);
            }

            const toUpdate = sourceAnimals.slice(0, count);
            const updatedAnimals = (selectedBatch?.animals || []).map(a => {
                if (toUpdate.find(u => u.id === a.id)) {
                    return { ...a, status: sickTransitionForm.toStatus, notes: sickTransitionForm.notes ? (a.notes ? a.notes + '; ' + sickTransitionForm.notes : sickTransitionForm.notes) : a.notes };
                }
                return a;
            });

            await updateBatch(selectedBatch.id, { animals: updatedAnimals });
            setIsSickTransitionOpen(false);
            setSickTransitionForm({ count: '', fromStatus: '', toStatus: '', notes: '' });
        } finally {
            setIsSaving(false);
        }
    };


    // --- DERIVED DATA ---
    const selectedBatch = data.batches.find(b => b.id === selectedBatchId);

    const handleGlobalPdfDownload = () => {
        try {
            const doc = new jsPDF('landscape');

            // filter allSoldAnimals base on globalPdfFilterTypes
            let filteredSoldAnimals = allSoldAnimals.filter(a => globalPdfFilterTypes.includes(a.batchType));

            if (globalPdfStartDate) {
                filteredSoldAnimals = filteredSoldAnimals.filter(a => new Date(a.soldDate) >= new Date(globalPdfStartDate));
            }
            if (globalPdfEndDate) {
                filteredSoldAnimals = filteredSoldAnimals.filter(a => new Date(a.soldDate) <= new Date(globalPdfEndDate));
            }
            if (globalPdfBatchId) {
                filteredSoldAnimals = filteredSoldAnimals.filter(a => a.batchId === globalPdfBatchId);
            }

            if (filteredSoldAnimals.length === 0) {
                alert("No sold animals found for the selected criteria.");
                setIsGlobalPdfModalOpen(false);
                return;
            }

            const filteredSoldStats = filteredSoldAnimals.reduce((acc, a) => {
                const rev = Number(a.soldPrice) || 0;
                const cost = a.trueCost || 0;
                acc.totalRevenue += rev;
                acc.totalCost += cost;
                acc.totalProfit += (rev - cost);
                return acc;
            }, { totalRevenue: 0, totalCost: 0, totalProfit: 0 });

            doc.setFillColor(41, 128, 185);
            doc.rect(0, 0, 297, 30, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text("Trinetra Farms", 14, 20);

            doc.setTextColor(50, 50, 50);
            doc.setFontSize(16);
            doc.text("Global Sales Report", 14, 40);

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 46);
            doc.text(`Types: ${globalPdfFilterTypes.length === 5 ? 'All' : globalPdfFilterTypes.join(', ')}`, 14, 52);
            doc.text(`Dates: ${globalPdfStartDate ? new Date(globalPdfStartDate).toLocaleDateString() : 'Start'} to ${globalPdfEndDate ? new Date(globalPdfEndDate).toLocaleDateString() : 'Present'}`, 14, 58);
            if (globalPdfBatchId) {
                doc.text(`Batch: ${data.batches.find(b => b.id === globalPdfBatchId)?.name || ''}`, 14, 64);
            }

            doc.text(`Animals Sold: ${filteredSoldAnimals.length}`, 200, 46);
            doc.text(`Total Revenue: Rs. ${filteredSoldStats.totalRevenue.toLocaleString()}`, 200, 52);
            doc.text(`Total Cost: Rs. ${filteredSoldStats.totalCost.toLocaleString()}`, 200, 58);
            doc.text(`Gross Profit: Rs. ${filteredSoldStats.totalProfit.toLocaleString()}`, 200, 64);

            autoTable(doc, {
                startY: 70,
                theme: 'striped',
                styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak', halign: 'center' },
                headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'center' },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                head: [['Batch', 'Type', 'ID', 'Weight', 'Bought', 'Cost (Rs)', 'Expenses', 'Total Cost', 'Sold', 'Price (Rs)', 'Profit (Rs)']],
                body: filteredSoldAnimals.map(a => [
                    a.batchName || 'N/A', a.batchType || 'N/A', a.id, `${a.weight || 0} kg`,
                    a.boughtDate || 'N/A', Math.round(a.originalPrice) || 0, Math.round(a.expenses), Math.round(a.trueCost),
                    a.soldDate || 'N/A', Number(a.soldPrice) || 0,
                    ((Number(a.soldPrice) || 0) - (a.trueCost || 0))
                ])
            });
            doc.save('Trinetra_Farms_Global_Sales_Report.pdf');
            setIsGlobalPdfModalOpen(false);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF. Check console for details.");
        }
    };

    // --- DERIVED DATA MOVED BELOW ---

    // --- HANDLERS ---
    const handleBatchSubmit = async (e) => {
        e.preventDefault();

        // Validation: Cannot complete if there are active animals
        if (batchForm.status === 'Completed') {
            const batchToValidate = selectedBatch || null;
            if (batchToValidate) {
                const activeCount = (batchToValidate.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased').length;
                if (activeCount > 0) {
                    alert(`Cannot mark as Completed. This batch still has ${activeCount} active animals. Sell or mark them as deceased first.`);
                    return;
                }
            }
        }

        setIsSaving(true);
        try {
            if (selectedBatch) {
                await updateBatch(selectedBatch.id, batchForm);
            } else {
                // New Batch: Generate Short ID (G1, S1, P1, C1...)
                // 1. Get Prefix
                const typePrefixMap = { 'Goat': 'G', 'Sheep': 'S', 'Poultry': 'P', 'Chicken': 'P', 'Cow': 'C' }; // Mapping Poultry/Chicken to P as per user
                const prefix = typePrefixMap[batchForm.type] || batchForm.type[0].toUpperCase();

                // 2. Count existing batches of this type
                const existingCount = data.batches.filter(b => {
                    // Match type strictly? Or match prefix? 
                    // If user mixes 'Chicken' and 'Poultry', they should share sequence if mapped to 'P'
                    // But wait, existing batches might not have shortId. 
                    // So we rely on 'type'. 
                    // If batchForm.type is 'Chicken', we count 'Chicken' and 'Poultry'?
                    if (batchForm.type === 'Chicken' || batchForm.type === 'Poultry') {
                        return b.type === 'Chicken' || b.type === 'Poultry';
                    }
                    return b.type === batchForm.type;
                }).length;

                const nextNum = existingCount + 1;
                const newShortId = `${prefix}${nextNum}`;

                await addBatch({ ...batchForm, shortId: newShortId });
            }
            setIsBatchModalOpen(false);
            setBatchForm({ name: '', type: 'Goat', startDate: '', status: 'Raising', color: '#3B82F6' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleMigrateIds = async () => {
        if (!isSuperAdmin) return;
        if (!window.confirm("This will update ALL animal IDs to format 'PREFIX-SUFFIX-NUM' (e.g. GT...-K-1). Proceed?")) return;

        try {
            const updates = data.batches.map(batch => {
                if (!batch.animals || batch.animals.length === 0) return Promise.resolve();

                const updatedAnimals = batch.animals.map(a => {
                    let newId = a.id;
                    const category = a.category || 'Kid';
                    const suffix = category === 'Kid' ? 'K' : 'A';

                    // 1. Check for Legacy: GTJANF26-1
                    const legacyMatch = a.id.match(/^(.*)-(\d+)$/);
                    if (legacyMatch) {
                        const prefix = legacyMatch[1];
                        const num = legacyMatch[2];
                        newId = `${prefix}-${suffix}-${num}`;
                    }
                    // 2. Check for Previous Mistake: GTJANF26-1K
                    else {
                        const mistakeMatch = a.id.match(/^(.*)-(\d+)([KA])$/);
                        if (mistakeMatch) {
                            const prefix = mistakeMatch[1];
                            const num = mistakeMatch[2];
                            newId = `${prefix}-${suffix}-${num}`;
                        }
                        // 3. Check if already correct format but maybe wrong suffix? GTJANF26-K-1
                        else {
                            const correctMatch = a.id.match(/^(.*)-([KA])-(\d+)$/);
                            if (correctMatch) {
                                const prefix = correctMatch[1];
                                const num = correctMatch[3];
                                newId = `${prefix}-${suffix}-${num}`;
                            }
                        }
                    }

                    return { ...a, category, id: newId };
                });

                return updateBatch(batch.id, { animals: updatedAnimals });
            });

            await Promise.all(updates);
            alert("Migration Complete! IDs updated to PREFIX-SUFFIX-NUM format.");
        } catch (error) {
            console.error("Migration Failed:", error);
            alert("Migration Failed");
        }
    };

    const handleAnimalSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Construct Age String
            // Construct Age String
            const y = Number(animalForm.ageYears || 0);
            const m = Number(animalForm.ageMonths || 0);
            const d = Number(animalForm.ageDays || 0); // New Days field
            const formattedAge = formatAge(y, m, d);

            const targetBatch = selectedBatch || data.batches.find(b => b.id === editingAnimalBatchId);

            if (targetBatch) {
                if (editingAnimalId) {
                    // Edit existing animal logic
                    const updatedAnimals = (targetBatch.animals || []).map(a => {
                        if (a.id === editingAnimalId) {
                            // Edit: Update ID if Category changes
                            let newId = a.id;
                            const newCategory = animalForm.category;

                            const match = a.id.match(/^(.*)-([KA])-(\d+)$/);
                            if (match) {
                                const prefix = match[1];
                                const num = match[3];
                                const newSuffix = newCategory === 'Kid' ? 'K' : 'A';
                                newId = `${prefix}-${newSuffix}-${num}`;
                            } else {
                                // Fallback logic for legacy/mistake IDs
                                const legacyMatch = a.id.match(/^(.*)-(\d+)$/);
                                if (legacyMatch) {
                                    const prefix = legacyMatch[1];
                                    const num = legacyMatch[2];
                                    const newSuffix = newCategory === 'Kid' ? 'K' : 'A';
                                    newId = `${prefix}-${newSuffix}-${num}`;
                                } else {
                                    // Check for Mistake format (SUFFIX at end)
                                    const mistakeMatch = a.id.match(/^(.*)-(\d+)([KA])$/);
                                    if (mistakeMatch) {
                                        const prefix = mistakeMatch[1];
                                        const num = mistakeMatch[2];
                                        const newSuffix = newCategory === 'Kid' ? 'K' : 'A';
                                        newId = `${prefix}-${newSuffix}-${num}`;
                                    }
                                }
                            }

                            const updated = {
                                ...a,
                                gender: animalForm.gender,
                                weight: animalForm.weight,
                                purchaseCost: Number(animalForm.cost),
                                status: animalForm.status,
                                age: formattedAge,
                                category: animalForm.category,
                                boughtDate: animalForm.date,
                                id: newId // Update ID
                            };
                            if (animalForm.status === 'Deceased') {
                                // Never save a death without a date
                                updated.deceasedDate = animalForm.deceasedDate || a.deceasedDate || todayISO();
                                updated.deathReason = animalForm.deathReason || a.deathReason || 'Unknown';
                                if (a.status !== 'Deceased') {
                                    updated.statusBeforeDeath = a.status || 'Healthy';
                                    updated.deathRecordedAt = new Date().toISOString();
                                }
                            } else if (a.status === 'Deceased') {
                                delete updated.deceasedDate;
                                delete updated.deathReason;
                                delete updated.deathNotes;
                                delete updated.deathRecordedAt;
                                delete updated.statusBeforeDeath;
                            }
                            return updated;
                        }
                        return a;
                    });

                    // If ID changed, we need to handle reference updates? 
                    // For now, assume just updating the Batch document is enough as references are less critical or handle by user.
                    await updateBatch(targetBatch.id, { animals: updatedAnimals });
                } else {
                    // Add new animals
                    const type = targetBatch.type;
                    const isChickenType = type === 'Chicken' || type === 'Poultry';
                    const typeMap = { 'Goat': 'GT', 'Sheep': 'SH', 'Poultry': 'PL', 'Chicken': 'CH', 'Cow': 'CW' };

                    if (!typeMap[type]) {
                        alert(`Debug Error: Invalid Type '${type}'`);
                        return;
                    }

                    const date = new Date();
                    const month = date.toLocaleString('default', { month: 'short' }).toUpperCase();
                    const year = date.getFullYear().toString().slice(-2);

                    // Gender Logic: If Chicken & 'Both', use 'X' or omit from prefix? User said "generic ID without fm".
                    // Let's use 'X' for internal representation if needed, but for ID generation:
                    // If Chicken, we might skip the Gender char in ID entirely?
                    // Existing types uses: TYPE + MONTH + GENDER + YEAR. e.g. GTJANM26
                    // For Chicken (Generic): CH + JAN + 26 + - + NUM? -> CHJAN26-1
                    let genderChar = animalForm.gender === 'Male' ? 'M' : 'F';
                    if (isChickenType) {
                        genderChar = '';
                    }

                    // Prefix Strategy:
                    // Always calculate the Legacy Base (e.g. GTJANM26 or CHJAN26)
                    let basePrefix = '';

                    let batchCode = '';
                    if (isChickenType) {
                        const cleanName = targetBatch.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                        batchCode = cleanName.substring(0, 3) || '000';
                        if (batchCode.length < 3) batchCode = batchCode.padEnd(3, 'X');
                    }

                    basePrefix = isChickenType
                        ? `${typeMap[type] || 'CH'}${month}${year}-${batchCode}`
                        : `${typeMap[type] || type.substring(0, 2).toUpperCase()}${month}${genderChar}${year}`;

                    // If ShortID exists (G1), prepend it -> G1-GTJANM26
                    const fullPrefix = targetBatch.shortId
                        ? `${targetBatch.shortId}-${basePrefix}`
                        : basePrefix;

                    // Category Logic: Chicken has no category distinction in ID
                    const useSuffix = !isChickenType;
                    const category = animalForm.category || 'Kid';

                    // Define strategy based on shortId presence
                    const useShortIdStrategy = !!targetBatch.shortId;

                    // Find max sequence
                    const allAnimalsOfType = data.batches
                        .filter(b => b.type === type)
                        .flatMap(b => b.animals || []);

                    let maxNum = 0;
                    // Suffix for the NEW animals being added
                    const newSuffix = category === 'Kid' ? 'K' : 'A';

                    allAnimalsOfType.forEach(a => {
                        if (a.id && a.id.startsWith(fullPrefix)) {
                            // Universal approach: Get the part AFTER the fullPrefix
                            // fullPrefix: "G1-GTJANM26" or "GTJANM26"
                            // ID: "G1-GTJANM26-K-1"
                            const rest = a.id.substring(fullPrefix.length);
                            // rest: "-K-1" or "-1"
                            const parts = rest.split('-');
                            // parts: ["", "K", "1"] or ["", "1"]

                            // Check if this animal has the SAME suffix as the one we are adding
                            // If isChickenType, there is no suffix, so we just count.
                            // If NOT chicken, we look for the suffix in parts.

                            if (isChickenType) {
                                const lastPart = parts[parts.length - 1];
                                const num = parseInt(lastPart);
                                if (!isNaN(num) && num > maxNum) maxNum = num;
                            } else {
                                // Expected format for others: ["", "SUFFIX", "NUM"]
                                // parts[1] is suffix, parts[2] is num OR parts[parts.length - 2] = suffix
                                const currentSuffix = parts.length >= 3 ? parts[parts.length - 2] : null;
                                const lastPart = parts[parts.length - 1];
                                const num = parseInt(lastPart);

                                // Only increment counter if the Suffix matches (e.g. only count K for K, A for A)
                                if (currentSuffix === newSuffix) {
                                    if (!isNaN(num) && num > maxNum) maxNum = num;
                                }
                            }

                        } else if (a.id && useShortIdStrategy && a.id.startsWith(targetBatch.shortId + '-')) {
                            // Backup check: If fullPrefix logic missed (e.g. prefixBase different), check ShortID match
                            // CAUTION: This backup logic might mix suffixes if we aren't careful.
                            // However, strictly speaking, we should rely on prefix matching suffix.
                            // If we fall back here, we might just take the max number found regardless of suffix? 
                            // Or try to parse it too.

                            if (isChickenType) {
                                const parts = a.id.split('-');
                                const num = parseInt(parts[parts.length - 1]);
                                if (!isNaN(num) && num > maxNum) maxNum = num;
                            } else {
                                const parts = a.id.split('-');
                                // format P1-GT...-K-1
                                const currentSuffix = parts.length >= 3 ? parts[parts.length - 2] : null;
                                if (currentSuffix === newSuffix) {
                                    const num = parseInt(parts[parts.length - 1]);
                                    if (!isNaN(num) && num > maxNum) maxNum = num;
                                }
                            }
                        }
                    });

                    const suffix = category === 'Kid' ? 'K' : 'A';

                    const newAnimals = Array.from({ length: Number(animalForm.count) }).map((_, i) => {
                        maxNum++;
                        // ID Gen: [FULL_PREFIX]-[SUFFIX?]-[NUM]
                        // fullPrefix already contains ShortID if applicable.

                        let sequentialId;
                        if (isChickenType) {
                            // Chicken: No Suffix
                            // Format: P1-CHJAN26-ABC-1
                            sequentialId = `${fullPrefix}-${maxNum}`;
                        } else {
                            // Others: With Suffix (K/A)
                            // Format: G1-GTJANM26-K-1
                            sequentialId = `${fullPrefix}-${suffix}-${maxNum}`;
                        }

                        // FIX: Use the selected/calculated date for both boughtDate and Initial Weight Date
                        const entryDate = animalForm.date || targetBatch.date || targetBatch.startDate || new Date().toISOString().split('T')[0];

                        return {
                            id: sequentialId,
                            gender: animalForm.gender,
                            weight: animalForm.weight,
                            status: animalForm.status,
                            purchaseCost: Number(animalForm.cost),
                            boughtDate: entryDate,
                            age: formattedAge,
                            category: category,
                            weightHistory: [{
                                date: entryDate,
                                weight: Number(animalForm.weight)
                            }],
                            ...(animalForm.status === 'Deceased' ? {
                                deceasedDate: animalForm.deceasedDate || todayISO(),
                                deathReason: animalForm.deathReason || 'Unknown',
                                deathRecordedAt: new Date().toISOString()
                            } : {})
                        };
                    });

                    const updatedAnimals = [...(targetBatch.animals || []), ...newAnimals];
                    await updateBatch(targetBatch.id, { animals: updatedAnimals });
                }
            }

            setIsAnimalModalOpen(false);
            notify.success(editingAnimalId ? 'Animal updated.' : `${animalForm.count} animal${Number(animalForm.count) === 1 ? '' : 's'} added to the batch.`);
            if (!editingAnimalId) celebrate(['🐣', '✨', ANIMAL_EMOJI[targetBatch?.type] || '🐾']);
            setAnimalForm({ count: 1, gender: 'Female', weight: '', cost: '', status: 'Healthy', ageYears: '', ageMonths: '', ageDays: '', category: 'Kid', date: new Date().toISOString().split('T')[0], deceasedDate: '', deathReason: 'Sickness' });
        } catch (error) {
            notify.error('Could not save the animals. Please try again.');
            console.error('Error adding animals:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleMedicalAnimalSelection = (animalId) => {
        setSelectedMedicalAnimals(prev =>
            prev.includes(animalId) ? prev.filter(id => id !== animalId) : [...prev, animalId]
        );
    };

    const handleMedicalSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBatch) return;

        setIsSaving(true);
        try {
            let recordName = medicalForm.name === 'Other' ? medicalForm.otherName : medicalForm.name;

            // For De-worming, auto-set name if empty
            if (medicalForm.type === 'De-worming') {
                recordName = recordName || "De-worming";
            }

            if (!recordName) {
                setIsSaving(false);
                alert("Please select or enter a medicine name");
                return;
            }

            // Determine Target Animals using explicit state
            let targetIds = [];
            if (medicalTargetMode === 'All') {
                targetIds = (selectedBatch.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased').map(a => a.id);
            } else if (medicalTargetMode === 'ActiveFlock') {
                targetIds = (selectedBatch.animals || []).filter(a => (a.status === 'Healthy' || !a.status) && a.status !== 'Sold' && a.status !== 'Deceased' && a.status !== 'Sick').map(a => a.id);
            } else if (medicalTargetMode === 'SickBay') {
                targetIds = (selectedBatch.animals || []).filter(a => a.status === 'Sick').map(a => a.id);
            } else {
                targetIds = selectedMedicalAnimals;
            }

            if (targetIds.length === 0) {
                setIsSaving(false);
                alert("No animals selected for this record.");
                return;
            }

            if (editingMedicalRecordId) {
                // UPDATE Existing Record
                const originalRecord = (selectedBatch.medical || []).find(r => r.id === editingMedicalRecordId);
                let expenseId = originalRecord?.expenseId;

                // Expense Logic for Edit
                if (medicalForm.addToExpenses) {
                    const expenseData = {
                        category: 'Medical',
                        description: `${medicalForm.type}: ${recordName}`,
                        amount: Number(medicalForm.cost),
                        date: medicalForm.date,
                        batchId: selectedBatch.id,
                        paidTo: 'Pharmacy/Vet'
                    };

                    if (expenseId) {
                        // Update existing expense
                        await updateExpense(expenseId, expenseData);
                    } else {
                        // Create new expense if not existed
                        expenseId = await addExpense(expenseData);
                    }
                }

                const updatedMedical = (selectedBatch.medical || []).map(rec => {
                    if (rec.id === editingMedicalRecordId) {
                        return {
                            ...rec,
                            date: medicalForm.date,
                            type: medicalForm.type,
                            name: recordName,
                            cost: Number(medicalForm.cost) || 0,
                            notes: medicalForm.notes,
                            animalIds: targetIds,
                            expenseId: expenseId // Save/Preserve linked ID
                        };
                    }
                    return rec;
                });
                // FIX: Do NOT spread ...selectedBatch. Only update 'medical'.
                // Using spread overwrites 'expenses' with stale data, undoing addExpense/updateExpense effects on Batch doc.
                await updateBatch(selectedBatch.id, { medical: updatedMedical });
            } else {
                // ADD New Record
                let expenseId = null;

                if (medicalForm.addToExpenses && Number(medicalForm.cost) > 0) {
                    // Create Expense First
                    expenseId = await addExpense({
                        date: medicalForm.date,
                        category: 'Medical',
                        description: `${medicalForm.type}: ${recordName}`,
                        amount: Number(medicalForm.cost),
                        batchId: selectedBatch.id,
                        paidTo: 'Pharmacy/Vet'
                    });
                }

                const newRecord = {
                    id: Date.now().toString(),
                    date: medicalForm.date,
                    type: medicalForm.type,
                    name: recordName,
                    cost: Number(medicalForm.cost) || 0,
                    notes: medicalForm.notes,
                    animalIds: targetIds,
                    expenseId: expenseId // Link ID
                };

                const updatedMedical = [...(selectedBatch.medical || []), newRecord];

                // FIX: Do NOT spread ...selectedBatch. Only update 'medical'.
                // addExpense (if called) has already updated the 'expenses' field in the DB.
                // Sending old 'expenses' here would race and overwrite it.
                await updateBatch(selectedBatch.id, { medical: updatedMedical });
            }

            setIsMedicalModalOpen(false);
            setEditingMedicalRecordId(null);
            setMedicalForm({
                date: new Date().toISOString().split('T')[0],
                type: 'Vaccination',
                name: '',
                otherName: '',
                cost: '',
                notes: '',
                addToExpenses: false
            });
            setMedicalTargetMode('All');
            setSelectedMedicalAnimals([]);

        } catch (err) {
            console.error("Error saving medical record:", err);
            alert("Failed to save: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteMedicalRecord = (recordId) => {
        if (!selectedBatch || !window.confirm("Delete this medical record?")) return;
        const updatedMedical = (selectedBatch.medical || []).filter(r => r.id !== recordId);
        updateBatch(selectedBatch.id, { medical: updatedMedical });
    };

    const handleDeleteAnimal = (animalId) => {
        if (!canEdit) return;
        if (window.confirm('Are you sure you want to delete this animal?')) {
            deleteAnimalFromBatch(selectedBatch.id, animalId);
        }
    };

    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (selectedBatch) {
                if (editingBatchExpense) {
                    // Edit Mode
                    await updateExpense(editingBatchExpense.id, {
                        ...expenseForm,
                        amount: Number(expenseForm.amount),
                        category: expenseForm.type
                    });
                    setEditingBatchExpense(null);
                } else {
                    // Add Mode
                    // FIX: Use addExpense from context to ensure it syncs to global expenses
                    // The context function handles adding to 'expenses' collection AND updating the 'batch' document
                    await addExpense({
                        ...expenseForm,
                        amount: Number(expenseForm.amount), // Ensure number
                        category: expenseForm.type, // Map type to category
                        batchId: selectedBatch.id,
                        date: expenseForm.date || new Date().toISOString().split('T')[0]
                    });
                }
            }
            setIsExpenseModalOpen(false);
            setExpenseForm({
                type: 'Feed',
                description: '',
                amount: '',
                date: new Date().toISOString().split('T')[0]
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteBatch = async () => {
        if (!canEdit) return;
        if (window.confirm('Are you sure you want to delete this ENTIRE batch? This action cannot be undone.')) {
            await deleteBatch(selectedBatch.id);
            setSelectedBatchId(null);
        }
    };

    const openEditBatchExpenseModal = (exp) => {
        setEditingBatchExpense(exp);
        setExpenseForm({
            type: exp.type || 'Feed',
            description: exp.description || '',
            amount: exp.amount?.toString() || '',
            date: exp.date || new Date().toISOString().split('T')[0]
        });
        setIsExpenseModalOpen(true);
    };

    const openEditMedicalRecordModal = (record) => {
        setEditingMedicalRecordId(record.id);

        // Determine Target Mode
        const allActiveIds = (selectedBatch.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased').map(a => a.id);
        const recordIds = record.animalIds || [];
        const isAll = recordIds.length > 0 && recordIds.length === allActiveIds.length && recordIds.every(id => allActiveIds.includes(id));

        setMedicalTargetMode(isAll ? 'All' : 'Select');
        setSelectedMedicalAnimals(recordIds);

        setMedicalForm({
            date: record.date,
            type: record.type,
            name: record.name === 'De-worming' ? '' : (record.name || ''),
            otherName: (settings?.vaccineNames || []).includes(record.name) || (settings?.medicineNames || []).includes(record.name) ? '' : record.name,
            cost: record.cost,
            notes: record.notes,
            // FIX: If record has an expenseId, check the box.
            // Also assume if cost > 0 and it's being edited, user might want to check it, 
            // but rely on expenseId for source of truth if available.
            addToExpenses: !!record.expenseId
        });
        setIsMedicalModalOpen(true);
    };

    const handleDeleteBatchExpenseItem = async (expenseId) => {
        if (!isSuperAdmin) return;
        if (window.confirm('Delete this expense?')) {
            // Update Batch State First
            const updatedExpenses = (selectedBatch.expenses || []).filter(e => e.id !== expenseId);
            await updateBatch(selectedBatch.id, { expenses: updatedExpenses });

            // Delete global expense document
            await deleteExpense(expenseId);
        }
    };

    // Selling uses the app-wide sell flow (also reachable from Home)
    const openSellModal = () => openSell({ batchId: selectedBatch.id });

    const handleWeightSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBatch) return;

        // Group Logic for Poultry
        let targetIds = [];
        if (selectedAnimalForWeight === 'Active') {
            targetIds = (selectedBatch.animals || []).filter(a => (a.status === 'Healthy' || !a.status) && a.status !== 'Sold' && a.status !== 'Deceased' && a.status !== 'Sick').map(a => a.id);
        } else if (selectedAnimalForWeight === 'Sick') {
            targetIds = (selectedBatch.animals || []).filter(a => a.status === 'Sick').map(a => a.id);
        } else if (selectedAnimalForWeight) {
            targetIds = [selectedAnimalForWeight];
        } else {
            return;
        }

        setIsSaving(true);
        try {
            const newWeight = Number(weightForm.weight);
            const date = weightForm.date;

            // Prepare Bulk Updates
            const updatedAnimals = (selectedBatch.animals || []).map(a => {
                if (targetIds.includes(a.id)) {
                    // Update current weight and history
                    const history = a.weightHistory || [];

                    // Check if date exists, update or append
                    // For bulk, let's just append or replace last if same date? 
                    // To be safe/clean: Remove any existing entry for this date, then add new.
                    const newHistory = history.filter(h => h.date !== date);
                    newHistory.push({ date, weight: newWeight });

                    return { ...a, weight: newWeight, weightHistory: newHistory };
                }
                return a;
            });

            await updateBatch(selectedBatch.id, { animals: updatedAnimals });

            /* Legacy Individual Logic (Disabled/Replaced by Bulk above)
            if (editingWeightRecord) {
                await updateWeightRecord(selectedBatch.id, selectedAnimalForWeight, editingWeightRecord.date, weightForm.date, Number(weightForm.weight));
            } else {
                await addWeightRecord(selectedBatch.id, selectedAnimalForWeight, Number(weightForm.weight), weightForm.date);
            }
            */

            setIsWeightModalOpen(false);
            setEditingWeightRecord(null);
            setWeightForm({ weight: '', date: new Date().toISOString().split('T')[0] });
        } catch (error) {
            console.error("Error saving weight:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const openBatchModal = (batch = null) => {
        if (batch) {
            setBatchForm({
                name: batch.name,
                type: batch.type,
                startDate: batch.startDate || batch.date || '', // Fix: Handle both date keys
                status: batch.status || 'Raising', // Fix: Preserve existing status
                color: batch.color || '#3B82F6'
            });
        } else {
            setBatchForm({ name: '', type: 'Goat', startDate: '', status: 'Raising', color: '#3B82F6' });
        }
        setIsBatchModalOpen(true);
    };

    const openAnimalModal = (animal = null) => {
        if (animal) {
            setEditingAnimalId(animal.id);
            setEditingAnimalBatchId(animal.batchId || selectedBatch?.id);
            // Parse formatted Age string back to numbers
            // Expects "X Year(s) Y Month(s)"
            let y = 0, m = 0;
            if (animal.age) {
                const match = animal.age.match(/(\d+)\s*Year/i);
                const matchM = animal.age.match(/(\d+)\s*Month/i);
                if (match) y = parseInt(match[1]);
                if (matchM) m = parseInt(matchM[1]);

                // Fallback for simple numbers if any (legacy "3" -> 0 years 3 months? No, assume legacy is months for kids?)
                // If parsing fails completely (y=0, m=0 but age string exists and is not empty/0-0-0)
                // Let's stick to simple regex for now. Users can correct.
            }
            setAnimalForm({
                count: 1,
                gender: animal.gender,
                weight: animal.weight,
                cost: animal.purchaseCost,
                status: animal.status,
                ageYears: y,
                ageMonths: m,
                category: animal.category,
                date: animal.boughtDate || '',
                deceasedDate: animal.deceasedDate || '',
                deathReason: animal.deathReason || 'Sickness'
            });
        } else {
            setEditingAnimalId(null);
            setAnimalForm({ count: 1, gender: 'Female', weight: '', cost: '', status: 'Healthy', ageYears: '', ageMonths: '', ageDays: '', category: 'Kid', date: todayISO(), deceasedDate: '', deathReason: 'Sickness' });
        }
        setIsAnimalModalOpen(true);
    };

    // Batch numbers use the batch's OWN costs only (animals + batch-linked expenses).
    // Shared farm costs (salaries, yearly bills, general expenses) are reported separately
    // via costing.sharedFor() and never folded into these figures.
    const calculateBatchFinancials = (batch) => {
        if (!batch) return {};

        const { animals, totalAnimalCost, batchExpenses, totalInvested } = batchOwnCosts(batch);
        const activeAnimals = animals.filter(a => a.status !== 'Sold' && a.status !== 'Deceased');
        const soldAnimals = animals.filter(a => a.status === 'Sold');
        const deceasedAnimals = animals.filter(a => a.status === 'Deceased');
        const shared = costing.sharedFor(batch.id);

        // Days active
        const startDate = new Date(batch.startDate || batch.date || batch.createdAt || Date.now());
        const daysActive = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24)) || 1;

        const soldRevenue = soldAnimals.reduce((sum, a) => sum + (Number(a.soldPrice) || 0), 0);
        const deceasedLoss = deceasedAnimals.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0);

        const marginMultiplier = 1 + costing.margin / 100;
        const perAnimal = (n) => (animals.length > 0 ? n / animals.length : 0);
        const totalPerAnimalCost = perAnimal(totalInvested);
        const minSellPrice = totalPerAnimalCost * marginMultiplier;

        return {
            totalInvested,
            totalAnimalCost,
            operationalCost: batchExpenses,
            sharedTotal: shared.total,
            sharedThisMonth: shared.thisMonth,
            sharedPercent: shared.percentNow,
            minSellPrice,
            minSellPriceWithShared: perAnimal(totalInvested + shared.total) * marginMultiplier,
            daysActive,
            activeAnimals: activeAnimals.length,
            soldAnimals: soldAnimals.length,
            deceasedAnimals: deceasedAnimals.length,
            soldRevenue,
            totalRevenue: soldRevenue,
            deceasedLoss,
            // Per Animal Stats
            totalPerAnimalCost,
            specificExpensePerAnimal: perAnimal(batchExpenses),
            purchaseCostPerAnimal: perAnimal(totalAnimalCost),
            sharedPerAnimal: perAnimal(shared.total)
        };
    };


    // Per-animal break-even (own costs only): purchase price + its share of batch expenses,
    // weighted by purchase price. Shared farm costs are excluded on purpose.
    const calculateAnimalBreakEven = (animal, batch) => {
        if (!batch || !animal) return { originalPrice: 0, expenses: 0, trueCost: 0 };
        const c = animalCostBreakdown(animal, batch);
        return {
            originalPrice: c.purchase,
            expenses: Math.round(c.batchShare),
            trueCost: Math.round(c.base)
        };
    };

    const allSoldAnimals = useMemo(() => {
        return data.batches.flatMap(b => (b.animals || [])
            .filter(a => a.status === 'Sold')
            .map(a => {
                const costs = calculateAnimalBreakEven(a, b);
                return { ...a, batchId: b.id, batchName: b.name, batchType: b.type, batchColor: b.color, originalPrice: costs.originalPrice, expenses: costs.expenses, trueCost: costs.trueCost };
            })
        ).sort((a, b) => new Date(b.soldDate || 0) - new Date(a.soldDate || 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.batches]);


    const allDeceasedAnimals = useMemo(() => {
        return data.batches.flatMap(b => (b.animals || [])
            .filter(a => a.status === 'Deceased')
            .map(a => {
                const costs = calculateAnimalBreakEven(a, b);
                return { ...a, batchId: b.id, batchName: b.name, batchType: b.type, batchColor: b.color, originalPrice: costs.originalPrice, expenses: costs.expenses, trueCost: costs.trueCost };
            })
        ).sort((a, b) => new Date(b.deceasedDate || 0) - new Date(a.deceasedDate || 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.batches]);


    // --- SHARED UI (used by every view below) ---
    const liveBatchCount = data.batches.filter(b => b.status !== 'Completed').length;
    const completedBatchCount = data.batches.filter(b => b.status === 'Completed').length;

    const mainTabsBar = (
        <SegmentedTabs
            layoutId="livestock-main-tab"
            value={mainTab}
            onChange={setMainTab}
            tabs={[
                { id: 'active', label: 'Batches', emoji: '🐐', count: liveBatchCount },
                { id: 'sold', label: 'Sold', emoji: '💰', count: allSoldAnimals.length },
                { id: 'deceased', label: 'Deceased', emoji: '🕊️', count: allDeceasedAnimals.length },
                { id: 'completed', label: 'Completed', emoji: '🏆', count: completedBatchCount }
            ]}
        />
    );

    const deathModalBatch = data.batches.find(b => b.id === deathModal.batchId);

    const sharedModals = (
        <>
            <RecordDeathModal
                isOpen={deathModal.open}
                onClose={() => setDeathModal({ open: false, batchId: null, presetIds: [] })}
                batch={deathModalBatch}
                presetAnimalIds={deathModal.presetIds}
                lossFor={(a) => calculateAnimalBreakEven(a, deathModalBatch).trueCost || 0}
                onSubmit={handleRecordDeaths}
            />
            <DeathDetailsModal
                isOpen={!!deathEditRecord}
                onClose={() => setDeathEditRecord(null)}
                record={deathEditRecord}
                onSubmit={handleUpdateDeath}
            />
        </>
    );

    const openBatchFromList = (batchId) => {
        setSelectedBatchId(batchId);
        setBatchTab('animals');
        setMainTab('active');
    };

    // --- RENDER: MAIN LIST ---
    if (!selectedBatch) {
        if (mainTab === 'sold') {
            return (
                <div className="space-y-6">
                    <PageHeader
                        section="livestock"
                        title="Sold animals"
                        subtitle="Every sale across all batches — tap one to see each animal in it."
                        actions={
                            <button onClick={() => setIsGlobalPdfModalOpen(true)} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-2xl font-bold shadow-[0_3px_0_#075985]">
                                <FileDown className="w-4 h-4" /> Download PDF
                            </button>
                        }
                    />
                    {mainTabsBar}
                    {sharedModals}



                    <SoldView
                        animals={allSoldAnimals}
                        canUndo={isSuperAdmin}
                        onUndo={handleUndoSale}
                        onOpenBatch={openBatchFromList}
                    />
                </div>
            );
        }

        if (mainTab === 'deceased') {
            return (
                <div className="space-y-6">
                    <PageHeader
                        section="livestock"
                        emoji="🕊️"
                        title="Deceased animals"
                        subtitle="Every loss with its date and cause, so you can spot problems early."
                        tips={[
                            'Record deaths from inside a batch with “Record death” — the date and reason are saved.',
                            'Old records with no date are flagged in yellow. Tap “Fix dates” to add them.',
                            'Entered one by mistake? The undo arrow puts the animal back in its batch.'
                        ]}
                    />
                    {mainTabsBar}
                    {sharedModals}
                    <DeceasedView
                        animals={allDeceasedAnimals}
                        canEdit={canEdit}
                        canUndo={isSuperAdmin}
                        onEditRecord={setDeathEditRecord}
                        onReviveRecord={handleReviveRecord}
                        onOpenBatch={openBatchFromList}
                    />
                </div>
            );
        }

        // Active Batches View
        const visibleBatches = data.batches.filter(batch => {
            if (mainTab === 'completed') return batch.status === 'Completed';
            // Default to active/raising view (show everything NOT completed)
            return batch.status !== 'Completed';
        });

        return (
            <div className="space-y-6">
                <PageHeader
                    section="livestock"
                    title={mainTab === 'completed' ? 'Completed batches' : 'Livestock batches'}
                    actions={
                        <button
                            onClick={() => openBatchModal()}
                            className="flex items-center gap-2 bg-forest hover:bg-green-900 text-white px-5 py-3 rounded-2xl font-bold shadow-[0_3px_0_#0b2416]"
                        >
                            <Plus className="w-5 h-5" />
                            New batch
                        </button>
                    }
                />

                {mainTabsBar}
                {sharedModals}

                {visibleBatches.length === 0 ? (
                    <EmptyState
                        emoji={mainTab === 'completed' ? '🏆' : '🐣'}
                        title={mainTab === 'completed' ? 'No completed batches yet' : 'Start your first batch'}
                        message={mainTab === 'completed'
                            ? 'When every animal in a batch is sold or accounted for, mark it Completed from the batch’s edit screen.'
                            : 'A batch is a group of animals you bought or raised together — like “Diwali goats 2026”. Create one, then add animals to it.'}
                        action={mainTab !== 'completed' && (
                            <button onClick={() => openBatchModal()} className="flex items-center gap-2 bg-forest text-white px-5 py-3 rounded-2xl font-bold shadow-[0_3px_0_#0b2416]">
                                <Plus className="w-5 h-5" /> Create a batch
                            </button>
                        )}
                    />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {visibleBatches.map(batch => {
                            const f = calculateBatchFinancials(batch);
                            const animals = batch.animals || [];
                            const total = animals.length || 1;
                            const sickCount = animals.filter(a => a.status === 'Sick').length;
                            const healthyCount = f.activeAnimals - sickCount;
                            const segments = [
                                { n: healthyCount, cls: 'bg-green-500', label: 'healthy' },
                                { n: sickCount, cls: 'bg-orange-400', label: 'sick' },
                                { n: f.soldAnimals, cls: 'bg-sky-400', label: 'sold' },
                                { n: f.deceasedAnimals, cls: 'bg-red-400', label: 'lost' }
                            ];
                            const accent = batch.color || '#2ea44f';
                            return (
                                <motion.button
                                    type="button"
                                    whileHover={{ y: -4 }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                    key={batch.id}
                                    onClick={() => openBatchFromList(batch.id)}
                                    className="group relative text-left bg-white rounded-3xl shadow-sm hover:shadow-lg ring-1 ring-gray-200 overflow-hidden"
                                >
                                    <div className="absolute inset-x-0 top-0 h-20 opacity-[0.14]" style={{ background: `linear-gradient(135deg, ${accent}, transparent 75%)` }} />
                                    <div className="relative p-4 pb-3">
                                        <div className="flex items-start gap-3">
                                            <span className="grid place-items-center w-12 h-12 rounded-2xl bg-white shadow-md ring-1 ring-black/5 text-2xl shrink-0 group-hover:animate-wiggle">
                                                {ANIMAL_EMOJI[batch.type] || '🐾'}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-semibold text-lg leading-tight truncate" style={{ color: accent }}>{batch.name}</h3>
                                                <p className="text-xs text-gray-500 font-semibold mt-0.5">
                                                    {batch.type}{batch.shortId && <> · <span className="font-mono">#{batch.shortId}</span></>} · day {f.daysActive}
                                                </p>
                                            </div>
                                            <span className="shrink-0 rounded-full bg-green-100 text-green-800 px-2.5 py-1 text-xs font-bold">{f.activeAnimals} alive</span>
                                        </div>

                                        {/* Health bar */}
                                        <div className="mt-4 flex h-2.5 rounded-full overflow-hidden bg-gray-100" title={segments.map(sg => `${sg.n} ${sg.label}`).join(' · ')}>
                                            {segments.map(sg => sg.n > 0 && (
                                                <motion.span
                                                    key={sg.label}
                                                    className={sg.cls}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(sg.n / total) * 100}%` }}
                                                    transition={{ type: 'spring', stiffness: 90, damping: 18, delay: 0.15 }}
                                                />
                                            ))}
                                        </div>
                                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-semibold text-gray-500">
                                            {sickCount > 0 && <span className="text-orange-600">● {sickCount} sick</span>}
                                            {f.soldAnimals > 0 && <span className="text-sky-600">● {f.soldAnimals} sold</span>}
                                            {f.deceasedAnimals > 0 && <span className="text-red-600">● {f.deceasedAnimals} lost</span>}
                                            {sickCount + f.soldAnimals + f.deceasedAnimals === 0 && <span className="text-green-700">● all healthy</span>}
                                        </div>
                                    </div>

                                    <div className="relative grid grid-cols-2 gap-px bg-gray-100 border-t border-gray-100 no-entrance">
                                        <div className="bg-white px-4 py-2.5">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Invested</p>
                                            <p className="font-bold text-gray-800">₹{Math.round(f.totalInvested).toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="bg-white px-4 py-2.5 text-right">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cost / animal</p>
                                            <p className="font-bold text-gray-800">₹{Math.round(f.totalPerAnimalCost).toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="bg-white px-4 py-2.5">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sold revenue</p>
                                            <p className="font-bold text-sky-700">₹{Math.round(f.soldRevenue || 0).toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="bg-white px-4 py-2.5 text-right">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Min. sell price</p>
                                            <p className="font-bold text-green-700">₹{Math.round(f.minSellPrice).toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>
                                    {(f.sharedTotal || 0) > 0 && (
                                        <p className="relative px-4 py-2 text-[11px] text-amber-800 bg-amber-50/70 font-semibold">
                                            + ₹{Math.round(f.sharedTotal).toLocaleString('en-IN')} shared farm costs · not included above
                                        </p>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                )}


                {/* Modals for List View */}
                <Modal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} title="Create a new batch" subtitle="A group of animals you raise together" emoji="🐣">
                    <form onSubmit={handleBatchSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
                            <input required type="text" value={batchForm.name} onChange={e => setBatchForm({ ...batchForm, name: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-green-500/20 outline-none" placeholder="e.g., Spring 2024 Goats" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Livestock Type</label>
                            <select value={batchForm.type} onChange={e => setBatchForm({ ...batchForm, type: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-green-500/20 outline-none">
                                <option value="Goat">Goat</option>
                                <option value="Sheep">Sheep</option>
                                <option value="Poultry">Poultry</option>
                                <option value="Cow">Cow</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input required type="date" value={batchForm.startDate} onChange={e => setBatchForm({ ...batchForm, startDate: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-green-500/20 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Color</label>
                            <div className="flex gap-2 flex-wrap items-center">
                                {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'].map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setBatchForm({ ...batchForm, color })}
                                        className={`w-8 h-8 rounded-full border-2 ${batchForm.color === color ? 'border-gray-800 ring-2 ring-offset-2 ring-gray-300' : 'border-transparent'}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                                {/* Custom Color Picker */}
                                <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 cursor-pointer" title="Custom Color">
                                    <input
                                        type="color"
                                        value={batchForm.color || '#3B82F6'}
                                        onChange={e => setBatchForm({ ...batchForm, color: e.target.value })}
                                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={() => setIsBatchModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button type="submit" disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : 'Create Batch'}
                            </button>
                        </div>
                    </form>
                </Modal>



            </div>
        );
    }

    // --- RENDER: BATCH DETAILS VIEW ---
    const financials = calculateBatchFinancials(selectedBatch);

    // Derived Animal Lists for Dashboard
    // 'Active' (Healthy) means status is 'Healthy' or undefined (legacy default), AND not Sold/Deceased/Sick
    const activeAnimals = (selectedBatch?.animals || []).filter(a => (a.status === 'Healthy' || !a.status) && a.status !== 'Sold' && a.status !== 'Deceased' && a.status !== 'Sick');
    const sickAnimals = (selectedBatch?.animals || []).filter(a => a.status === 'Sick');
    const deceasedAnimals = (selectedBatch?.animals || []).filter(a => a.status === 'Deceased');
    const soldAnimals = (selectedBatch?.animals || []).filter(a => a.status === 'Sold');
    const soldRevenue = soldAnimals.reduce((sum, a) => sum + (Number(a.soldPrice) || 0), 0);

    // Goats/sheep/cows: show sick animals in the herd list too (they used to disappear from it)
    const herdAnimals = (selectedBatch?.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased');
    const isAdultAnimal = (a) => a.category === 'Adult' || a.category === 'Parent';
    const batchDeathRecords = groupDeaths(allDeceasedAnimals.filter(a => a.batchId === selectedBatch.id));
    const lastDeath = batchDeathRecords.find(r => r.date);
    const isFlock = isPoultryType(selectedBatch.type);
    const accent = selectedBatch.color || '#2ea44f';

    return (
        <div className="space-y-6">
            {sharedModals}
            {/* Header & Back */}
            <button onClick={() => setSelectedBatchId(null)} className="inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-gray-200 shadow-sm px-4 py-2 text-sm font-bold text-gray-600 hover:text-forest">
                <ArrowLeft className="w-4 h-4" /> All batches
            </button>

            <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2rem] bg-white ring-1 ring-gray-200 shadow-md"
            >
                <div className="absolute inset-0 opacity-[0.12]" style={{ background: `radial-gradient(circle at 0% 0%, ${accent}, transparent 60%)` }} />
                <div className="relative p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-5">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                        <motion.span
                            initial={{ scale: 0.4, rotate: -25 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 14 }}
                            className="grid place-items-center w-14 h-14 sm:w-20 sm:h-20 rounded-3xl bg-white shadow-lg ring-1 ring-black/5 text-3xl sm:text-5xl shrink-0"
                        >
                            <span className="animate-float inline-block">{ANIMAL_EMOJI[selectedBatch.type] || '🐾'}</span>
                        </motion.span>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl sm:text-4xl leading-tight" style={{ color: accent }}>{selectedBatch.name}</h1>
                                {selectedBatch.shortId && <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg font-mono font-bold">#{selectedBatch.shortId}</span>}
                                {selectedBatch.status && selectedBatch.status !== 'Raising' && (
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-violet-100 text-violet-700">{selectedBatch.status}</span>
                                )}
                            </div>
                            <p className="text-gray-500 font-semibold mt-1">
                                {selectedBatch.type} · {selectedBatch.animals?.length || 0} animals · day {financials.daysActive}
                                {(selectedBatch.startDate || selectedBatch.date) && <> · started {formatDate(selectedBatch.startDate || selectedBatch.date)}</>}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-bold">🌿 {activeAnimals.length} healthy</span>
                                <span className="rounded-full bg-orange-100 text-orange-800 px-3 py-1 text-xs font-bold">🤒 {sickAnimals.length} sick</span>
                                <span className="rounded-full bg-sky-100 text-sky-800 px-3 py-1 text-xs font-bold">💰 {soldAnimals.length} sold</span>
                                <span className="rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-bold">
                                    🕊️ {deceasedAnimals.length} lost{lastDeath ? ` · last ${relativeDay(lastDeath.date).toLowerCase()}` : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end">
                        <div className="rounded-2xl bg-green-50 ring-1 ring-green-100 px-4 py-3 lg:text-right">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-green-800/70">Minimum sell price</p>
                            <p className="font-display text-3xl font-semibold text-green-700">₹{Math.round(financials.minSellPrice).toLocaleString('en-IN')}</p>
                            <p className="text-xs text-gray-500">Cost basis ₹{Math.round(financials.totalPerAnimalCost).toLocaleString('en-IN')} / animal</p>
                            {financials.sharedTotal > 0 && (
                                <p className="text-[11px] font-semibold text-amber-700 mt-0.5">Shared costs not included · +₹{Math.round(financials.sharedPerAnimal).toLocaleString('en-IN')}/animal</p>
                            )}
                        </div>
                        <div className="grid grid-cols-[1fr_1fr_auto_auto] sm:flex sm:flex-wrap gap-2 lg:justify-end">
                            {herdAnimals.length > 0 && (
                                <button onClick={openSellModal} className="flex items-center justify-center gap-1.5 rounded-xl bg-forest text-white px-4 py-2.5 text-sm font-bold shadow-[0_3px_0_#0b2416]">
                                    <IndianRupee className="w-4 h-4" /> Sell
                                </button>
                            )}
                            {canEdit && herdAnimals.length > 0 && (
                                <button onClick={() => openRecordDeath(selectedBatch.id)} className="flex items-center justify-center gap-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 px-3 sm:px-4 py-2.5 text-sm font-bold whitespace-nowrap">
                                    <HeartCrack className="w-4 h-4" /> <span className="sm:hidden">Death</span><span className="hidden sm:inline">Record death</span>
                                </button>
                            )}
                            <button onClick={() => openBatchModal(selectedBatch)} className="grid place-items-center w-10 h-10 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200" title="Edit batch" aria-label="Edit batch">
                                <Edit2 className="w-4 h-4" />
                            </button>
                            {canEdit && (
                                <button onClick={handleDeleteBatch} className="grid place-items-center w-10 h-10 rounded-xl bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete batch" aria-label="Delete batch">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.section>

            {/* Detail Tabs */}
            <SegmentedTabs
                layoutId="batch-detail-tab"
                value={batchTab}
                onChange={setBatchTab}
                tabs={[
                    { id: 'animals', label: 'Overview', emoji: '🏠' },
                    { id: 'weight', label: 'Weight', emoji: '⚖️' },
                    { id: 'medical', label: 'Medical', emoji: '💉', count: (selectedBatch.medical || []).length },
                    { id: 'sold', label: 'Sold', emoji: '💰', count: soldAnimals.length }
                ]}
            />

            {/* TAB: OVERVIEW (Animals + Expenses) */}
            {batchTab === 'animals' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Animal List (Split by Category) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Header */}
                        {!isFlock && <div className="flex justify-between items-center gap-3">
                            <div>
                                <h3 className="font-semibold text-gray-900 text-xl">{isFlock ? 'Flock' : 'Animals'}</h3>
                                <p className="text-xs text-gray-500">{herdAnimals.length} alive{sickAnimals.length > 0 ? ` · ${sickAnimals.length} sick` : ''}</p>
                            </div>
                            <button onClick={() => openAnimalModal()} className="flex items-center gap-1.5 text-sm bg-sun text-forest px-4 py-2 rounded-xl font-bold shadow-[0_3px_0_#d48a06]">
                                <Plus className="w-4 h-4" /> Add animals
                            </button>
                        </div>}

                        {/* Adults Section - Only for Non-Chicken */}
                        {selectedBatch?.type !== 'Chicken' && selectedBatch?.type !== 'Poultry' && (
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                                <div
                                    onClick={() => setIsAdultsOpen(!isAdultsOpen)}
                                    className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                    <h4 className="font-bold text-gray-700 flex items-center gap-2">
                                        {isAdultsOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                        <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                                        Adults
                                    </h4>
                                    <span className="text-sm font-medium text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-100">
                                        {herdAnimals.filter(isAdultAnimal).length} animals
                                    </span>
                                </div>
                                {isAdultsOpen && (
                                    <div className="divide-y divide-gray-50">
                                        {herdAnimals.filter(isAdultAnimal).length > 0 ? (
                                            herdAnimals.filter(isAdultAnimal).map(animal => (
                                                <div key={animal.id} className="border-b border-gray-50 last:border-0">
                                                    <div className={`p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer ${expandedAnimalId === animal.id ? 'bg-gray-50' : ''}`} onClick={() => toggleAnimalExpand(animal.id)}>
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${animal.gender === 'Male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                                                                {animal.gender === 'Male' ? 'M' : 'F'}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-800 flex items-center gap-2">
                                                                    {animal.id}
                                                                    <span className="text-gray-300 text-xs font-normal">|</span>
                                                                    <span className="text-xs font-normal text-gray-500">{animal.age || 'N/A'}</span>
                                                                </div>
                                                                <div className="text-xs text-gray-500 flex gap-2 items-center">
                                                                    <span>{animal.weight} kg</span>
                                                                    <span className={`px-1.5 rounded font-semibold ${animal.status === 'Sick' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{animal.status || 'Healthy'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            {/* Break-Even Price: before the down arrow */}
                                                            <div className="text-right hidden sm:block" onClick={e => e.stopPropagation()}>
                                                                <p className="text-xs text-gray-400">Break-Even</p>
                                                                <p className="text-sm font-bold text-orange-600">₹{calculateAnimalBreakEven(animal, selectedBatch).trueCost.toLocaleString()}</p>
                                                            </div>
                                                            <div className="text-gray-400 group-hover:text-blue-600">
                                                                {expandedAnimalId === animal.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                            </div>
                                                            <div className="flex items-center gap-0.5 sm:gap-1 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                                <button onClick={() => setSelectedAnimalForWeight(animal.id)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View History">
                                                                    <TrendingUp className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => openAnimalModal(animal)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                {canEdit && (
                                                                    <button onClick={() => openRecordDeath(selectedBatch.id, [animal.id])} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Record death" aria-label={`Record death of ${animal.id}`}>
                                                                        <HeartCrack className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                                {canEdit && (
                                                                    <button onClick={() => handleDeleteAnimal(animal.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete (entered by mistake)" aria-label={`Delete ${animal.id}`}>
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {expandedAnimalId === animal.id && (
                                                        <div className="px-4 pb-4 pl-[4.5rem] bg-gray-50 animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2">
                                                                <div><span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Gender</span> <span className="font-semibold text-gray-700">{animal.gender}</span></div>
                                                                <div><span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Cost</span> <span className="font-semibold text-gray-700">₹{animal.purchaseCost || 0}</span></div>
                                                                <div><span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Born/Bought</span> <span className="font-semibold text-gray-700">{animal.boughtDate || selectedBatch.startDate || selectedBatch.date || 'N/A'}</span></div>
                                                                <div><span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Category</span> <span className="font-semibold text-gray-700">{animal.category || 'Adult'}</span></div>
                                                                <div><span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Status</span> <span className="font-semibold text-gray-700">{animal.status}</span></div>
                                                            </div>

                                                            <div className="flex flex-col md:flex-row gap-6 mt-4 pt-4 border-t border-gray-100">
                                                                {/* Individual Weight History (Last 10) */}
                                                                <div className="flex-1">
                                                                    <h5 className="font-bold text-gray-700 text-xs uppercase mb-2">Recent Weight</h5>
                                                                    {(animal.weightHistory || []).length > 0 ? (
                                                                        <div className="space-y-1">
                                                                            {[...(animal.weightHistory || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map((w, i) => (
                                                                                <div key={i} className="flex gap-4 text-xs text-gray-600">
                                                                                    <span className="text-gray-400 w-20">{w.date}</span>
                                                                                    <span className="font-medium">{w.weight} kg</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs text-gray-400 italic">No weight history.</p>
                                                                    )}
                                                                </div>

                                                                {/* Individual Medical History (Last 10) */}
                                                                <div className="flex-1 border-l border-gray-100 md:pl-6">
                                                                    <h5 className="font-bold text-gray-700 text-xs uppercase mb-2">Recent Medical</h5>
                                                                    {(selectedBatch.medical || []).some(m => (m.animalIds || []).includes(animal.id)) ? (
                                                                        <div className="space-y-1">
                                                                            {(selectedBatch.medical || [])
                                                                                .filter(m => (m.animalIds || []).includes(animal.id))
                                                                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                                                .slice(0, 10)
                                                                                .map((m, i) => (
                                                                                    <div key={i} className="flex gap-2 text-xs text-gray-600">
                                                                                        <span className="text-gray-400 w-20">{m.date}</span>
                                                                                        <span className={`px-1.5 rounded font-medium ${m.type === 'Vaccination' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{m.type}</span>
                                                                                        <span className="font-medium">{m.name}</span>
                                                                                    </div>
                                                                                ))}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs text-gray-400 italic">No medical records.</p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center text-gray-400 text-sm">No adult animals in this batch.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {isFlock && (
                            <PoultryFlockOverview
                                batch={selectedBatch}
                                financials={financials}
                                costPerBird={financials.totalPerAnimalCost}
                                canEdit={canEdit}
                                actions={{
                                    sell: openSellModal,
                                    death: () => openRecordDeath(selectedBatch.id),
                                    toSick: () => { setSickTransitionForm({ count: '', fromStatus: 'Healthy', toStatus: 'Sick', notes: '' }); setIsSickTransitionOpen(true); },
                                    recover: () => { setSickTransitionForm({ count: '', fromStatus: 'Sick', toStatus: 'Healthy', notes: '' }); setIsSickTransitionOpen(true); },
                                    weigh: () => { setSelectedAnimalForWeight('Active'); setEditingWeightRecord(null); setWeightForm({ weight: '', date: todayISO() }); setIsWeightModalOpen(true); },
                                    medical: () => { setEditingMedicalRecordId(null); setMedicalTargetMode('ActiveFlock'); setIsMedicalModalOpen(true); },
                                    add: () => openAnimalModal(),
                                    expense: () => setIsExpenseModalOpen(true)
                                }}
                            />
                        )}

                        {/* Kids Section - Only for Non-Chicken */}
                        {selectedBatch?.type !== 'Chicken' && selectedBatch?.type !== 'Poultry' && (
                            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                                <div
                                    onClick={() => setIsKidsOpen(!isKidsOpen)}
                                    className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors"
                                >
                                    <h4 className="font-bold text-gray-700 flex items-center gap-2">
                                        {isKidsOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                        <span className="w-2 h-8 bg-green-500 rounded-full"></span>
                                        Kids
                                    </h4>
                                    <span className="text-sm font-medium text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-100">
                                        {herdAnimals.filter(a => !isAdultAnimal(a)).length} animals
                                    </span>
                                </div>
                                {isKidsOpen && (
                                    <div className="divide-y divide-gray-50">
                                        {herdAnimals.filter(a => !isAdultAnimal(a)).length > 0 ? (
                                            herdAnimals.filter(a => !isAdultAnimal(a)).map(animal => (
                                                <div key={animal.id} className="border-b border-gray-50 last:border-0">
                                                    <div className={`p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer ${expandedAnimalId === animal.id ? 'bg-gray-50' : ''}`} onClick={() => toggleAnimalExpand(animal.id)}>
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${animal.gender === 'Male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                                                                {animal.gender === 'Male' ? 'M' : 'F'}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-800 flex items-center gap-2">
                                                                    {animal.id}
                                                                    <span className="text-gray-300 text-xs font-normal">|</span>
                                                                    <span className="text-xs font-normal text-gray-500">{animal.age || 'N/A'}</span>
                                                                </div>
                                                                <div className="text-xs text-gray-500 flex gap-2 items-center">
                                                                    <span>{animal.weight} kg</span>
                                                                    <span className={`px-1.5 rounded font-semibold ${animal.status === 'Sick' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{animal.status || 'Healthy'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            {/* Break-Even Price: before the down arrow */}
                                                            <div className="text-right hidden sm:block" onClick={e => e.stopPropagation()}>
                                                                <p className="text-xs text-gray-400">Break-Even</p>
                                                                <p className="text-sm font-bold text-orange-600">₹{calculateAnimalBreakEven(animal, selectedBatch).trueCost.toLocaleString()}</p>
                                                            </div>
                                                            <div className="text-gray-400 group-hover:text-blue-600">
                                                                {expandedAnimalId === animal.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                            </div>
                                                            <div className="flex items-center gap-0.5 sm:gap-1 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                                <button onClick={() => setSelectedAnimalForWeight(animal.id)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View History">
                                                                    <TrendingUp className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => openAnimalModal(animal)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                {canEdit && (
                                                                    <button onClick={() => openRecordDeath(selectedBatch.id, [animal.id])} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Record death" aria-label={`Record death of ${animal.id}`}>
                                                                        <HeartCrack className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                                {canEdit && (
                                                                    <button onClick={() => handleDeleteAnimal(animal.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete (entered by mistake)" aria-label={`Delete ${animal.id}`}>
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {expandedAnimalId === animal.id && (
                                                        <div className="px-4 pb-4 pl-[4.5rem] bg-gray-50 animate-in fade-in slide-in-from-top-1 duration-200">
                                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2">
                                                                <div><span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Gender</span> <span className="font-semibold text-gray-700">{animal.gender}</span></div>
                                                                <div><span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Cost</span> <span className="font-semibold text-gray-700">₹{animal.purchaseCost || 0}</span></div>
                                                                <div><span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Born/Bought</span> <span className="font-semibold text-gray-700">{animal.boughtDate || selectedBatch.startDate || selectedBatch.date || 'N/A'}</span></div>
                                                                <div><span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Category</span> <span className="font-semibold text-gray-700">{animal.category || 'Kid'}</span></div>
                                                                <div><span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Status</span> <span className="font-semibold text-gray-700">{animal.status}</span></div>
                                                            </div>

                                                            <div className="flex flex-col md:flex-row gap-6 mt-4 pt-4 border-t border-gray-100">
                                                                {/* Individual Weight History (Last 10) */}
                                                                <div className="flex-1">
                                                                    <h5 className="font-bold text-gray-700 text-xs uppercase mb-2">Recent Weight</h5>
                                                                    {(animal.weightHistory || []).length > 0 ? (
                                                                        <div className="space-y-1">
                                                                            {[...(animal.weightHistory || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map((w, i) => (
                                                                                <div key={i} className="flex gap-4 text-xs text-gray-600">
                                                                                    <span className="text-gray-400 w-20">{w.date}</span>
                                                                                    <span className="font-medium">{w.weight} kg</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs text-gray-400 italic">No weight history.</p>
                                                                    )}
                                                                </div>

                                                                {/* Individual Medical History (Last 10) */}
                                                                <div className="flex-1 border-l border-gray-100 md:pl-6">
                                                                    <h5 className="font-bold text-gray-700 text-xs uppercase mb-2">Recent Medical</h5>
                                                                    {(selectedBatch.medical || []).some(m => (m.animalIds || []).includes(animal.id)) ? (
                                                                        <div className="space-y-1">
                                                                            {(selectedBatch.medical || [])
                                                                                .filter(m => (m.animalIds || []).includes(animal.id))
                                                                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                                                .slice(0, 10)
                                                                                .map((m, i) => (
                                                                                    <div key={i} className="flex gap-2 text-xs text-gray-600">
                                                                                        <span className="text-gray-400 w-20">{m.date}</span>
                                                                                        <span className={`px-1.5 rounded font-medium ${m.type === 'Vaccination' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{m.type}</span>
                                                                                        <span className="font-medium">{m.name}</span>
                                                                                    </div>
                                                                                ))}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs text-gray-400 italic">No medical records.</p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center text-gray-400 text-sm">No kid animals in this batch.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <BatchMortalityPanel
                            batch={selectedBatch}
                            records={batchDeathRecords}
                            canRecord={canEdit && herdAnimals.length > 0}
                            canEdit={canEdit}
                            canUndo={isSuperAdmin}
                            onRecord={() => openRecordDeath(selectedBatch.id)}
                            onEditRecord={setDeathEditRecord}
                            onReviveRecord={handleReviveRecord}
                        />
                    </div>
                    {/* Right Column: Expenses */}
                    <div className="space-y-4">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                            <div>
                                <h3 className="font-semibold text-gray-900 text-xl">Expenses</h3>
                                <p className="text-xs text-gray-500">Spent on this batch</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setIsExpenseModalOpen(true)} className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 flex items-center gap-1 font-medium transition-colors">
                                    <Plus className="w-3 h-3" /> Add Expense
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                            {(selectedBatch.expenses || []).length > 0 ? (selectedBatch.expenses || []).map((exp, i) => (
                                <div key={i} className="p-4 border-b border-gray-100 last:border-0 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-gray-800">{exp.type}</p>
                                        <p className="text-xs text-gray-500">{exp.description}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-red-500 whitespace-nowrap">−₹{(Number(exp.amount) || 0).toLocaleString('en-IN')}</span>
                                        <div className="flex gap-1">
                                            {canEditRecords && (
                                                <button onClick={() => openEditBatchExpenseModal(exp)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 className="w-3 h-3" /></button>
                                            )}
                                            {isSuperAdmin && (
                                                <button onClick={() => handleDeleteBatchExpenseItem(exp.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-3 h-3" /></button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-8 text-center text-gray-400"><p>No specific expenses recorded.</p></div>
                            )}
                            <div className="p-4 bg-gray-50 flex justify-between items-center border-t border-gray-100">
                                <div>
                                    <p className="font-semibold text-gray-800">Batch expenses</p>
                                    <p className="text-[11px] text-gray-500">Counted in this batch’s cost</p>
                                </div>
                                <span className="font-bold text-red-600">−₹{Math.round(financials.operationalCost || 0).toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <SharedCostsCard batch={selectedBatch} shared={costing.sharedFor(selectedBatch.id)} pool={costing.poolThisMonth} />
                    </div>
                </div>
            )}

            {/* TAB: WEIGHT */}
            {batchTab === 'weight' && (
                <div className="space-y-6">
                    <div className="flex flex-wrap gap-3 justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="grid place-items-center w-12 h-12 rounded-2xl bg-white shadow-md text-2xl">⚖️</span>
                            <div>
                                <h3 className="font-semibold text-gray-900 text-xl">Weight tracking</h3>
                                <p className="text-gray-500 text-sm">Pick {isFlock ? 'a group' : 'an animal'} to see how it is growing.</p>
                            </div>
                        </div>
                        <button onClick={() => { setEditingWeightRecord(null); setWeightForm({ weight: '', date: new Date().toISOString().split('T')[0] }); setIsWeightModalOpen(true); }} className="flex items-center gap-2 bg-sun text-forest px-4 py-2.5 rounded-2xl font-bold shadow-[0_3px_0_#d48a06]">
                            <Scale className="w-4 h-4" /> Record weight
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm ring-1 ring-gray-200">
                            <h4 className="font-bold text-gray-700 mb-4">Weight History</h4>
                            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden min-h-[300px]">
                                {selectedAnimalForWeight ? (
                                    (() => {
                                        // Handle Group Selection (Active/Sick)
                                        let history = [];

                                        if (selectedAnimalForWeight === 'Active' || selectedAnimalForWeight === 'Sick') {
                                            const targetStatus = selectedAnimalForWeight === 'Active' ? 'Healthy' : 'Sick';
                                            // Get all relevant animals
                                            const groupAnimals = selectedBatch.animals.filter(a => {
                                                if (selectedAnimalForWeight === 'Active') return (a.status === 'Healthy' || !a.status) && a.status !== 'Sold' && a.status !== 'Deceased' && a.status !== 'Sick';
                                                return a.status === 'Sick';
                                            });

                                            // Collect all unique dates
                                            const dateMap = new Map(); // date -> { totalWeight, count }

                                            groupAnimals.forEach(a => {
                                                (a.weightHistory || []).forEach(rec => {
                                                    if (!dateMap.has(rec.date)) {
                                                        dateMap.set(rec.date, { total: 0, count: 0 });
                                                    }
                                                    const entry = dateMap.get(rec.date);
                                                    entry.total += Number(rec.weight);
                                                    entry.count += 1;
                                                });
                                            });

                                            // Convert to history array
                                            history = Array.from(dateMap.entries()).map(([date, data]) => ({
                                                date,
                                                weight: (data.total / data.count).toFixed(2) // Average Weight
                                            })).sort((a, b) => new Date(b.date) - new Date(a.date));

                                        } else {
                                            // Individual Animal Selection
                                            const animal = selectedBatch.animals.find(a => a.id === selectedAnimalForWeight);
                                            history = [...(animal?.weightHistory || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
                                        }

                                        return (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                                        <tr>
                                                            <th className="px-6 py-3 font-semibold">Date</th>
                                                            <th className="px-6 py-3 font-semibold">Weight</th>
                                                            <th className="px-6 py-3 font-semibold">Change</th>
                                                            <th className="px-6 py-3 font-semibold text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {history.slice(0, 10).map((record, index) => {
                                                            const prevRecord = history[index + 1];
                                                            const prevWeight = prevRecord ? Number(prevRecord.weight) : null;
                                                            const currWeight = Number(record.weight);

                                                            let colorClass = 'text-gray-400 bg-gray-50';
                                                            let Icon = Minus;
                                                            let diff = 0;

                                                            if (prevWeight !== null) {
                                                                diff = currWeight - prevWeight;
                                                                if (diff > 0) {
                                                                    colorClass = 'text-green-700 bg-green-50';
                                                                    Icon = ArrowUp;
                                                                } else if (diff < 0) {
                                                                    colorClass = 'text-red-700 bg-red-50';
                                                                    Icon = ArrowDown;
                                                                }
                                                            }

                                                            return (
                                                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                                    <td className="px-6 py-4 font-medium text-gray-900">{record.date}</td>
                                                                    <td className="px-6 py-4 font-bold text-gray-800">{currWeight} kg</td>
                                                                    <td className="px-6 py-4">
                                                                        {prevWeight !== null ? (
                                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${colorClass}`}>
                                                                                <Icon className="w-3 h-3" />
                                                                                {Math.abs(diff).toFixed(1)} kg
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-gray-400 text-xs italic">Initial</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        {canEditRecords && (
                                                                            <button onClick={() => { setEditingWeightRecord(record); setWeightForm({ weight: record.weight, date: record.date }); setIsWeightModalOpen(true); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Record">
                                                                                <Edit2 className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                                {history.length > 10 && (
                                                    <div className="p-3 text-center border-t border-gray-100 bg-gray-50 text-xs text-gray-500 font-medium">
                                                        Showing recent 10 of {history.length} records
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center p-8 text-gray-400 space-y-3">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                                            <Scale className="w-6 h-6 opacity-50" />
                                        </div>
                                        <p>{selectedAnimalForWeight ? "No weight history recorded yet" : "Select an animal to view history"}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-3xl shadow-sm ring-1 ring-gray-200 max-h-[400px] overflow-y-auto">
                            <h4 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Select Animal</h4>
                            <div className="space-y-2">
                                {selectedBatch.type === 'Chicken' || selectedBatch.type === 'Poultry' ? (
                                    <>
                                        {/* Poultry Group Selectors */}
                                        <button onClick={() => setSelectedAnimalForWeight('Active')} className={`w-full text-left px-4 py-3 rounded-xl transition-all ${selectedAnimalForWeight === 'Active' ? 'bg-green-50 text-green-700 font-medium ring-2 ring-green-500/20' : 'hover:bg-gray-50 text-gray-600'}`}>
                                            <div className="flex justify-between items-center">
                                                <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Active Flock</span>
                                                <span className="text-sm text-gray-400">{activeAnimals.length} birds</span>
                                            </div>
                                        </button>
                                        <button onClick={() => setSelectedAnimalForWeight('Sick')} className={`w-full text-left px-4 py-3 rounded-xl transition-all ${selectedAnimalForWeight === 'Sick' ? 'bg-orange-50 text-orange-700 font-medium ring-2 ring-orange-500/20' : 'hover:bg-gray-50 text-gray-600'}`}>
                                            <div className="flex justify-between items-center">
                                                <span className="flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Sick Bay</span>
                                                <span className="text-sm text-gray-400">{sickAnimals.length} birds</span>
                                            </div>
                                        </button>
                                    </>
                                ) : (
                                    /* Individual Selectors for Others */
                                    herdAnimals.map(animal => (
                                        <button key={animal.id} onClick={() => setSelectedAnimalForWeight(animal.id)} className={`w-full text-left px-4 py-3 rounded-xl transition-all ${selectedAnimalForWeight === animal.id ? 'bg-blue-50 text-blue-700 font-medium ring-2 ring-blue-500/20' : 'hover:bg-gray-50 text-gray-600'}`}>
                                            <div className="flex justify-between items-center"><span>{animal.id}</span><span className="text-sm text-gray-400">{animal.weight} kg</span></div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: SOLD */}
            {batchTab === 'sold' && (
                <div className="space-y-6">
                    <div className="flex flex-wrap gap-3 justify-between items-center">
                        <div>
                            <h3 className="font-semibold text-gray-900 text-xl">Sales from this batch</h3>
                            <p className="text-gray-500 text-sm">Tap a sale to see every animal in it.</p>
                        </div>
                        <button onClick={() => {
                            try {
                                const doc = new jsPDF('landscape');
                                const trueTotalCost = soldAnimals.reduce((s, a) => s + calculateAnimalBreakEven(a, selectedBatch).trueCost, 0);
                                const trueProfit = soldRevenue - trueTotalCost;

                                doc.setFillColor(41, 128, 185);
                                doc.rect(0, 0, 297, 30, 'F');
                                doc.setTextColor(255, 255, 255);
                                doc.setFontSize(22);
                                doc.setFont("helvetica", "bold");
                                doc.text("Trinetra Farms", 14, 20);

                                doc.setTextColor(50, 50, 50);
                                doc.setFontSize(16);
                                doc.text(`Batch Sales Report: ${selectedBatch.name}`, 14, 40);

                                doc.setFontSize(10);
                                doc.setTextColor(100, 100, 100);
                                doc.text(`Type: ${selectedBatch.type}`, 14, 46);
                                doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 52);
                                doc.text(`Sold Animals: ${soldAnimals.length}`, 14, 58);
                                doc.text(`Revenue: Rs. ${soldRevenue.toLocaleString()}`, 200, 46);
                                doc.text(`Cost Segment: Rs. ${trueTotalCost.toLocaleString()}`, 200, 52);
                                doc.text(`Gross Profit: Rs. ${trueProfit.toLocaleString()}`, 200, 58);

                                autoTable(doc, {
                                    startY: 65,
                                    theme: 'striped',
                                    styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak', halign: 'center' },
                                    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'center' },
                                    alternateRowStyles: { fillColor: [245, 245, 245] },
                                    head: [['ID', 'Gender', 'Category', 'Weight', 'Bought', 'Cost (Rs)', 'Expenses', 'Total Cost', 'Sold', 'Price (Rs)', 'Profit']],
                                    body: soldAnimals.map(a => {
                                        const cCost = calculateAnimalBreakEven(a, selectedBatch);
                                        return [
                                            a.id, a.gender || 'N/A', a.category || 'N/A', `${a.weight} kg`,
                                            a.boughtDate || 'N/A', Math.round(cCost.originalPrice), Math.round(cCost.expenses), Math.round(cCost.trueCost),
                                            a.soldDate || 'N/A', Number(a.soldPrice) || 0,
                                            (Number(a.soldPrice) || 0) - cCost.trueCost
                                        ]
                                    })
                                });
                                doc.save(`Trinetra_Farms_${selectedBatch.name.replace(/\s+/g, '_')}_Sales.pdf`);
                            } catch (error) {
                                console.error("Error generating PDF:", error);
                                alert("Failed to generate PDF. Check console for details.");
                            }
                        }} className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2.5 rounded-2xl font-bold shadow-[0_3px_0_#075985]">
                            <FileDown className="w-4 h-4" /> Download PDF
                        </button>
                    </div>

                    <SoldView
                        animals={allSoldAnimals.filter(a => a.batchId === selectedBatch.id)}
                        canUndo={isSuperAdmin}
                        onUndo={handleUndoSale}
                        hideBatch
                    />
                </div>
            )}

            {/* TAB: MEDICAL */}
            {batchTab === 'medical' && (
                <div className="space-y-6">
                    <div className="flex flex-wrap gap-3 justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="grid place-items-center w-12 h-12 rounded-2xl bg-white shadow-md text-2xl">💉</span>
                            <div>
                                <h3 className="font-semibold text-gray-900 text-xl">Medical history</h3>
                                <p className="text-gray-500 text-sm">Vaccines, medicines and treatments for this batch.</p>
                            </div>
                        </div>
                        <button onClick={() => { setEditingMedicalRecordId(null); setIsMedicalModalOpen(true); }} className="flex items-center gap-2 bg-forest text-white px-4 py-2.5 rounded-2xl font-bold shadow-[0_3px_0_#0b2416]">
                            <Plus className="w-4 h-4" /> Add record
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Table */}
                        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h4 className="font-bold text-gray-700">
                                    {selectedAnimalForMedical ? `History: ${selectedAnimalForMedical}` : 'All Records'}
                                </h4>
                                {selectedAnimalForMedical && (
                                    <button onClick={() => setSelectedAnimalForMedical(null)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                                        Clear Filter
                                    </button>
                                )}
                            </div>
                            {(selectedBatch.medical || []).filter(m => !selectedAnimalForMedical || (m.animalIds || []).includes(selectedAnimalForMedical) || (selectedAnimalForMedical === 'Active' && m.animalIds?.every(id => activeAnimals.some(a => a.id === id))) || (selectedAnimalForMedical === 'Sick' && m.animalIds?.every(id => sickAnimals.some(a => a.id === id)))).length > 0 ? (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-orange-50 text-orange-800 uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Date</th>
                                            <th className="px-6 py-3 font-semibold">Type</th>
                                            <th className="px-6 py-3 font-semibold">Name</th>
                                            <th className="px-6 py-3 font-semibold">Affected</th>
                                            <th className="px-6 py-3 font-semibold">Cost</th>
                                            <th className="px-6 py-3 font-semibold">Notes</th>
                                            <th className="px-6 py-3 font-semibold text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {[...(selectedBatch.medical || [])]
                                            .filter(m => !selectedAnimalForMedical || (m.animalIds || []).includes(selectedAnimalForMedical) || (selectedAnimalForMedical === 'Active' && m.animalIds?.every(id => activeAnimals.some(a => a.id === id))) || (selectedAnimalForMedical === 'Sick' && m.animalIds?.every(id => sickAnimals.some(a => a.id === id))))
                                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                                            .map((record) => (
                                                <tr key={record.id} className="hover:bg-gray-50/50">
                                                    <td className="px-6 py-4">{record.date}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${record.type === 'Vaccination' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                            {record.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium">{record.name}</td>
                                                    <td className="px-6 py-4 text-gray-500 text-xs">
                                                        {(record.animalIds || []).length === activeAnimals.length
                                                            ? <span className="text-green-600 font-bold">All Active</span>
                                                            : `${(record.animalIds || []).length} Animals`}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600">₹{record.cost}</td>
                                                    <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={record.notes}>{record.notes}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {canEditRecords && (
                                                                <button onClick={() => openEditMedicalRecordModal(record)} className="p-1.5 text-blue-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Record">
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {isSuperAdmin && (
                                                                <button onClick={() => handleDeleteMedicalRecord(record.id)} className="p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete Record">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-12 text-center text-gray-400">
                                    <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>{selectedAnimalForMedical ? "No records for this animal." : "No medical records added yet."}</p>
                                </div>
                            )}
                        </div>

                        {/* Right: Animal List */}
                        <div className="bg-white p-4 rounded-3xl shadow-sm ring-1 ring-gray-200 max-h-[600px] overflow-y-auto">
                            <h4 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Filter by Animal</h4>
                            <div className="space-y-2">
                                {selectedBatch.type === 'Chicken' || selectedBatch.type === 'Poultry' ? (
                                    <>
                                        {/* Poultry Group Selectors */}
                                        <button onClick={() => setSelectedAnimalForMedical(null)} className={`w-full text-left px-4 py-3 rounded-xl transition-all ${!selectedAnimalForMedical ? 'bg-gray-100 text-gray-800 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}>
                                            <div className="flex justify-between items-center"><span>All Records</span></div>
                                        </button>
                                        <div className="pt-2 border-t border-gray-100 mt-2"></div>
                                        <p className="px-2 text-xs text-gray-400 uppercase font-semibold mb-1">Filter by Group</p>
                                        <button onClick={() => setSelectedAnimalForMedical('Active')} className={`w-full text-left px-4 py-3 rounded-xl transition-all ${selectedAnimalForMedical === 'Active' ? 'bg-green-50 text-green-700 font-medium ring-2 ring-green-500/20' : 'hover:bg-gray-50 text-gray-600'}`}>
                                            <div className="flex justify-between items-center">
                                                <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Active Flock</span>
                                            </div>
                                        </button>
                                        <button onClick={() => setSelectedAnimalForMedical('Sick')} className={`w-full text-left px-4 py-3 rounded-xl transition-all ${selectedAnimalForMedical === 'Sick' ? 'bg-orange-50 text-orange-700 font-medium ring-2 ring-orange-500/20' : 'hover:bg-gray-50 text-gray-600'}`}>
                                            <div className="flex justify-between items-center">
                                                <span className="flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Sick Bay</span>
                                            </div>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => setSelectedAnimalForMedical(null)} className={`w-full text-left px-4 py-3 rounded-xl transition-all ${!selectedAnimalForMedical ? 'bg-orange-50 text-orange-700 font-medium ring-2 ring-orange-500/20' : 'hover:bg-gray-50 text-gray-600'}`}>
                                            <div className="flex justify-between items-center"><span>All Animals</span><span className="text-sm text-gray-400">View All</span></div>
                                        </button>
                                        {herdAnimals.map(animal => (
                                            <button key={animal.id} onClick={() => setSelectedAnimalForMedical(animal.id)} className={`w-full text-left px-4 py-3 rounded-xl transition-all ${selectedAnimalForMedical === animal.id ? 'bg-blue-50 text-blue-700 font-medium ring-2 ring-blue-500/20' : 'hover:bg-gray-50 text-gray-600'}`}>
                                                <div className="flex justify-between items-center">
                                                    <span>{animal.id}</span>
                                                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-500">
                                                        {(selectedBatch.medical || []).filter(m => (m.animalIds || []).includes(animal.id)).length} recs
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            )}

            {/* --- MODALS --- */}
            {/* Animal Modal */}
            <Modal isOpen={isAnimalModalOpen} onClose={() => setIsAnimalModalOpen(false)} title={editingAnimalId ? `Edit ${editingAnimalId}` : 'Add animals'} subtitle={selectedBatch?.name} emoji={editingAnimalId ? '✏️' : (ANIMAL_EMOJI[selectedBatch?.type] || '🐾')}>
                <form onSubmit={handleAnimalSubmit} className="space-y-4">
                    {!editingAnimalId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Animals</label>
                            <input
                                required
                                type="number"
                                min="1"
                                max={(selectedBatch?.type === 'Chicken' || selectedBatch?.type === 'Poultry') ? "10000" : "50"}
                                value={animalForm.count}
                                onChange={e => setAnimalForm({ ...animalForm, count: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20"
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                            <select value={animalForm.gender} onChange={e => setAnimalForm({ ...animalForm, gender: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20">
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                                {isPoultryType(selectedBatch?.type) && <option value="Both">Both / Mixed</option>}
                            </select>
                        </div>
                        {(selectedBatch?.type !== 'Chicken' && selectedBatch?.type !== 'Poultry') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select value={animalForm.category} onChange={e => setAnimalForm({ ...animalForm, category: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20">
                                    <option value="Kid">Kid</option>
                                    <option value="Adult">Adult</option>
                                    <option value="Parent">Parent</option>
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <input type="number" min="0" value={animalForm.ageYears} onChange={e => setAnimalForm({ ...animalForm, ageYears: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20" placeholder="Yrs" />
                                </div>
                                <div className="flex-1">
                                    <input type="number" min="0" max="11" value={animalForm.ageMonths} onChange={e => setAnimalForm({ ...animalForm, ageMonths: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20" placeholder="Mos" />
                                </div>
                                <div className="flex-1">
                                    <input type="number" min="0" max="31" value={animalForm.ageDays} onChange={e => setAnimalForm({ ...animalForm, ageDays: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20" placeholder="Days" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                            <input required type="number" step="0.001" value={animalForm.weight} onChange={e => setAnimalForm({ ...animalForm, weight: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20" placeholder="e.g. 0.500" />
                            <p className="text-[10px] text-gray-400 mt-1">Enter kg (e.g. 0.1 = 100g)</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date Acquired / Born</label>
                        <input type="date" value={animalForm.date} onChange={e => setAnimalForm({ ...animalForm, date: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Animal</label>
                        <input required type="number" value={animalForm.cost} onChange={e => setAnimalForm({ ...animalForm, cost: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select value={animalForm.status} onChange={e => setAnimalForm({ ...animalForm, status: e.target.value, deceasedDate: e.target.value === 'Deceased' ? (animalForm.deceasedDate || todayISO()) : animalForm.deceasedDate })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20">
                            <option value="Healthy">Healthy</option>
                            <option value="Sick">Sick</option>
                            <option value="Deceased">Deceased</option>
                            {animalForm.status === 'Sold' && <option value="Sold">Sold</option>}
                        </select>
                    </div>
                    {animalForm.status === 'Deceased' && (
                        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-red-50 ring-1 ring-red-100 p-3 animate-in">
                            <div>
                                <label className="flex items-center gap-1 text-sm font-bold text-red-900 mb-1"><CalendarDays className="w-4 h-4" /> Date of death</label>
                                <input required type="date" max={todayISO()} value={animalForm.deceasedDate || ''} onChange={e => setAnimalForm({ ...animalForm, deceasedDate: e.target.value })} className="w-full px-3 py-2 border border-red-200 rounded-lg bg-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-red-900 mb-1">Reason</label>
                                <select value={animalForm.deathReason || 'Unknown'} onChange={e => setAnimalForm({ ...animalForm, deathReason: e.target.value })} className="w-full px-3 py-2 border border-red-200 rounded-lg bg-white">
                                    {DEATH_REASONS.map(r => <option key={r.id} value={r.id}>{r.emoji} {r.id}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end gap-3 mt-6">
                        {editingAnimalId && animalForm.status === 'Sold' && isSuperAdmin && (
                            <button
                                type="button"
                                onClick={async () => {
                                    if (window.confirm(`Revert animal ${editingAnimalId} to active status?`)) {
                                        // Need to find batch ID - since manual edit is usually inside a batch view (selectedBatchId)
                                        // But Sold view might not set selectedBatchId if viewing all sold?
                                        // Actually openAnimalModal sets editingAnimalId.
                                        // Wait, revertSoldAnimal needs batchId.
                                        // If we are in "All Sold" view, selectedBatchId might be null!
                                        // We need to find the batchId from the animal object itself or look it up.
                                        // The 'animal' passed to openAnimalModal comes from the list.
                                        // The list in 'Sold Animals' tab is 'allSoldAnimals' which has 'batchId' attached in useMemo!
                                        // So we should verify if 'animalForm' has batchId? No, 'animalForm' is just form state.
                                        // We need the original animal object.
                                        // Let's assume we can get it from 'allSoldAnimals' since we have the ID.
                                        const found = allSoldAnimals.find(a => a.id === editingAnimalId);
                                        if (found && found.batchId) {
                                            await revertSoldAnimal(found.batchId, editingAnimalId);
                                            setIsAnimalModalOpen(false);
                                        } else {
                                            alert("Could not find batch info for this animal.");
                                        }
                                    }
                                }}
                                className="mr-auto px-4 py-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg border border-orange-200"
                            >
                                Undo Sell
                            </button>
                        )}
                        <button type="button" onClick={() => setIsAnimalModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : (editingAnimalId ? 'Save Changes' : 'Add Animals')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Expense Modal */}
            <Modal isOpen={isExpenseModalOpen} onClose={() => { setIsExpenseModalOpen(false); setEditingBatchExpense(null); }} title={editingBatchExpense ? 'Edit batch expense' : 'Add batch expense'} subtitle={selectedBatch?.name} emoji="🧾">
                <form onSubmit={handleExpenseSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type</label>
                        <select value={expenseForm.type} onChange={e => setExpenseForm({ ...expenseForm, type: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20">
                            <option value="Feed">Feed</option>
                            <option value="Medicine">Medicine</option>
                            <option value="Labor">Labor</option>
                            <option value="Transport">Transport</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input required type="text" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20" placeholder="e.g., Veterinary visit" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                        <input required type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input required type="date" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20" />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => { setIsExpenseModalOpen(false); setEditingBatchExpense(null); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : (editingBatchExpense ? "Update Expense" : "Add Expense")}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Weight Modal */}
            <Modal isOpen={isWeightModalOpen} onClose={() => { setIsWeightModalOpen(false); setEditingWeightRecord(null); }} title={editingWeightRecord ? 'Edit weight record' : 'Record weight'} subtitle={selectedBatch?.name} emoji="⚖️">
                <form onSubmit={handleWeightSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Animal</label>
                        <select required value={selectedAnimalForWeight || ''} onChange={e => setSelectedAnimalForWeight(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20">
                            <option value="">Select Target...</option>
                            {selectedBatch && (selectedBatch.type === 'Chicken' || selectedBatch.type === 'Poultry') ? (
                                <>
                                    <option value="Active">Active Flock ({activeAnimals.length} birds)</option>
                                    <option value="Sick">Sick Bay ({sickAnimals.length} birds)</option>
                                </>
                            ) : (
                                herdAnimals.map(a => <option key={a.id} value={a.id}>{a.id} (Curr: {a.weight}kg){a.status === 'Sick' ? ' · sick' : ''}</option>)
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Weight (kg)</label>
                        <input required type="number" step="0.1" value={weightForm.weight} onChange={e => setWeightForm({ ...weightForm, weight: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input required type="date" value={weightForm.date} onChange={e => setWeightForm({ ...weightForm, date: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20" />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsWeightModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Record'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Batch Modal */}
            <Modal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} title="Edit batch" subtitle={selectedBatch?.name} emoji="🛠️">
                <form onSubmit={handleBatchSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
                        <input required type="text" value={batchForm.name} onChange={e => setBatchForm({ ...batchForm, name: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-green-500/20 outline-none" placeholder="e.g., Spring 2024 Goats" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Livestock Type</label>
                        <select value={batchForm.type} onChange={e => setBatchForm({ ...batchForm, type: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-green-500/20 outline-none">
                            <option value="Goat">Goat</option>
                            <option value="Sheep">Sheep</option>
                            <option value="Poultry">Poultry</option>
                            <option value="Chicken">Chicken</option>
                            <option value="Cow">Cow</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input required type="date" value={batchForm.startDate} onChange={e => setBatchForm({ ...batchForm, startDate: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-green-500/20 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select value={batchForm.status} onChange={e => setBatchForm({ ...batchForm, status: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20">
                            <option value="Raising">Raising</option>
                            <option value="Completed">Completed</option>
                            <option value="Archived">Archived</option>
                        </select>
                        {batchForm.status === 'Completed' && selectedBatch && (selectedBatch.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased').length > 0 && (
                            <p className="text-xs text-red-500 mt-1 font-medium italic">
                                * Cannot complete: {selectedBatch.animals.filter(a => a.status !== 'Sold' && a.status !== 'Deceased').length} active animals remaining.
                            </p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Batch Color</label>
                        <div className="flex gap-2 flex-wrap items-center">
                            {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'].map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setBatchForm({ ...batchForm, color })}
                                    className={`w-8 h-8 rounded-full border-2 ${batchForm.color === color ? 'border-gray-800 ring-2 ring-offset-2 ring-gray-300' : 'border-transparent'}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                            <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 cursor-pointer" title="Custom Color">
                                <input
                                    type="color"
                                    value={batchForm.color || '#3B82F6'}
                                    onChange={e => setBatchForm({ ...batchForm, color: e.target.value })}
                                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsBatchModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</> : 'Update Batch'}
                        </button>
                    </div>
                </form>
            </Modal>
            {/* Medical Record Modal */}
            <Modal isOpen={isMedicalModalOpen} onClose={() => { setIsMedicalModalOpen(false); setEditingMedicalRecordId(null); }} title={editingMedicalRecordId ? 'Edit medical record' : 'Add medical record'} subtitle={selectedBatch?.name} emoji="💉">
                <form onSubmit={handleMedicalSubmit} className="space-y-4">
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Target Animals</label>
                        {selectedBatch && (selectedBatch.type === 'Chicken' || selectedBatch.type === 'Poultry') ? (
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="targetMode"
                                        checked={medicalTargetMode === 'ActiveFlock'}
                                        onChange={() => setMedicalTargetMode('ActiveFlock')}
                                        className="text-orange-600 focus:ring-orange-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Active Flock (Healthy)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="targetMode"
                                        checked={medicalTargetMode === 'SickBay'}
                                        onChange={() => setMedicalTargetMode('SickBay')}
                                        className="text-orange-600 focus:ring-orange-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Sick Bay</span>
                                </label>
                            </div>
                        ) : (
                            <>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="targetMode"
                                            checked={medicalTargetMode === 'All'}
                                            onChange={() => setMedicalTargetMode('All')}
                                            className="text-orange-600 focus:ring-orange-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">All Active Animals</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="targetMode"
                                            checked={medicalTargetMode === 'Select'}
                                            onChange={() => setMedicalTargetMode('Select')}
                                            className="text-orange-600 focus:ring-orange-500"
                                        />
                                        <span className="text-sm font-medium text-gray-700">Select Specific</span>
                                    </label>
                                </div>

                                {medicalTargetMode === 'Select' && (
                                    <div className="mt-3 bg-white border border-gray-200 rounded-lg max-h-40 overflow-y-auto p-2 space-y-1">
                                        {herdAnimals.map(animal => (
                                            <label key={animal.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMedicalAnimals.includes(animal.id)}
                                                    onChange={() => toggleMedicalAnimalSelection(animal.id)}
                                                    className="rounded text-orange-600 focus:ring-orange-500"
                                                />
                                                <span className="text-sm text-gray-600">{animal.id} ({animal.gender})</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                        <p className="text-xs text-orange-600 mt-2 font-medium">
                            {medicalTargetMode === 'All' ? `${herdAnimals.length} Animals Selected` :
                                medicalTargetMode === 'ActiveFlock' ? `${activeAnimals.length} Animals Selected` :
                                    medicalTargetMode === 'SickBay' ? `${sickAnimals.length} Animals Selected` :
                                        `${selectedMedicalAnimals.length} Animals Selected`}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input required type="date" value={medicalForm.date} onChange={e => setMedicalForm({ ...medicalForm, date: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-orange-500/20" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select value={medicalForm.type} onChange={e => setMedicalForm({ ...medicalForm, type: e.target.value, name: '' })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-orange-500/20">
                                <option value="Vaccination">Vaccination</option>
                                <option value="Medicine">Medicine</option>
                                <option value="Scheduled Medication">Scheduled Medication</option>
                            </select>
                        </div>
                    </div>

                    {/* Name Selection based on Type */}
                    {medicalForm.type === 'Scheduled Medication' ? (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Medication Name</label>
                                <select
                                    value={medicalForm.name}
                                    onChange={e => setMedicalForm({ ...medicalForm, name: e.target.value })}
                                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-orange-500/20"
                                >
                                    <option value="">Select Medication...</option>
                                    {(settings?.scheduledMedications || []).map((med, idx) => (
                                        <option key={idx} value={med.name}>{med.name}</option>
                                    ))}
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {medicalForm.name && medicalForm.name !== 'Other' && (
                                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                    <h5 className="font-bold text-green-800 text-sm mb-1">{medicalForm.name} Schedule</h5>
                                    {(() => {
                                        const med = settings?.scheduledMedications?.find(m => m.name === medicalForm.name);
                                        const interval = med?.schedules?.[selectedBatch?.type];
                                        return (
                                            <>
                                                <p className="text-xs text-green-700 mb-2">
                                                    Recommended interval for {selectedBatch?.type}: <strong>{interval || 'N/A'} days</strong>.
                                                </p>
                                                <p className="text-xs text-gray-500">The system will remind you based on this schedule.</p>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <select
                                value={medicalForm.name}
                                onChange={e => setMedicalForm({ ...medicalForm, name: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-orange-500/20 mb-2"
                            >
                                <option value="">Select Name...</option>
                                {(medicalForm.type === 'Vaccination' ? settings?.vaccineNames : settings?.medicineNames)?.map((opt, idx) => (
                                    <option key={idx} value={opt}>{opt}</option>
                                ))}
                                <option value="Other">Other</option>
                            </select>
                            {medicalForm.name === 'Other' && (
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter Name"
                                    value={medicalForm.otherName}
                                    onChange={e => setMedicalForm({ ...medicalForm, otherName: e.target.value })}
                                    className="w-full px-3 py-2 border border-blue-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-blue-50"
                                />
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost (₹)</label>
                            <input required type="number" min="0" value={medicalForm.cost} onChange={e => setMedicalForm({ ...medicalForm, cost: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-orange-500/20" />
                        </div>
                        <div className="flex items-end mb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={medicalForm.addToExpenses}
                                    onChange={e => setMedicalForm({ ...medicalForm, addToExpenses: e.target.checked })}
                                    className="rounded text-orange-600 focus:ring-orange-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Add to Expenses</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea rows="2" value={medicalForm.notes} onChange={e => setMedicalForm({ ...medicalForm, notes: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="Doctor name, dosage, etc." />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsMedicalModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Record'}
                        </button>
                    </div>
                </form>
            </Modal>
            {/* --- MODALS FOR FLOCK MANAGEMENT --- */}

            {/* Bulk Sale Modal */}
            <Modal isOpen={isBulkSaleOpen} onClose={() => setIsBulkSaleOpen(false)} title="Record Flock Sale">
                <form onSubmit={handleBulkSale} className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-700">
                        <strong>Note:</strong> This will mark the next N active animals as Sold.
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Number Sold</label>
                        <input
                            required
                            type="number"
                            min="1"
                            value={bulkSaleForm.count}
                            onChange={e => setBulkSaleForm({ ...bulkSaleForm, count: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                            placeholder="e.g. 20"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Animal (₹)</label>
                            <input
                                required
                                type="number"
                                min="0"
                                value={bulkSaleForm.pricePerAnimal}
                                onChange={e => setBulkSaleForm({ ...bulkSaleForm, pricePerAnimal: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sold Date</label>
                            <input
                                required
                                type="date"
                                value={bulkSaleForm.soldDate}
                                onChange={e => setBulkSaleForm({ ...bulkSaleForm, soldDate: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsBulkSaleOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : 'Confirm Sale'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Flock Edit Attributes Modal */}
            <Modal isOpen={isFlockEditOpen} onClose={() => setIsFlockEditOpen(false)} title="Update Flock Status & Weight">
                <form onSubmit={handleFlockEdit} className="space-y-4">
                    <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-sm text-green-700">
                        <strong>Bulk Update:</strong> Changes will apply to ALL {activeAnimals.length} active animals in this flock.
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status (Whole Flock)</label>
                        <select
                            value={flockEditForm.status}
                            onChange={e => setFlockEditForm({ ...flockEditForm, status: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20"
                        >
                            <option value="Healthy">Healthy</option>
                            <option value="Sick">Sick</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Avg Weight (kg)</label>
                            <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={flockEditForm.avgWeight}
                                onChange={e => setFlockEditForm({ ...flockEditForm, avgWeight: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Avg Cost (₹)</label>
                            <input
                                type="number"
                                min="0"
                                value={flockEditForm.avgCost}
                                onChange={e => setFlockEditForm({ ...flockEditForm, avgCost: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bought Date</label>
                            <input
                                type="date"
                                value={flockEditForm.boughtDate}
                                onChange={e => setFlockEditForm({ ...flockEditForm, boughtDate: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            rows="2"
                            value={flockEditForm.notes}
                            onChange={e => setFlockEditForm({ ...flockEditForm, notes: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-green-500/20"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsFlockEditOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</> : 'Update Flock'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Sick Transition Modal */}
            <Modal isOpen={isSickTransitionOpen} onClose={() => setIsSickTransitionOpen(false)} title={`Move Animals: ${sickTransitionForm.fromStatus} → ${sickTransitionForm.toStatus}`}>
                <form onSubmit={handleSickTransition} className="space-y-4">
                    <div className={`p-4 rounded-lg border flex items-center gap-3 ${sickTransitionForm.toStatus === 'Sick' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}`}>
                        {sickTransitionForm.toStatus === 'Sick' ? <Stethoscope className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                        <div className="text-sm">
                            <strong>Action:</strong> Moving animals from {sickTransitionForm.fromStatus} to {sickTransitionForm.toStatus}.
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Animals</label>
                        <input
                            required
                            type="number"
                            min="1"
                            value={sickTransitionForm.count}
                            onChange={e => setSickTransitionForm({ ...sickTransitionForm, count: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-orange-500/20"
                            placeholder="e.g. 5"
                        />
                        <p className="text-xs text-gray-400 mt-1">Next available {sickTransitionForm.fromStatus} animals will be selected automatically.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Reason</label>
                        <textarea
                            value={sickTransitionForm.notes}
                            onChange={e => setSickTransitionForm({ ...sickTransitionForm, notes: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-orange-500/20"
                            placeholder="Reason for sickness, treatment plan, or recovery details..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsSickTransitionOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSaving} className={`px-4 py-2 text-white rounded-lg ${sickTransitionForm.toStatus === 'Sick' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} disabled:opacity-50 disabled:cursor-not-allowed flex items-center`}>
                            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Moving...</> : 'Confirm Move'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Global PDF Filter Modal (Memoized for performance) */}
            <GlobalPdfModal
                isOpen={isGlobalPdfModalOpen}
                onClose={() => setIsGlobalPdfModalOpen(false)}
                globalPdfFilterTypes={globalPdfFilterTypes}
                setGlobalPdfFilterTypes={setGlobalPdfFilterTypes}
                globalPdfBatchId={globalPdfBatchId}
                setGlobalPdfBatchId={setGlobalPdfBatchId}
                globalPdfStartDate={globalPdfStartDate}
                setGlobalPdfStartDate={setGlobalPdfStartDate}
                globalPdfEndDate={globalPdfEndDate}
                setGlobalPdfEndDate={setGlobalPdfEndDate}
                dataBatches={data.batches}
                handleGlobalPdfDownload={handleGlobalPdfDownload}
            />
        </div>
    );
};

export default Livestock;

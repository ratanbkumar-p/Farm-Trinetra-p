import React, { useState, useMemo } from 'react';
import { Plus, ArrowLeft, Trash2, Calendar, Edit2, Save, X, IndianRupee, TrendingUp, Scale, Check, ArrowUp, ArrowDown, Minus, ChevronDown, ChevronUp, Stethoscope, Syringe, Phone, MapPin, RotateCcw, Users, ArrowRight, Loader2 } from 'lucide-react';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getCurrentMonthKey, getMonthsBetween, ALLOCATION_ELIGIBLE_TYPES } from '../lib/allocationUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { useLocation } from 'react-router-dom';

// Helper for Age Formatting
const formatAge = (y, m, d) => {
    const parts = [];
    if (y > 0) parts.push(`${y} ${y === 1 ? 'Year' : 'Years'}`);
    if (m > 0) parts.push(`${m} ${m === 1 ? 'Month' : 'Months'}`);
    if (d > 0) parts.push(`${d} ${d === 1 ? 'Day' : 'Days'}`);
    return parts.length > 0 ? parts.join(' ') : '0 Days';
};

// Helper for Weight Formatting (Chicken specific)
const formatWeight = (kg) => {
    if (!kg) return '0g';
    const grams = Math.round(kg * 1000);
    if (grams < 1000) return `${grams}g`;
    const k = Math.floor(grams / 1000);
    const g = grams % 1000;
    return g > 0 ? `${k}kg ${g}g` : `${k}kg`;
};

const Livestock = () => {
    const location = useLocation();
    const { settings } = useSettings();
    const { data, addBatch, updateBatch, deleteAnimalFromBatch, deleteBatch, addWeightRecord, updateWeightRecord, sellSelectedAnimals, addExpense, updateExpense, deleteExpense, revertSoldAnimal, addContact, deleteContact, processMonthlyAllocations, getLiveAllocation } = useData();
    const { canEdit, isSuperAdmin, isAdmin } = useAuth();
    const canEditRecords = isSuperAdmin || isAdmin;
    const [selectedBatchId, setSelectedBatchId] = useState(null);

    // Main Tab for Livestock view: 'active' | 'sold' | 'deceased'
    const [mainTab, setMainTab] = useState('active');
    const [isSaving, setIsSaving] = useState(false);

    // Batch Detail Tab: 'animals' | 'expenses' | 'weight'
    const [batchTab, setBatchTab] = useState('animals');

    // Modals State
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [isAnimalModalOpen, setIsAnimalModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);

    // Hierarchical View States
    const [expandedDeceasedType, setExpandedDeceasedType] = useState(null);
    const [expandedSoldType, setExpandedSoldType] = useState(null);
    const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false); // New Contact Modal

    // Animal Edit State
    const [editingAnimalId, setEditingAnimalId] = useState(null);
    const [editingAnimalBatchId, setEditingAnimalBatchId] = useState(null);

    // Selective Sell State
    const [selectedAnimalsToSell, setSelectedAnimalsToSell] = useState([]);

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
        date: new Date().toISOString().split('T')[0]
    });

    const [expenseForm, setExpenseForm] = useState({
        type: 'Feed',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
    });

    const [editingBatchExpense, setEditingBatchExpense] = useState(null);

    // Navigation Handler
    /* 
    // Disabled due to crash
    useEffect(() => {
        if (location.state && location.state.selectBatchId) {
            setSelectedBatchId(location.state.selectBatchId);
        }
    }, [location.state]); 
    */

    // Sell Modal State
    const [sellForm, setSellForm] = useState({
        pricePerAnimal: 0
    });

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
    const [isBulkDeceasedOpen, setIsBulkDeceasedOpen] = useState(false);
    const [isBulkSaleOpen, setIsBulkSaleOpen] = useState(false);
    const [isFlockEditOpen, setIsFlockEditOpen] = useState(false);

    const [bulkDeceasedForm, setBulkDeceasedForm] = useState({ count: '', reason: 'Sickness', notes: '' });
    const [bulkSaleForm, setBulkSaleForm] = useState({ count: '', pricePerAnimal: '', soldDate: new Date().toISOString().split('T')[0] });
    const [flockEditForm, setFlockEditForm] = useState({ avgWeight: '', avgCost: '', status: 'Healthy', notes: '', boughtDate: '', targetGroup: 'Healthy' });

    // Sick Transition State
    // Sick Transition State
    const [isSickTransitionOpen, setIsSickTransitionOpen] = useState(false);
    const [sickTransitionForm, setSickTransitionForm] = useState({ count: '', fromStatus: '', toStatus: '', notes: '' });

    // Contact Form State
    const [contactForm, setContactForm] = useState({ name: '', phone: '', location: '', type: 'Doctor' }); // Default Doctor

    // Dashboard Expansion State
    const [expandedCard, setExpandedCard] = useState(null); // 'active', 'sick', 'mortality', 'sold'

    // Global PDF Modal State
    const [isGlobalPdfModalOpen, setIsGlobalPdfModalOpen] = useState(false);
    const [globalPdfFilterTypes, setGlobalPdfFilterTypes] = useState(['Goat', 'Sheep', 'Poultry', 'Chicken', 'Cow']);
    const [globalPdfStartDate, setGlobalPdfStartDate] = useState('');
    const [globalPdfEndDate, setGlobalPdfEndDate] = useState('');
    const [globalPdfBatchId, setGlobalPdfBatchId] = useState('');

    // --- HANDLERS FOR FLOCK ---
    const handleBulkDeceased = async (e) => {
        e.preventDefault();
        const count = parseInt(bulkDeceasedForm.count);
        if (isNaN(count) || count <= 0) return alert("Invalid count");

        setIsSaving(true);
        try {
            // Get sorted active active animals
            const active = (selectedBatch?.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased');

            // Sort by ID to take "next sequence" (approximate by ID string or numeric parts)
            // IDs: P1-1, P1-2... 
            // We want to remove lowest numbers first? Or generally just "any N". 
            // User said "it takes from 1 to 20". So we should sort by ID.
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
                    return { ...a, status: 'Deceased', deathReason: bulkDeceasedForm.reason, notes: bulkDeceasedForm.notes };
                }
                return a;
            });

            await updateBatch(selectedBatch.id, { animals: updatedAnimals });
            setIsBulkDeceasedOpen(false);
            setBulkDeceasedForm({ count: '', reason: 'Sickness', notes: '' });
        } finally {
            setIsSaving(false);
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

    // Calculate total active value (purchase cost) across all batches for expense allocation
    const totalActiveValue = useMemo(() => {
        return data.batches.reduce((sum, batch) => {
            const batchValue = (batch.animals || [])
                .filter(a => a.status !== 'Sold' && a.status !== 'Deceased')
                .reduce((bSum, a) => bSum + (Number(a.purchaseCost) || 0), 0);
            return sum + batchValue;
        }, 0);
    }, [data.batches]);

    // Calculate monthly general expenses (non-batch-linked expenses + yearly split)
    const monthlyGeneralExpenses = useMemo(() => {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        // Regular expenses not linked to any batch/crop/fruit AND matching current month
        const regularUnlinked = (data.expenses || [])
            .filter(e => !e.batchId && !e.cropId && !e.fruitId && e.date && e.date.startsWith(currentMonth))
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        // Yearly expenses split by 12
        const yearlyMonthly = (data.yearlyExpenses || [])
            .reduce((sum, e) => sum + (Number(e.monthlyAmount) || Math.round(Number(e.amount) / 12) || 0), 0);

        return regularUnlinked + yearlyMonthly;
    }, [data.expenses, data.yearlyExpenses]);

    // Expense per Rupee of Asset Value (Allocation Ratio)
    // If total active value is 0, we fallback to HEADCOUNT allocation to avoid showing 0 expenses.
    // This handles cases where user hasn't entered purchase costs yet.

    const fallbackToHeadcount = totalActiveValue === 0;

    // Calculate total active animals for fallback
    const totalActiveAnimals = useMemo(() => {
        return data.batches.reduce((sum, batch) => {
            const active = (batch.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased').length;
            return sum + active;
        }, 0);
    }, [data.batches]);


    // If using value: Ratio = Expense / Value
    // If using headcount: Rate = Expense / Count
    const expenseAllocationRatio = !fallbackToHeadcount
        ? (totalActiveValue > 0 ? monthlyGeneralExpenses / totalActiveValue : 0)
        : (totalActiveAnimals > 0 ? monthlyGeneralExpenses / totalActiveAnimals : 0);

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

                            return {
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
                            }]
                        };
                    });

                    const updatedAnimals = [...(targetBatch.animals || []), ...newAnimals];
                    await updateBatch(targetBatch.id, { animals: updatedAnimals });
                }
            }

            setIsAnimalModalOpen(false);
            setAnimalForm({ count: 1, gender: 'Female', weight: '', cost: '', status: 'Healthy', ageYears: '', ageMonths: '', ageDays: '', category: 'Kid', date: new Date().toISOString().split('T')[0] });
        } catch (error) {
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
        updateBatch(selectedBatch.id, { ...selectedBatch, medical: updatedMedical });
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

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        console.log("Submitting contact:", contactForm);
        setIsSaving(true);
        try {
            await addContact(contactForm);
            alert("Contact Added Successfully!");
            setIsContactModalOpen(false);
            setContactForm({ name: '', phone: '', location: '', type: 'Doctor' }); // Reset
        } catch (error) {
            console.error("Error adding contact:", error);
            alert("Failed to add contact: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteContact = (id) => {
        if (!isSuperAdmin && !canEdit) return; // SuperAdmin or Admin
        if (window.confirm("Delete this contact?")) {
            deleteContact(id);
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
            await updateBatch(selectedBatch.id, { ...selectedBatch, expenses: updatedExpenses });

            // Delete global expense document
            await deleteExpense(expenseId);
        }
    };

    console.log("LIVESTOCK RENDER: isContactModalOpen =", isContactModalOpen);

    // Helper to identify if animal is a Kid (< 1 Year)
    const isKid = (animal) => {
        if (!animal.age) return true; // Assume kid if no age
        const matchY = animal.age.match(/(\d+)\s*Year/i);
        if (matchY && parseInt(matchY[1]) > 0) return false; // Is Adult
        return true;
    };

    const handleQuickSelect = (type) => {
        const active = (selectedBatch.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased');
        let groupIds = [];

        if (type === 'Kids') {
            groupIds = active.filter(a => isKid(a)).map(a => a.id);
        } else if (type === 'Adults') {
            groupIds = active.filter(a => !isKid(a)).map(a => a.id);
        } else {
            // Both / All
            groupIds = active.map(a => a.id);
        }

        const allSelected = groupIds.length > 0 && groupIds.every(id => selectedAnimalsToSell.includes(id));

        if (allSelected) {
            setSelectedAnimalsToSell(prev => prev.filter(id => !groupIds.includes(id)));
        } else {
            setSelectedAnimalsToSell(prev => {
                const newSelection = [...prev];
                groupIds.forEach(id => {
                    if (!newSelection.includes(id)) newSelection.push(id);
                });
                return newSelection;
            });
        }
    };

    // Selective Sell Handler
    const openSellModal = () => {
        // Calculate suggested price
        const financials = calculateBatchFinancials(selectedBatch);
        const activeAnimals = (selectedBatch?.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased');

        if (activeAnimals.length === 0) {
            alert('No active animals to sell!');
            return;
        }

        // Default to "Total Price" based on minSellPrice
        // Default to 0 based on user request
        setSellForm({
            totalPrice: 0,
            pricePerAnimal: 0,
            // Select all by default
            selectedIds: activeAnimals.map(a => a.id)
        });
        // Also populate selection state
        setSelectedAnimalsToSell(activeAnimals.map(a => a.id));
        setIsSellModalOpen(true);
    };

    const handleSellSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBatch) return;

        const count = selectedAnimalsToSell.length;
        if (count === 0) {
            alert("Please select at least one animal.");
            return;
        }

        const total = Number(sellForm.totalPrice);
        const pricePerAnimal = count > 0 ? Math.round(total / count) : 0;

        setIsSaving(true);
        try {
            // Use the selected IDs
            await sellSelectedAnimals(selectedBatch.id, selectedAnimalsToSell, pricePerAnimal);
            setIsSellModalOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleAnimalSelection = (id) => {
        if (selectedAnimalsToSell.includes(id)) {
            setSelectedAnimalsToSell(prev => prev.filter(aid => aid !== id));
        } else {
            setSelectedAnimalsToSell(prev => [...prev, id]);
        }
    };

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
                date: animal.boughtDate || ''
            });
        } else {
            setEditingAnimalId(null);
            setAnimalForm({ count: 1, gender: 'Female', weight: '', cost: '', status: 'Healthy', ageYears: '', ageMonths: '' });
        }
        setIsAnimalModalOpen(true);
    };

    const calculateBatchFinancials = (batch) => {
        if (!batch) return {};

        const animals = batch.animals || [];
        const expenses = batch.expenses || [];
        const activeAnimals = animals.filter(a => a.status !== 'Sold' && a.status !== 'Deceased');
        const soldAnimals = animals.filter(a => a.status === 'Sold');
        const deceasedAnimals = animals.filter(a => a.status === 'Deceased');

        // Days active
        const startDate = new Date(batch.date || Date.now());
        const daysActive = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24)) || 1;

        // Costs
        const totalAnimalCost = animals.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0);
        const totalSpecificExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        // Feed Cost - NOW REMOVED AUTOMATIC CALCULATION as per user request
        // Only explicit expenses are counted
        const totalFeedCost = 0;

        // Allocated Expense (Global Expenses + Salaries / Total Value * Batch Active Value)

        // Calculate Batch Active Value for allocation (fallback calculation)
        const batchActiveValue = activeAnimals.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0);

        // Use stored monthlyAllocations as source of truth if available
        const storedAllocationsTotal = (batch.monthlyAllocations || []).reduce((sum, a) => sum + (a.amount || 0), 0);

        // Fallback to old calculation if no stored allocations
        const calculatedAllocatedExpense = !fallbackToHeadcount
            ? batchActiveValue * expenseAllocationRatio
            : activeAnimals.length * expenseAllocationRatio;

        // Use stored allocations if available, otherwise use calculated
        const allocatedExpense = storedAllocationsTotal > 0 ? storedAllocationsTotal : calculatedAllocatedExpense;

        // Allocation Share Percentage
        // If fallback, it's (Batch Count / Total Count) * 100
        // If value, it's (Batch Value / Total Value) * 100
        const allocationPercentage = !fallbackToHeadcount
            ? (totalActiveValue > 0 ? (batchActiveValue / totalActiveValue) * 100 : 0)
            : (totalActiveAnimals > 0 ? (activeAnimals.length / totalActiveAnimals) * 100 : 0);

        // Total Investment
        const totalInvested = totalAnimalCost + totalSpecificExpenses + totalFeedCost + allocatedExpense;

        // Revenue
        const soldRevenue = soldAnimals.reduce((sum, a) => sum + (Number(a.soldPrice) || 0), 0);
        const deceasedLoss = deceasedAnimals.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0);

        // Profit
        const soldProfit = soldRevenue - (soldAnimals.length > 0 ? (totalInvested / animals.length) * soldAnimals.length : 0);

        // Min Sell Price
        const marginMultiplier = 1 + (Number(settings.marginPercentage) || 20) / 100;
        const totalPerAnimalCost = animals.length > 0 ? totalInvested / animals.length : 0;
        const minSellPrice = totalPerAnimalCost * marginMultiplier;

        // Detailed breakdowns for UI
        const specificExpensePerAnimal = animals.length > 0 ? totalSpecificExpenses / animals.length : 0;
        const purchaseCostPerAnimal = animals.length > 0 ? totalAnimalCost / animals.length : 0;
        const allocatedPerAnimal = animals.length > 0 ? allocatedExpense / animals.length : 0;

        return {
            totalInvested,
            totalAnimalCost,
            operationalCost: totalSpecificExpenses, // Only specific expenses now
            allocatedExpense,
            minSellPrice,
            daysActive,
            activeAnimals: activeAnimals.length,
            soldAnimals: soldAnimals.length,
            deceasedAnimals: deceasedAnimals.length,
            soldRevenue,
            soldProfit,
            deceasedLoss,
            // Per Animal Stats
            totalPerAnimalCost,
            specificExpensePerAnimal,
            purchaseCostPerAnimal,
            allocatedPerAnimal
        };
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Healthy': return 'bg-green-100 text-green-700';
            case 'Sick': return 'bg-orange-100 text-orange-700';
            case 'Sold': return 'bg-blue-100 text-blue-700';
            case 'Deceased': return 'bg-gray-100 text-gray-500';
            default: return 'bg-green-100 text-green-700';
        }
    };

    // Per-animal break-even price:
    // Each animal absorbs expenses proportional to its purchase cost
    // Break-Even = purchaseCost + (purchaseCost / totalPurchaseCost) * totalExpenses
    const calculateAnimalBreakEven = (animal, batch) => {
        if (!batch || !animal) return 0;
        const animals = batch.animals || [];
        const purchaseCost = Number(animal.purchaseCost) || 0;
        const totalAnimalCost = animals.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0);
        const expenses = batch.expenses || [];
        const totalSpecificExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const storedAllocationsTotal = (batch.monthlyAllocations || []).reduce((sum, a) => sum + (a.amount || 0), 0);
        const activeAnimals = animals.filter(a => a.status !== 'Sold' && a.status !== 'Deceased');
        const batchActiveValue = activeAnimals.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0);
        const calculatedAllocatedExpense = !fallbackToHeadcount
            ? batchActiveValue * expenseAllocationRatio
            : activeAnimals.length * expenseAllocationRatio;
        const allocatedExpense = storedAllocationsTotal > 0 ? storedAllocationsTotal : calculatedAllocatedExpense;
        const totalExpenses = totalSpecificExpenses + allocatedExpense;

        let expenseShare = 0;
        if (totalAnimalCost > 0) {
            expenseShare = (purchaseCost / totalAnimalCost) * totalExpenses;
        } else if (animals.length > 0) {
            expenseShare = totalExpenses / animals.length;
        }
        return {
            originalPrice: purchaseCost,
            expenses: Math.round(expenseShare),
            trueCost: Math.round(purchaseCost + expenseShare)
        };
    };

    const allSoldAnimals = useMemo(() => {
        return data.batches.flatMap(b => (b.animals || [])
            .filter(a => a.status === 'Sold')
            .map(a => {
                const costs = calculateAnimalBreakEven(a, b);
                return { ...a, batchId: b.id, batchName: b.name, batchType: b.type, originalPrice: costs.originalPrice, expenses: costs.expenses, trueCost: costs.trueCost };
            })
        ).sort((a, b) => new Date(b.soldDate || 0) - new Date(a.soldDate || 0));
    }, [data.batches, fallbackToHeadcount, expenseAllocationRatio]);

    const soldStats = useMemo(() => {
        return allSoldAnimals.reduce((acc, a) => {
            const rev = Number(a.soldPrice) || 0;
            const cost = a.trueCost || 0;
            acc.totalRevenue += rev;
            acc.totalCost += cost;
            acc.totalProfit += (rev - cost);
            return acc;
        }, { totalRevenue: 0, totalCost: 0, totalProfit: 0 });
    }, [allSoldAnimals]);

    const allDeceasedAnimals = useMemo(() => {
        return data.batches.flatMap(b => (b.animals || [])
            .filter(a => a.status === 'Deceased')
            .map(a => {
                const costs = calculateAnimalBreakEven(a, b);
                return { ...a, batchId: b.id, batchName: b.name, batchType: b.type, originalPrice: costs.originalPrice, expenses: costs.expenses, trueCost: costs.trueCost };
            })
        ).sort((a, b) => new Date(b.deceasedDate || 0) - new Date(a.deceasedDate || 0));
    }, [data.batches, fallbackToHeadcount, expenseAllocationRatio]);

    const deceasedStats = useMemo(() => {
        const totalLoss = allDeceasedAnimals.reduce((sum, a) => sum + (a.trueCost || 0), 0);
        return {
            totalLoss,
            avgLoss: allDeceasedAnimals.length > 0 ? Math.round(totalLoss / allDeceasedAnimals.length) : 0
        };
    }, [allDeceasedAnimals]);

    // --- RENDER: MAIN LIST ---
    if (!selectedBatch) {
        if (mainTab === 'sold') {
            return (
                <div className="space-y-6 mb-20">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Sold Animals</h1>
                            <p className="text-gray-500">Track all sold animals across batches</p>
                        </div>
                        <button onClick={() => setIsGlobalPdfModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all font-medium">
                            Download PDF
                        </button>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-2 border-b border-gray-200">
                        <button onClick={() => setMainTab('active')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'active' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}>🐐 Active Batches</button>
                        <button onClick={() => setMainTab('sold')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'sold' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>💰 Sold Animals</button>
                        <button onClick={() => setMainTab('deceased')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'deceased' ? 'text-gray-600 border-b-2 border-gray-600' : 'text-gray-500 hover:text-gray-800'}`}>⚰️ Deceased</button>
                        <button onClick={() => setMainTab('completed')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'completed' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-800'}`}>🏆 Completed</button>
                    </div>



                    {/* Summary Stats */}
                    {/* Summary Stats - Hide for Vets */}
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase">Total Sold</p>
                            <p className="text-2xl font-bold text-blue-600">{allSoldAnimals.length}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase">Total Revenue</p>
                            <p className="text-2xl font-bold text-green-600">₹ {soldStats.totalRevenue.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase">Animal Cost</p>
                            <p className="text-2xl font-bold text-gray-800">₹ {soldStats.totalCost.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase">Gross Profit/Loss</p>
                            <p className={`text-2xl font-bold ${soldStats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₹ {soldStats.totalProfit.toLocaleString()}
                            </p>
                        </div>
                    </div>


                    {/* Sold Animals Hierarchical View */}
                    <div className="space-y-4">
                        {allSoldAnimals.length > 0 ? (
                            Object.entries(allSoldAnimals.reduce((acc, animal) => {
                                const type = animal.batchType || 'Unknown';
                                if (!acc[type]) acc[type] = [];
                                acc[type].push(animal);
                                return acc;
                            }, {})).map(([type, animals]) => {
                                const typeRevenue = animals.reduce((sum, a) => sum + (Number(a.soldPrice) || 0), 0);
                                const typeCost = animals.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0);
                                const typeProfit = typeRevenue - typeCost;
                                const isExpanded = expandedSoldType === type;

                                // Group by Batch
                                const batches = animals.reduce((acc, animal) => {
                                    const batchName = animal.batchName || 'Unknown Batch';
                                    if (!acc[batchName]) acc[batchName] = [];
                                    acc[batchName].push(animal);
                                    return acc;
                                }, {});

                                return (
                                    <div key={type} className={`bg-white rounded-xl shadow-sm border transition-all ${isExpanded ? 'border-blue-300 ring-4 ring-blue-50' : 'border-gray-100 hover:border-blue-200'}`}>
                                        <div
                                            onClick={() => setExpandedSoldType(isExpanded ? null : type)}
                                            className="p-5 flex justify-between items-center cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl bg-blue-50 text-blue-600`}>
                                                    {type === 'Goat' ? '🐐' : type === 'Sheep' ? '🐑' : type === 'Chicken' ? '🐔' : type === 'Poultry' ? '🐣' : '💰'}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-800 text-lg">{type}</h3>
                                                    <p className="text-sm text-gray-500">{animals.length} animals sold</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-6">
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Revenue</p>
                                                    <p className="font-bold text-blue-600 text-lg">₹ {typeRevenue.toLocaleString()}</p>
                                                </div>
                                                <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                    <ChevronDown className="w-6 h-6 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded: Batches */}
                                        {isExpanded && (
                                            <div className="bg-blue-50/50 p-6 border-t border-blue-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                {Object.entries(batches).map(([batchName, batchAnimals]) => {
                                                    const batchRevenue = batchAnimals.reduce((sum, a) => sum + (Number(a.soldPrice) || 0), 0);
                                                    const batchCost = batchAnimals.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0);
                                                    const batchProfit = batchRevenue - batchCost;

                                                    return (
                                                        <div key={batchName} className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                                            <div>
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <h4 className="font-bold text-gray-700 truncate" title={batchName}>{batchName}</h4>
                                                                    <span className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full font-bold">{batchAnimals.length}</span>
                                                                </div>

                                                                <div className="space-y-1 mt-4">
                                                                    <div className="flex justify-between text-sm">
                                                                        <span className="text-gray-500">Revenue</span>
                                                                        <span className="font-bold text-gray-800">₹ {batchRevenue.toLocaleString()}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-sm">
                                                                        <span className="text-gray-500">Profit</span>
                                                                        <span className={`font-bold ${batchProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                            {batchProfit >= 0 ? '+' : ''} ₹ {batchProfit.toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-4 pt-3 border-t border-gray-50 flex justify-end">
                                                                    {isSuperAdmin && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const batchId = batchAnimals[0].batchId;
                                                                                setSelectedBatchId(batchId);
                                                                                setMainTab('active');
                                                                            }}
                                                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                                                        >
                                                                            View Batch <ArrowRight className="w-3 h-3" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                                <p className="text-gray-400 text-lg">No sold animals recorded yet</p>
                                <p className="text-gray-300 text-sm mt-1">Start selling to see data here!</p>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        if (mainTab === 'deceased') {
            return (
                <div className="space-y-6 mb-20">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Deceased Animals</h1>
                            <p className="text-gray-500">Track losses from deceased animals</p>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-2 border-b border-gray-200">
                        <button onClick={() => setMainTab('active')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'active' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}>🐐 Active Batches</button>
                        <button onClick={() => setMainTab('sold')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'sold' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>💰 Sold Animals</button>
                        <button onClick={() => setMainTab('deceased')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'deceased' ? 'text-gray-600 border-b-2 border-gray-600' : 'text-gray-500 hover:text-gray-800'}`}>⚰️ Deceased</button>
                        <button onClick={() => setMainTab('completed')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'completed' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-800'}`}>🏆 Completed</button>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase">Total Deceased</p>
                            <p className="text-2xl font-bold text-gray-600">{allDeceasedAnimals.length}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase">Total Loss</p>
                            <p className="text-2xl font-bold text-red-600">₹ {deceasedStats.totalLoss.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase">Avg Loss / Animal</p>
                            <p className="text-2xl font-bold text-red-600">
                                ₹ {deceasedStats.avgLoss.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Deceased Animals Hierarchical View */}
                    <div className="space-y-4">
                        {allDeceasedAnimals.length > 0 ? (
                            Object.entries(allDeceasedAnimals.reduce((acc, animal) => {
                                const type = animal.batchType || 'Unknown';
                                if (!acc[type]) acc[type] = [];
                                acc[type].push(animal);
                                return acc;
                            }, {})).map(([type, animals]) => {
                                const typeLoss = animals.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0);
                                const isExpanded = expandedDeceasedType === type;

                                // Group by Batch
                                const batches = animals.reduce((acc, animal) => {
                                    const batchName = animal.batchName || 'Unknown Batch';
                                    if (!acc[batchName]) acc[batchName] = [];
                                    acc[batchName].push(animal);
                                    return acc;
                                }, {});

                                return (
                                    <div key={type} className={`bg-white rounded-xl shadow-sm border transition-all ${isExpanded ? 'border-gray-300 ring-4 ring-gray-100' : 'border-gray-100 hover:border-gray-300'}`}>
                                        <div
                                            onClick={() => setExpandedDeceasedType(isExpanded ? null : type)}
                                            className="p-5 flex justify-between items-center cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl bg-gray-100`}>
                                                    {type === 'Goat' ? '🐐' : type === 'Sheep' ? '🐑' : type === 'Chicken' ? '🐔' : type === 'Poultry' ? '🐣' : '🐾'}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-800 text-lg">{type}</h3>
                                                    <p className="text-sm text-gray-500">{animals.length} animals lost</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-6">
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Loss</p>
                                                    <p className="font-bold text-red-600 text-lg">₹ {typeLoss.toLocaleString()}</p>
                                                </div>
                                                <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                                    <ChevronDown className="w-6 h-6 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded: Batches */}
                                        {isExpanded && (
                                            <div className="bg-gray-50 p-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                {Object.entries(batches).map(([batchName, batchAnimals]) => {
                                                    const batchLoss = batchAnimals.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0);
                                                    return (
                                                        <div key={batchName} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                                                            <div>
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <h4 className="font-bold text-gray-700 truncate" title={batchName}>{batchName}</h4>
                                                                    <span className="bg-red-50 text-red-700 text-xs px-2 py-1 rounded-full font-bold">{batchAnimals.length}</span>
                                                                </div>
                                                                <div className="flex justify-between items-end mt-4">
                                                                    <div>
                                                                        <p className="text-xs text-gray-400 uppercase">Loss</p>
                                                                        <p className="font-bold text-red-600">₹ {batchLoss.toLocaleString()}</p>
                                                                    </div>
                                                                    {isSuperAdmin && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                // Just alert for now as reverting batch requires individual ID. 
                                                                                // Could show list on another click or just link to batch details.
                                                                                // For now, let's just let them know they can see details in the batch.
                                                                                const batchId = batchAnimals[0].batchId;
                                                                                setSelectedBatchId(batchId);
                                                                                setMainTab('active');
                                                                            }}
                                                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                                                        >
                                                                            View Batch <ArrowRight className="w-3 h-3" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                                <p className="text-gray-400 text-lg">No deceased animals recorded 🎉</p>
                                <p className="text-gray-300 text-sm mt-1">Keep up the good work!</p>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // Active Batches View
        return (
            <div className="space-y-6 mb-20">
                {/* Contact Modal - Raw Implementation */}
                {isContactModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                            onClick={() => setIsContactModalOpen(false)}
                        />

                        {/* Modal Content */}
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative z-10">
                            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900">Add Veterinary Contact</h3>
                                <button
                                    onClick={() => setIsContactModalOpen(false)}
                                    className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 max-h-[80vh] overflow-y-auto">
                                <form onSubmit={handleContactSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={contactForm.name}
                                            onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full rounded-xl border-gray-300 focus:border-green-500 focus:ring-green-500"
                                            placeholder="e.g. Dr. Ramesh"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                        <input
                                            type="tel"
                                            required
                                            value={contactForm.phone}
                                            onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                                            className="w-full rounded-xl border-gray-300 focus:border-green-500 focus:ring-green-500"
                                            placeholder="e.g. 9876543210"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Location (Village/City)</label>
                                        <input
                                            type="text"
                                            required
                                            value={contactForm.location}
                                            onChange={(e) => setContactForm(prev => ({ ...prev, location: e.target.value }))}
                                            className="w-full rounded-xl border-gray-300 focus:border-green-500 focus:ring-green-500"
                                            placeholder="e.g. Indiranagar"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['Doctor', 'Assistant'].map(type => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setContactForm(prev => ({ ...prev, type }))}
                                                    className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${contactForm.type === type
                                                        ? 'bg-green-50 border-green-200 text-green-700 ring-1 ring-green-500'
                                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsContactModalOpen(false)}
                                            className="flex-1 py-3 text-gray-700 font-medium hover:bg-gray-50 rounded-xl transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
                                        >
                                            Save Contact
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Livestock Batches</h1>
                        <p className="text-gray-500">Manage your farm by batches.</p>
                    </div>
                    <div className="flex items-center gap-3">

                        <button
                            onClick={() => openBatchModal()}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-green-200 transition-all font-medium"
                        >
                            <Plus className="w-5 h-5" />
                            New Batch
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 border-b border-gray-200">
                    <button onClick={() => setMainTab('active')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'active' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}>🐐 Active Batches</button>
                    <button onClick={() => setMainTab('sold')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'sold' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>💰 Sold Animals ({allSoldAnimals.length})</button>
                    <button onClick={() => setMainTab('deceased')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'deceased' ? 'text-gray-600 border-b-2 border-gray-600' : 'text-gray-500 hover:text-gray-800'}`}>⚰️ Deceased ({allDeceasedAnimals.length})</button>
                    <button onClick={() => setMainTab('completed')} className={`px-4 py-2 font-medium transition-colors ${mainTab === 'completed' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-800'}`}>🏆 Completed ({data.batches.filter(b => b.status === 'Completed').length})</button>
                </div>

                {/* Grid View */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {data.batches
                        .filter(batch => {
                            if (mainTab === 'completed') return batch.status === 'Completed';
                            // Default to active/raising view (show everything NOT completed)
                            return batch.status !== 'Completed';
                        })
                        .map(batch => {
                            const f = calculateBatchFinancials(batch);
                            return (
                                <motion.div
                                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                                    key={batch.id}
                                    onClick={() => setSelectedBatchId(batch.id)}
                                    className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md h-fit"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <div>
                                            <h3 className="text-base font-bold flex items-center gap-1.5" style={{ color: batch.color || '#1F2937' }}>
                                                {batch.name}
                                                {batch.shortId && <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded border border-gray-200">#{batch.shortId}</span>}
                                            </h3>
                                            <span className="text-xs text-gray-500 font-medium">{batch.type} Batch</span>
                                        </div>
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-md text-xs font-bold">{f.activeAnimals} Active</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs border-t border-gray-100 pt-2">
                                        <div>
                                            <p className="text-gray-400 text-xs">Bought Cost</p>
                                            <p className="font-bold text-gray-700 text-sm">₹{Math.round(f.totalAnimalCost).toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gray-400 text-xs">Total Invested</p>
                                            <p className="font-bold text-gray-700 text-sm">₹{Math.round(f.totalInvested).toLocaleString()}</p>
                                        </div>

                                        <div>
                                            <p className="text-gray-400 text-xs">Allocated</p>
                                            <p className="font-medium text-amber-600 text-sm">₹{(f.allocatedExpense || 0).toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gray-400 text-xs">Cost/Animal</p>
                                            <p className="font-bold text-gray-700 text-sm">₹{Math.round(f.totalPerAnimalCost).toLocaleString()}</p>
                                        </div>

                                        <div>
                                            <p className="text-gray-400 text-xs">Sold Rev</p>
                                            <p className="font-medium text-blue-600 text-sm">₹{f.soldRevenue?.toLocaleString() || 0}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gray-400 text-xs">Min. Sell Price</p>
                                            <p className="font-bold text-green-600 text-sm">₹{Math.round(f.minSellPrice).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                </div>


                {/* Modals for List View */}
                <Modal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} title="Create New Batch">
                    <form onSubmit={handleBatchSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
                            <input required type="text" value={batchForm.name} onChange={e => setBatchForm({ ...batchForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 outline-none" placeholder="e.g., Spring 2024 Goats" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Livestock Type</label>
                            <select value={batchForm.type} onChange={e => setBatchForm({ ...batchForm, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 outline-none">
                                <option value="Goat">Goat</option>
                                <option value="Sheep">Sheep</option>
                                <option value="Poultry">Poultry</option>
                                <option value="Cow">Cow</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input required type="date" value={batchForm.startDate} onChange={e => setBatchForm({ ...batchForm, startDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 outline-none" />
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

                {/* SELL MODAL - UPGRADED */}
                <Modal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)} title="Sell Animals">
                    <form onSubmit={handleSellSubmit} className="space-y-6">
                        {/* Financial breakdown for the deal */}
                        {selectedBatch && (
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm space-y-2">
                                <h4 className="font-bold text-blue-800 border-b border-blue-200 pb-2 mb-2">Cost Breakdown per Animal</h4>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Purchase Cost:</span>
                                    <span>₹ {Math.round(calculateBatchFinancials(selectedBatch).purchaseCostPerAnimal).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Batch Expenses:</span>
                                    <span>+ ₹ {Math.round(calculateBatchFinancials(selectedBatch).specificExpensePerAnimal).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Allocated (Staff/General):</span>
                                    <span>+ ₹ {Math.round(calculateBatchFinancials(selectedBatch).allocatedPerAnimal).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-blue-200 font-bold">
                                    <span className="text-blue-800">Total Cost Basis:</span>
                                    <span>₹ {Math.round(calculateBatchFinancials(selectedBatch).totalPerAnimalCost).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between pt-1 font-bold">
                                    <span className="text-green-700">Suggested Price (+{settings.marginPercentage}%):</span>
                                    <span className="text-green-700">₹ {Math.round(calculateBatchFinancials(selectedBatch).minSellPrice).toLocaleString()}</span>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price Per Animal (₹)</label>

                            {/* Margin Options */}
                            <div className="flex gap-2 mb-2">
                                <button
                                    type="button"
                                    onClick={() => setSellForm({ ...sellForm, pricePerAnimal: Math.round(financials.minSellPrice * 1.1) })}
                                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 text-gray-600"
                                >
                                    Min + 10%
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSellForm({ ...sellForm, pricePerAnimal: Math.round(financials.minSellPrice * 1.2) })}
                                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 text-gray-600"
                                >
                                    Min + 20%
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSellForm({ ...sellForm, pricePerAnimal: Math.round(financials.minSellPrice * 1.3) })}
                                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 text-gray-600"
                                >
                                    Min + 30%
                                </button>
                            </div>

                            <input
                                required
                                type="number"
                                value={sellForm.pricePerAnimal}
                                onChange={e => setSellForm({ ...sellForm, pricePerAnimal: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-bold text-green-700 outline-none focus:ring-2 focus:ring-green-500/20"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {(Number(sellForm.pricePerAnimal) - calculateBatchFinancials(selectedBatch).totalPerAnimalCost) >= 0
                                    ? <span className="text-green-600">Profit: ₹ {Math.round(Number(sellForm.pricePerAnimal) - calculateBatchFinancials(selectedBatch).totalPerAnimalCost)} per animal</span>
                                    : <span className="text-red-500">Loss: ₹ {Math.round(Number(sellForm.pricePerAnimal) - calculateBatchFinancials(selectedBatch).totalPerAnimalCost)} per animal</span>
                                }
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Animals to Sell ({selectedAnimalsToSell.length})</label>
                            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                                {(selectedBatch?.animals || []).filter(a => a.status !== 'Sold' && a.status !== 'Deceased').map(animal => (
                                    <label key={animal.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedAnimalsToSell.includes(animal.id)}
                                            onChange={() => toggleAnimalSelection(animal.id)}
                                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                        />
                                        <div className="flex-1 flex justify-between">
                                            <span className="font-medium text-gray-700">{animal.id}</span>
                                            <span className="text-sm text-gray-500">{animal.weight}kg • {animal.gender}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button type="button" onClick={() => setIsSellModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                            <button type="submit" disabled={isSaving || Number(sellForm.pricePerAnimal) === 0} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                                {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing Sale...</> : <>Confirm Sale (₹ {(Number(sellForm.pricePerAnimal) * selectedAnimalsToSell.length).toLocaleString()})</>}
                            </button>
                        </div>
                    </form>
                </Modal>

                {/* Global PDF Filter Modal */}
                <Modal isOpen={isGlobalPdfModalOpen} onClose={() => setIsGlobalPdfModalOpen(false)} title="Download Global Sales PDF">
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">Select which options to include in your global sales report:</p>

                        {/* Types */}
                        <div className="flex gap-2 flex-wrap mb-4">
                            {['Goat', 'Sheep', 'Poultry', 'Chicken', 'Cow'].map(type => (
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                <option value="">All Batches</option>
                                {data.batches.map(b => (
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                                <input
                                    type="date"
                                    value={globalPdfEndDate}
                                    onChange={e => setGlobalPdfEndDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                            <button onClick={() => setIsGlobalPdfModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
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

    return (
        <div className="space-y-6 mb-20">
            {/* Header & Back */}
            <button onClick={() => setSelectedBatchId(null)} className="flex items-center text-gray-500 hover:text-gray-800 font-medium">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Batches
            </button>

            <div className="flex flex-col md:flex-row justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: selectedBatch.color || '#1F2937' }}>
                            {selectedBatch.name}
                            {selectedBatch.shortId && <span className="px-3 py-1 bg-gray-100 text-gray-500 text-sm rounded-lg border border-gray-200 font-mono">#{selectedBatch.shortId}</span>}
                        </h1>
                        <button onClick={() => openBatchModal(selectedBatch)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><Edit2 className="w-4 h-4" /></button>
                        {/* Sell Button - Now in Header */}
                        {/* Sell Button - Now in Header */}
                        {activeAnimals.length > 0 && (
                            <button onClick={openSellModal} className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors flex items-center gap-1" title="Sell Animals">
                                <IndianRupee className="w-4 h-4" />
                                <span className="text-sm font-bold">Sell</span>
                            </button>
                        )}
                        {canEdit && (
                            <button onClick={handleDeleteBatch} className="p-2 text-red-300 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors" title="Delete Batch">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <p className="text-gray-500">{selectedBatch.type} • {selectedBatch.animals?.length || 0} Animals • {financials.daysActive} Days Active</p>
                </div>
                {/* Always show Min Sell Price in details too */}
                <div className="text-right">
                    <p className="text-sm text-gray-500">Minimum Sell Price</p>
                    <h2 className="text-3xl font-bold text-green-600">₹ {Math.round(financials.minSellPrice).toLocaleString()}</h2>
                    <p className="text-xs text-gray-400">Total Cost Basis: ₹ {Math.round(financials.totalPerAnimalCost).toLocaleString()}</p>
                </div>
            </div>

            {/* Detail Tabs */}
            <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
                <button onClick={() => setBatchTab('animals')} className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${batchTab === 'animals' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-800'}`}>Overview</button>
                <button onClick={() => setBatchTab('weight')} className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${batchTab === 'weight' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>Weight Tracking</button>
                <button onClick={() => setBatchTab('medical')} className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${batchTab === 'medical' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500 hover:text-gray-800'}`}>Medical Records</button>
                <button onClick={() => setBatchTab('sold')} className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${batchTab === 'sold' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>Sold Animals</button>
            </div>

            {/* TAB: OVERVIEW (Animals + Expenses) */}
            {batchTab === 'animals' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Animal List (Split by Category) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Header */}
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 text-xl">Animal Inventory</h3>
                            <div className="flex gap-2">
                                <span className="text-sm text-gray-500 self-center">Total {activeAnimals.length} Active</span>
                                <button onClick={() => openAnimalModal()} className="flex items-center gap-1 text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100 transition-colors">
                                    <Plus className="w-4 h-4" /> Add Animals
                                </button>
                            </div>
                        </div>

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
                                        {activeAnimals.filter(a => a.category === 'Adult').length} animals
                                    </span>
                                </div>
                                {isAdultsOpen && (
                                    <div className="divide-y divide-gray-50">
                                        {activeAnimals.filter(a => a.category === 'Adult').length > 0 ? (
                                            activeAnimals.filter(a => a.category === 'Adult').map(animal => (
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
                                                                    <span className={`px-1.5 rounded ${animal.status === 'Healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{animal.status}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            {/* Break-Even Price: before the down arrow */}
                                                            <div className="text-right block" onClick={e => e.stopPropagation()}>
                                                                <p className="text-xs text-gray-400">Break-Even</p>
                                                                <p className="text-sm font-bold text-orange-600">₹{calculateAnimalBreakEven(animal, selectedBatch).trueCost.toLocaleString()}</p>
                                                            </div>
                                                            <div className="text-gray-400 group-hover:text-blue-600">
                                                                {expandedAnimalId === animal.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                            </div>
                                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                                <button onClick={() => setSelectedAnimalForWeight(animal.id)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View History">
                                                                    <TrendingUp className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => openAnimalModal(animal)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleDeleteAnimal(animal.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
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

                                                            {/* Individual Medical History (Legacy Disabled) */}
                                                            {false && (selectedBatch.medical || []).some(m => (m.animalIds || []).includes(animal.id)) && (
                                                                <div className="mt-4 pt-4 border-t border-gray-100">
                                                                    <h5 className="font-bold text-gray-700 text-xs uppercase mb-2">Recent Medical Events</h5>
                                                                    <div className="space-y-1">
                                                                        {(selectedBatch.medical || [])
                                                                            .filter(m => (m.animalIds || []).includes(animal.id))
                                                                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                                            .map((m, i) => (
                                                                                <div key={i} className="flex gap-2 text-xs text-gray-600">
                                                                                    <span className="text-gray-400 w-20">{m.date}</span>
                                                                                    <span className={`px-1.5 rounded font-medium ${m.type === 'Vaccination' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{m.type}</span>
                                                                                    <span className="font-medium">{m.name}</span>
                                                                                </div>
                                                                            ))}
                                                                    </div>
                                                                </div>
                                                            )}
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

                        {/* Chicken 'Flock' Section - Simplified View for Large Numbers */}
                        {/* Chicken 'Flock' Dashboard - Simplified View for Large Numbers */}
                        {/* Chicken 'Flock' Dashboard - Enhanced Grid */}
                        {['chicken', 'poultry'].includes(selectedBatch?.type?.toLowerCase()) && (
                            <div className="space-y-8">
                                {/* Dashboard Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Active (Healthy) Card */}
                                    <div className={`bg-white rounded-2xl p-6 border transition-all cursor-pointer ${expandedCard === 'active' ? 'ring-2 ring-green-500 border-green-500 shadow-md' : 'border-gray-100 shadow-sm hover:shadow-md'}`}
                                        onClick={() => setExpandedCard(expandedCard === 'active' ? null : 'active')}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Active</div>
                                                <div className="text-4xl font-bold text-gray-800">{activeAnimals.length}</div>
                                            </div>
                                            <div className="p-2 bg-green-50 rounded-xl text-green-600">
                                                <Check className="w-6 h-6" />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mb-3">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Move to Sick Modal
                                                    setSickTransitionForm({ count: '', fromStatus: 'Healthy', toStatus: 'Sick', notes: '' });
                                                    setIsSickTransitionOpen(true);
                                                }}
                                                className="flex-1 py-2 px-3 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Stethoscope className="w-4 h-4" /> Move to Sick
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Edit Attributes
                                                    const weights = activeAnimals.map(a => Number(a.weight) || 0).filter(w => w > 0);
                                                    const currentAvg = weights.length > 0 ? (weights.reduce((a, b) => a + b, 0) / weights.length) : '';
                                                    setFlockEditForm({
                                                        avgWeight: currentAvg,
                                                        status: 'Healthy',
                                                        notes: '',
                                                        targetGroup: 'Healthy'
                                                    });
                                                    setIsFlockEditOpen(true);
                                                }}
                                                className="flex-1 py-2 px-3 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Edit2 className="w-4 h-4" /> Edit Details
                                            </button>
                                        </div>
                                        <div className="flex justify-center">
                                            {expandedCard === 'active' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                        </div>

                                        {expandedCard === 'active' && (
                                            <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <h5 className="font-bold text-gray-700 text-xs uppercase mb-2">Avg Weight History</h5>
                                                        {(() => {
                                                            // Calculate Avg Weight History for Active Group
                                                            const dateMap = new Map();
                                                            activeAnimals.forEach(a => {
                                                                (a.weightHistory || []).forEach(rec => {
                                                                    if (!dateMap.has(rec.date)) dateMap.set(rec.date, { total: 0, count: 0 });
                                                                    const entry = dateMap.get(rec.date);
                                                                    entry.total += Number(rec.weight);
                                                                    entry.count += 1;
                                                                });
                                                            });
                                                            const history = Array.from(dateMap.entries())
                                                                .map(([date, data]) => ({ date, weight: (data.total / data.count).toFixed(2) }))
                                                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                                .slice(0, 5);

                                                            return history.length > 0 ? (
                                                                <div className="space-y-1">
                                                                    {history.map((h, i) => (
                                                                        <div key={i} className="flex justify-between text-xs text-gray-600 bg-gray-50 p-1 rounded">
                                                                            <span>{h.date}</span>
                                                                            <span className="font-bold">{h.weight} kg</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : <p className="text-xs text-gray-400 italic">No weight records.</p>;
                                                        })()}
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-gray-700 text-xs uppercase mb-2">Recent Medical</h5>
                                                        {(() => {
                                                            // Filter Medical for Active Group (records that touched 'active' animals)
                                                            // Logic: If record.animalIds includes majority of active animals?
                                                            // Or just show latest from 'Active' context
                                                            const recentMedical = (selectedBatch.medical || [])
                                                                .filter(m => (m.animalIds || []).some(id => activeAnimals.some(a => a.id === id)))
                                                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                                .slice(0, 5);

                                                            return recentMedical.length > 0 ? (
                                                                <div className="space-y-1">
                                                                    {recentMedical.map((m, i) => (
                                                                        <div key={i} className="text-xs text-gray-600 bg-gray-50 p-1 rounded">
                                                                            <div className="flex justify-between font-medium">
                                                                                <span>{m.type}</span>
                                                                                <span>{m.date}</span>
                                                                            </div>
                                                                            <div className="truncate text-gray-500">{m.name}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : <p className="text-xs text-gray-400 italic">No medical records.</p>;
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Sick Bay Card */}
                                    <div className={`bg-white rounded-2xl p-6 border transition-all cursor-pointer ${expandedCard === 'sick' ? 'ring-2 ring-red-500 border-red-500 shadow-md' : 'border-red-50 shadow-sm hover:shadow-md'}`}
                                        onClick={() => setExpandedCard(expandedCard === 'sick' ? null : 'sick')}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Sick Bay</div>
                                                <div className="text-4xl font-bold text-red-600">{sickAnimals.length}</div>
                                            </div>
                                            <div className="p-2 bg-red-50 rounded-xl text-red-600">
                                                <Stethoscope className="w-6 h-6" />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mb-3">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Recover Modal
                                                    setSickTransitionForm({ count: '', fromStatus: 'Sick', toStatus: 'Healthy', notes: '' });
                                                    setIsSickTransitionOpen(true);
                                                }}
                                                className="flex-1 py-2 px-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
                                                disabled={sickAnimals.length === 0}
                                            >
                                                <Check className="w-4 h-4" /> Recover
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Treat Sick
                                                    setFlockEditForm({
                                                        avgWeight: '',
                                                        status: 'Sick',
                                                        notes: '',
                                                        targetGroup: 'Sick'
                                                    });
                                                    setIsFlockEditOpen(true);
                                                }}
                                                className="flex-1 py-2 px-3 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                                                disabled={sickAnimals.length === 0}
                                            >
                                                <Syringe className="w-4 h-4" /> Treat/Edit
                                            </button>
                                        </div>
                                        <div className="flex justify-center">
                                            {expandedCard === 'sick' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                        </div>

                                        {expandedCard === 'sick' && (
                                            <div className="mt-4 pt-4 border-t border-red-100 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <h5 className="font-bold text-red-800 text-xs uppercase mb-2">Recent Weights (Avg)</h5>
                                                        {(() => {
                                                            // Calculate Avg Weight History for Sick
                                                            const dateMap = new Map();
                                                            sickAnimals.forEach(a => {
                                                                (a.weightHistory || []).forEach(rec => {
                                                                    if (!dateMap.has(rec.date)) dateMap.set(rec.date, { total: 0, count: 0 });
                                                                    const entry = dateMap.get(rec.date);
                                                                    entry.total += Number(rec.weight);
                                                                    entry.count += 1;
                                                                });
                                                            });
                                                            const history = Array.from(dateMap.entries())
                                                                .map(([date, data]) => ({ date, weight: (data.total / data.count).toFixed(2) }))
                                                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                                .slice(0, 5);

                                                            return history.length > 0 ? (
                                                                <div className="space-y-1">
                                                                    {history.map((h, i) => (
                                                                        <div key={i} className="flex justify-between text-xs text-red-700 bg-red-50 p-1 rounded">
                                                                            <span>{h.date}</span>
                                                                            <span className="font-bold">{h.weight} kg</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : <p className="text-xs text-red-400 italic">No weight records.</p>;
                                                        })()}
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-red-800 text-xs uppercase mb-2">Recent Treatments</h5>
                                                        {(() => {
                                                            // Filter Medical for Sick Group (approx logic: targeted sick animals)
                                                            // Simplified: Show records where at least one current sick animal was involved
                                                            const recentMedical = (selectedBatch.medical || [])
                                                                .filter(m => (m.animalIds || []).some(id => sickAnimals.some(sick => sick.id === id)))
                                                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                                .slice(0, 5);

                                                            return recentMedical.length > 0 ? (
                                                                <div className="space-y-1">
                                                                    {recentMedical.map((m, i) => (
                                                                        <div key={i} className="text-xs text-red-700 bg-red-50 p-1 rounded">
                                                                            <div className="flex justify-between font-medium">
                                                                                <span>{m.type}</span>
                                                                                <span>{m.date}</span>
                                                                            </div>
                                                                            <div className="truncate text-red-500">{m.name}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : <p className="text-xs text-red-400 italic">No medical records.</p>;
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Mortality Card */}
                                    <div className={`bg-white rounded-2xl p-6 border transition-all ${expandedCard === 'mortality' ? 'ring-2 ring-red-500 border-red-500 shadow-md' : 'border-gray-100 shadow-sm hover:shadow-md'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Mortality</div>
                                                <div className="text-4xl font-bold text-gray-800">{deceasedAnimals.length}</div>
                                            </div>
                                            <div className="p-2 bg-gray-100 rounded-xl text-gray-600">
                                                <Trash2 className="w-6 h-6" />
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsBulkDeceasedOpen(true);
                                                }}
                                                className="w-full py-2 px-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Plus className="w-4 h-4" /> Record Death
                                            </button>
                                        </div>
                                        {/* No Expansion for Mortality as per request */}
                                    </div>

                                    {/* Sold Card */}
                                    <div className={`bg-white rounded-2xl p-6 border transition-all cursor-pointer ${expandedCard === 'sold' ? 'ring-2 ring-blue-500 border-blue-500 shadow-md' : 'border-gray-100 shadow-sm hover:shadow-md'}`}
                                        onClick={() => setExpandedCard(expandedCard === 'sold' ? null : 'sold')}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Sold</div>
                                                <div className="text-4xl font-bold text-gray-800">{soldAnimals.length}</div>
                                                <div className="text-xs text-blue-600 mt-1 font-medium">Revenue: ₹{Math.round(soldRevenue).toLocaleString()}</div>
                                            </div>
                                            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                                                <IndianRupee className="w-6 h-6" />
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openSellModal();
                                                }}
                                                className="w-full py-2 px-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Plus className="w-4 h-4" /> Record Sale
                                            </button>
                                        </div>
                                        <div className="flex justify-center">
                                            {expandedCard === 'sold' ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                        </div>

                                        {expandedCard === 'sold' && (
                                            <div className="mt-4 pt-4 border-t border-blue-50 animate-in fade-in slide-in-from-top-1 duration-200" onClick={e => e.stopPropagation()}>
                                                <h5 className="font-bold text-blue-800 text-xs uppercase mb-3 text-center">Recent Sales</h5>
                                                {soldAnimals.length > 0 ? (
                                                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                                                        {soldAnimals.map((animal, i) => (
                                                            <div key={animal.id} className="text-xs text-blue-700 bg-blue-50 p-2 rounded-lg flex justify-between items-center group">
                                                                <div>
                                                                    <div className="font-bold">{animal.id}</div>
                                                                    <div className="text-blue-500 font-medium">₹{(animal.soldPrice || 0).toLocaleString()} • {animal.soldDate || 'Unknown Date'}</div>
                                                                </div>
                                                                {isSuperAdmin && (
                                                                    <button
                                                                        onClick={() => {
                                                                            if (window.confirm(`Undo sale for ${animal.id}? This will move the animal back to Inventory.`)) {
                                                                                revertSoldAnimal(selectedBatch.id, animal.id);
                                                                            }
                                                                        }}
                                                                        className="p-1.5 text-blue-400 hover:text-red-500 hover:bg-white rounded-md transition-all shadow-sm opacity-0 group-hover:opacity-100"
                                                                        title="Undo Sale"
                                                                    >
                                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <p className="text-xs text-blue-400 italic text-center">No animals sold yet.</p>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
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
                                        {activeAnimals.filter(a => a.category !== 'Adult').length} animals
                                    </span>
                                </div>
                                {isKidsOpen && (
                                    <div className="divide-y divide-gray-50">
                                        {activeAnimals.filter(a => a.category !== 'Adult').length > 0 ? (
                                            activeAnimals.filter(a => a.category !== 'Adult').map(animal => (
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
                                                                    <span className={`px-1.5 rounded ${animal.status === 'Healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{animal.status}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            {/* Break-Even Price: before the down arrow */}
                                                            <div className="text-right block" onClick={e => e.stopPropagation()}>
                                                                <p className="text-xs text-gray-400">Break-Even</p>
                                                                <p className="text-sm font-bold text-orange-600">₹{calculateAnimalBreakEven(animal, selectedBatch).trueCost.toLocaleString()}</p>
                                                            </div>
                                                            <div className="text-gray-400 group-hover:text-blue-600">
                                                                {expandedAnimalId === animal.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                            </div>
                                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                                <button onClick={() => setSelectedAnimalForWeight(animal.id)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View History">
                                                                    <TrendingUp className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => openAnimalModal(animal)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleDeleteAnimal(animal.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
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

                                                            {/* Individual Medical History (Legacy Disabled) */}
                                                            {false && (selectedBatch.medical || []).some(m => (m.animalIds || []).includes(animal.id)) && (
                                                                <div className="mt-4 pt-4 border-t border-gray-100">
                                                                    <h5 className="font-bold text-gray-700 text-xs uppercase mb-2">Recent Medical Events</h5>
                                                                    <div className="space-y-1">
                                                                        {(selectedBatch.medical || [])
                                                                            .filter(m => (m.animalIds || []).includes(animal.id))
                                                                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                                            .map((m, i) => (
                                                                                <div key={i} className="flex gap-2 text-xs text-gray-600">
                                                                                    <span className="text-gray-400 w-20">{m.date}</span>
                                                                                    <span className={`px-1.5 rounded font-medium ${m.type === 'Vaccination' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{m.type}</span>
                                                                                    <span className="font-medium">{m.name}</span>
                                                                                </div>
                                                                            ))}
                                                                    </div>
                                                                </div>
                                                            )}
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

                    </div>
                    {/* Right Column: Expenses */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">Batch Expenses</h3>
                            <div className="flex gap-2">
                                {isSuperAdmin && ALLOCATION_ELIGIBLE_TYPES.includes(selectedBatch?.type) && (
                                    <button
                                        onClick={async () => {
                                            // Calculate for all months from batch start to now
                                            const batchStartDate = selectedBatch.startDate || selectedBatch.date || selectedBatch.createdAt;
                                            if (!batchStartDate) {
                                                alert('Batch has no start date!');
                                                return;
                                            }
                                            const months = getMonthsBetween(batchStartDate);
                                            // Use a cache to track allocations across iterations
                                            const allocationsCache = new Map();
                                            for (const monthKey of months) {
                                                await processMonthlyAllocations(monthKey, settings?.allocationMode || 'fullMonth', allocationsCache);
                                            }
                                            alert(`Calculated allocations for ${months.length} month(s): ${months.join(', ')}`);
                                        }}
                                        className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 flex items-center gap-1 font-medium transition-colors"
                                    >
                                        <Users className="w-3 h-3" /> Calculate All Allocations
                                    </button>
                                )}
                                <button onClick={() => setIsExpenseModalOpen(true)} className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 flex items-center gap-1 font-medium transition-colors">
                                    <Plus className="w-3 h-3" /> Add Expense
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            {(selectedBatch.expenses || []).length > 0 ? (selectedBatch.expenses || []).map((exp, i) => (
                                <div key={i} className="p-4 border-b border-gray-100 last:border-0 flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-gray-800">{exp.type}</p>
                                        <p className="text-xs text-gray-500">{exp.description}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-red-500">- ₹{exp.amount}</span>
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
                            <div className="p-4 bg-amber-50 border-t border-amber-100">
                                {(() => {
                                    // Calculate total from stored monthlyAllocations
                                    const storedAllocationsTotal = (selectedBatch.monthlyAllocations || []).reduce((sum, a) => sum + (a.amount || 0), 0);
                                    const displayAllocation = storedAllocationsTotal > 0 ? storedAllocationsTotal : (financials.allocatedExpense || 0);

                                    return (
                                        <>
                                            <div className="flex justify-between items-center mb-2">
                                                <div><p className="font-medium text-amber-800">Allocated (Staff/General)</p><p className="text-xs text-amber-600">Monthly employee cost allocation</p></div>
                                                <span className="font-bold text-amber-700">- ₹ {Math.round(displayAllocation).toLocaleString()}</span>
                                            </div>
                                            {/* Monthly Allocation History */}
                                            {ALLOCATION_ELIGIBLE_TYPES.includes(selectedBatch?.type) && (selectedBatch.monthlyAllocations?.length > 0) && (
                                                <div className="mt-3 pt-3 border-t border-amber-200">
                                                    <p className="text-xs font-bold text-amber-700 uppercase mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Monthly Breakdown</p>
                                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                                        {[...(selectedBatch.monthlyAllocations || [])].sort((a, b) => b.month.localeCompare(a.month)).map(alloc => (
                                                            <div key={alloc.month} className={`flex justify-between items-center py-1 px-2 rounded text-xs ${alloc.month === getCurrentMonthKey() ? 'bg-amber-100 font-medium' : 'bg-white/50'}`}>
                                                                <span className="text-amber-800">
                                                                    {new Date(alloc.month + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                                                    {alloc.month === getCurrentMonthKey() && <span className="ml-1 text-amber-600">(Current)</span>}
                                                                </span>
                                                                <span className="text-amber-700">₹ {alloc.amount?.toLocaleString() || 0}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="p-4 bg-gray-50 flex justify-between items-center border-t border-gray-100">
                                <div><p className="font-medium text-gray-800">Total Expenses</p></div>
                                {(() => {
                                    const storedAllocationsTotal = (selectedBatch.monthlyAllocations || []).reduce((sum, a) => sum + (a.amount || 0), 0);
                                    const displayAllocation = storedAllocationsTotal > 0 ? storedAllocationsTotal : (financials.allocatedExpense || 0);
                                    return <span className="font-bold text-red-600">- ₹ {Math.round((financials.operationalCost || 0) + displayAllocation).toLocaleString()}</span>;
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: WEIGHT */}
            {batchTab === 'weight' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Weight Analysis</h3>
                        <button onClick={() => { setEditingWeightRecord(null); setWeightForm({ weight: '', date: new Date().toISOString().split('T')[0] }); setIsWeightModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all font-medium">
                            <Scale className="w-4 h-4" /> Record Weight
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
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
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 max-h-[400px] overflow-y-auto">
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
                                    activeAnimals.map(animal => (
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
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-gray-800">Sold Animals</h3>
                            <p className="text-gray-500 text-sm">Track financials and details of sold animals in this batch.</p>
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
                        }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-all font-medium">
                            Download PDF
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase">Total Sold</p>
                            <p className="text-2xl font-bold text-gray-800">{soldAnimals.length}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase">Revenue</p>
                            <p className="text-2xl font-bold text-green-600">₹ {soldRevenue.toLocaleString()}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase">Animal Cost <span className="text-[10px] text-gray-400 lowercase">(inc. expenses)</span></p>
                            <p className="text-2xl font-bold text-gray-800">
                                ₹ {soldAnimals.reduce((s, a) => s + calculateAnimalBreakEven(a, selectedBatch).trueCost, 0).toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase">Gross Profit</p>
                            <p className={`text-2xl font-bold ${soldRevenue - soldAnimals.reduce((s, a) => s + calculateAnimalBreakEven(a, selectedBatch).trueCost, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ₹ {(soldRevenue - soldAnimals.reduce((s, a) => s + calculateAnimalBreakEven(a, selectedBatch).trueCost, 0)).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {selectedBatch.type !== 'Poultry' && selectedBatch.type !== 'Chicken' && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                            {soldAnimals.length > 0 ? (
                                soldAnimals.map(animal => (
                                    <div key={animal.id} className="border-b border-gray-50 last:border-0">
                                        <div className={`p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer ${expandedSoldType === animal.id ? 'bg-gray-50' : ''}`} onClick={() => setExpandedSoldType(prev => prev === animal.id ? null : animal.id)}>
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
                                                        <span className="px-1.5 rounded bg-blue-100 text-blue-700">Sold</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-right">
                                                <div className="hidden sm:block">
                                                    <p className="text-xs text-gray-400">Sold For</p>
                                                    <p className="text-sm font-bold text-green-600">₹{(Number(animal.soldPrice) || 0).toLocaleString()}</p>
                                                </div>
                                                <div className="text-gray-400 group-hover:text-blue-600">
                                                    {expandedSoldType === animal.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                </div>
                                            </div>
                                        </div>
                                        {expandedSoldType === animal.id && (
                                            <div className="px-4 pb-4 pl-[4.5rem] bg-gray-50 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 mt-2">
                                                    <div className="bg-white p-3 rounded-lg border border-gray-100">
                                                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Dates</div>
                                                        <table className="w-full text-sm">
                                                            <tbody>
                                                                <tr>
                                                                    <td className="text-gray-500 whitespace-nowrap">Bought:</td>
                                                                    <td className="font-medium text-right">{animal.boughtDate || 'N/A'}</td>
                                                                </tr>
                                                                <tr>
                                                                    <td className="text-gray-500 whitespace-nowrap">Sold:</td>
                                                                    <td className="font-medium text-right">{animal.soldDate || 'N/A'}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    <div className="bg-white p-3 rounded-lg border border-gray-100">
                                                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Performance</div>
                                                        <table className="w-full text-sm">
                                                            <tbody>
                                                                <tr>
                                                                    <td className="text-gray-500 whitespace-nowrap">Bought Price:</td>
                                                                    <td className="font-medium text-right text-gray-800">₹{calculateAnimalBreakEven(animal, selectedBatch).originalPrice.toLocaleString()}</td>
                                                                </tr>
                                                                <tr>
                                                                    <td className="text-gray-500 whitespace-nowrap">Expenses Share:</td>
                                                                    <td className="font-medium text-right text-gray-600">₹{calculateAnimalBreakEven(animal, selectedBatch).expenses.toLocaleString()}</td>
                                                                </tr>
                                                                <tr>
                                                                    <td className="text-gray-500 whitespace-nowrap">Total Cost:</td>
                                                                    <td className="font-medium text-right text-orange-600">₹{calculateAnimalBreakEven(animal, selectedBatch).trueCost.toLocaleString()}</td>
                                                                </tr>
                                                                <tr>
                                                                    <td className="text-gray-500 whitespace-nowrap">Sale Price:</td>
                                                                    <td className="font-medium text-right text-green-600">₹{(Number(animal.soldPrice) || 0).toLocaleString()}</td>
                                                                </tr>
                                                                <tr className="border-t border-gray-50">
                                                                    <td className="text-gray-500 whitespace-nowrap pt-1">Net Profit:</td>
                                                                    <td className={`font-bold text-right pt-1 ${(Number(animal.soldPrice) || 0) - calculateAnimalBreakEven(animal, selectedBatch).trueCost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                        ₹{((Number(animal.soldPrice) || 0) - calculateAnimalBreakEven(animal, selectedBatch).trueCost).toLocaleString()}
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    <div className="bg-white p-3 rounded-lg border border-gray-100 md:col-span-2">
                                                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Weight History</div>
                                                        {animal.weightHistory && animal.weightHistory.length > 0 ? (
                                                            <div className="h-24">
                                                                <ResponsiveContainer width="100%" height="100%">
                                                                    <LineChart data={animal.weightHistory}>
                                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                                        <XAxis dataKey="date" hide />
                                                                        <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
                                                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                                        <Line type="monotone" dataKey="weight" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3, fill: '#3B82F6' }} />
                                                                    </LineChart>
                                                                </ResponsiveContainer>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-400 italic">No weight history recorded.</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Medical Records for this sold animal */}
                                                <div className="bg-white p-3 rounded-lg border border-gray-100 mt-2">
                                                    <div className="text-xs text-gray-500 uppercase font-semibold mb-2">Medical Treatments</div>
                                                    {(selectedBatch.medical || []).filter(m => (m.animalIds || []).includes(animal.id)).length > 0 ? (
                                                        <div className="space-y-2">
                                                            {(selectedBatch.medical || []).filter(m => (m.animalIds || []).includes(animal.id)).map(mr => (
                                                                <div key={mr.id} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                                                                    <div>
                                                                        <span className="font-bold text-gray-700">{mr.type}</span>: {mr.name}
                                                                    </div>
                                                                    <span className="text-gray-500">{mr.date}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-400 italic">No medical treatments recorded.</p>
                                                    )}
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                                                    {canEdit && (
                                                        <button onClick={() => {
                                                            const p = prompt("Enter new sold price (₹):", animal.soldPrice);
                                                            if (p !== null && !isNaN(p)) {
                                                                const newAnimals = (selectedBatch.animals || []).map(a =>
                                                                    a.id === animal.id ? { ...a, soldPrice: Number(p) } : a
                                                                );
                                                                updateBatch(selectedBatch.id, { animals: newAnimals });
                                                            }
                                                        }} className="px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 font-medium rounded-lg text-sm transition-colors flex items-center gap-1">
                                                            <Edit2 className="w-3 h-3" /> Edit Price
                                                        </button>
                                                    )}
                                                    {isSuperAdmin && (
                                                        <button onClick={() => {
                                                            if (window.confirm(`Delete sold record for ${animal.id} completely? This will remove the animal.`)) {
                                                                const newAnimals = (selectedBatch.animals || []).filter(a => a.id !== animal.id);
                                                                updateBatch(selectedBatch.id, { animals: newAnimals });
                                                            }
                                                        }} className="px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 font-medium rounded-lg text-sm transition-colors flex items-center gap-1">
                                                            <Trash2 className="w-3 h-3" /> Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="p-12 text-center text-gray-400">
                                    <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-20" /> {/* Reused icon for now */}
                                    <p>No sold animals found in this batch.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: MEDICAL */}
            {batchTab === 'medical' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-gray-800">Medical History</h3>
                            <p className="text-gray-500 text-sm">Track vaccinations and treatments.</p>
                        </div>
                        <button onClick={() => setIsMedicalModalOpen(true)} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl transition-all font-medium">
                            <Plus className="w-4 h-4" /> Add Record
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left: Table */}
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 max-h-[600px] overflow-y-auto">
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
                                        {activeAnimals.map(animal => (
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
            <Modal isOpen={isAnimalModalOpen} onClose={() => setIsAnimalModalOpen(false)} title={editingAnimalId ? "Edit Animal" : "Add Animals"}>
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20"
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                            <select value={animalForm.gender} onChange={e => setAnimalForm({ ...animalForm, gender: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20">
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                                {selectedBatch?.type === 'Chicken' || selectedBatch?.type === 'Poultry' && <option value="Both">Both / Mixed</option>}
                            </select>
                        </div>
                        {(selectedBatch?.type !== 'Chicken' && selectedBatch?.type !== 'Poultry') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select value={animalForm.category} onChange={e => setAnimalForm({ ...animalForm, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20">
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
                                    <input type="number" min="0" value={animalForm.ageYears} onChange={e => setAnimalForm({ ...animalForm, ageYears: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" placeholder="Yrs" />
                                </div>
                                <div className="flex-1">
                                    <input type="number" min="0" max="11" value={animalForm.ageMonths} onChange={e => setAnimalForm({ ...animalForm, ageMonths: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" placeholder="Mos" />
                                </div>
                                <div className="flex-1">
                                    <input type="number" min="0" max="31" value={animalForm.ageDays} onChange={e => setAnimalForm({ ...animalForm, ageDays: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" placeholder="Days" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                            <input required type="number" step="0.001" value={animalForm.weight} onChange={e => setAnimalForm({ ...animalForm, weight: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" placeholder="e.g. 0.500" />
                            <p className="text-[10px] text-gray-400 mt-1">Enter kg (e.g. 0.1 = 100g)</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date Acquired / Born</label>
                        <input type="date" value={animalForm.date} onChange={e => setAnimalForm({ ...animalForm, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Animal</label>
                        <input required type="number" value={animalForm.cost} onChange={e => setAnimalForm({ ...animalForm, cost: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select value={animalForm.status} onChange={e => setAnimalForm({ ...animalForm, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20">
                            <option value="Healthy">Healthy</option>
                            <option value="Sick">Sick</option>
                            <option value="Deceased">Deceased</option>
                            {animalForm.status === 'Sold' && <option value="Sold">Sold</option>}
                        </select>
                    </div>
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
            <Modal isOpen={isExpenseModalOpen} onClose={() => { setIsExpenseModalOpen(false); setEditingBatchExpense(null); }} title={editingBatchExpense ? "Edit Batch Expense" : "Add Batch Expense"}>
                <form onSubmit={handleExpenseSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type</label>
                        <select value={expenseForm.type} onChange={e => setExpenseForm({ ...expenseForm, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20">
                            <option value="Feed">Feed</option>
                            <option value="Medicine">Medicine</option>
                            <option value="Labor">Labor</option>
                            <option value="Transport">Transport</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input required type="text" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" placeholder="e.g., Veterinary visit" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                        <input required type="number" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input required type="date" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" />
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
            <Modal isOpen={isWeightModalOpen} onClose={() => { setIsWeightModalOpen(false); setEditingWeightRecord(null); }} title={editingWeightRecord ? "Edit Weight Record" : "Record Weight"}>
                <form onSubmit={handleWeightSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Animal</label>
                        <select required value={selectedAnimalForWeight || ''} onChange={e => setSelectedAnimalForWeight(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20">
                            <option value="">Select Target...</option>
                            {selectedBatch && (selectedBatch.type === 'Chicken' || selectedBatch.type === 'Poultry') ? (
                                <>
                                    <option value="Active">Active Flock ({activeAnimals.length} birds)</option>
                                    <option value="Sick">Sick Bay ({sickAnimals.length} birds)</option>
                                </>
                            ) : (
                                activeAnimals.map(a => <option key={a.id} value={a.id}>{a.id} (Curr: {a.weight}kg)</option>)
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">New Weight (kg)</label>
                        <input required type="number" step="0.1" value={weightForm.weight} onChange={e => setWeightForm({ ...weightForm, weight: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input required type="date" value={weightForm.date} onChange={e => setWeightForm({ ...weightForm, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsWeightModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Record'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Sell Modal */}
            <Modal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)} title="Sell Animals">
                <form onSubmit={handleSellSubmit} className="space-y-4">
                    <p className="text-sm text-gray-500 mb-2">Select which animals to sell from this batch.</p>

                    <div className="flex gap-2 mb-4">
                        <button type="button" onClick={() => handleQuickSelect('Kids')} className="flex-1 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-200">
                            Select Kids
                        </button>
                        <button type="button" onClick={() => handleQuickSelect('Adults')} className="flex-1 py-1.5 text-xs font-semibold bg-green-50 text-green-600 rounded-lg hover:bg-green-100 border border-green-200">
                            Select Adults
                        </button>
                        <button type="button" onClick={() => handleQuickSelect('Both')} className="flex-1 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 border border-gray-300">
                            Select All
                        </button>
                    </div>

                    <div className="max-h-[200px] overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-2 bg-gray-50">
                        {activeAnimals.map(a => (
                            <label key={a.id} className="flex items-center gap-3 p-2 bg-white rounded border border-gray-100 cursor-pointer hover:bg-gray-50">
                                <input
                                    type="checkbox"
                                    checked={selectedAnimalsToSell.includes(a.id)}
                                    onChange={() => toggleAnimalSelection(a.id)}
                                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                />
                                <div>
                                    <span className="font-medium text-gray-800">{a.id}</span>
                                    <span className="text-gray-500 text-sm ml-2">({a.gender}, {a.weight}kg, {a.age || 'Unknown Age'})</span>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">Total Sale Price</label>
                            {selectedAnimalsToSell.length > 0 && sellForm.totalPrice && (
                                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">
                                    Avg: ₹ {Math.round(sellForm.totalPrice / selectedAnimalsToSell.length).toLocaleString()} / animal
                                </span>
                            )}
                        </div>
                        <input required type="number" value={sellForm.totalPrice} onChange={e => setSellForm({ ...sellForm, totalPrice: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20" placeholder="Enter total amount for all selected animals" />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => setIsSellModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSaving || Number(sellForm.totalPrice) === 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : `Confirm Sale (${selectedAnimalsToSell.length})`}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Batch Modal */}
            <Modal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} title="Edit Batch">
                <form onSubmit={handleBatchSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
                        <input required type="text" value={batchForm.name} onChange={e => setBatchForm({ ...batchForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 outline-none" placeholder="e.g., Spring 2024 Goats" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Livestock Type</label>
                        <select value={batchForm.type} onChange={e => setBatchForm({ ...batchForm, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 outline-none">
                            <option value="Goat">Goat</option>
                            <option value="Sheep">Sheep</option>
                            <option value="Poultry">Poultry</option>
                            <option value="Chicken">Chicken</option>
                            <option value="Cow">Cow</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input required type="date" value={batchForm.startDate} onChange={e => setBatchForm({ ...batchForm, startDate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500/20 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select value={batchForm.status} onChange={e => setBatchForm({ ...batchForm, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20">
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
            <Modal isOpen={isMedicalModalOpen} onClose={() => setIsMedicalModalOpen(false)} title="Add Medical Record">
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
                                        {activeAnimals.map(animal => (
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
                            {medicalTargetMode === 'All' ? `${activeAnimals.length} Animals Selected` :
                                medicalTargetMode === 'ActiveFlock' ? `${activeAnimals.length} Animals Selected` :
                                    medicalTargetMode === 'SickBay' ? `${sickAnimals.length} Animals Selected` :
                                        `${selectedMedicalAnimals.length} Animals Selected`}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input required type="date" value={medicalForm.date} onChange={e => setMedicalForm({ ...medicalForm, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select value={medicalForm.type} onChange={e => setMedicalForm({ ...medicalForm, type: e.target.value, name: '' })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20">
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20 mb-2"
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
                            <input required type="number" min="0" value={medicalForm.cost} onChange={e => setMedicalForm({ ...medicalForm, cost: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20" />
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
                        <textarea rows="2" value={medicalForm.notes} onChange={e => setMedicalForm({ ...medicalForm, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="Doctor name, dosage, etc." />
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

            {/* Bulk Deceased Modal */}
            <Modal isOpen={isBulkDeceasedOpen} onClose={() => setIsBulkDeceasedOpen(false)} title="Record Flock Mortality">
                <form onSubmit={handleBulkDeceased} className="space-y-4">
                    <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-sm text-red-700">
                        <strong>Note:</strong> This will mark the next N active animals as Deceased.
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Number of Deaths</label>
                        <input
                            required
                            type="number"
                            min="1"
                            value={bulkDeceasedForm.count}
                            onChange={e => setBulkDeceasedForm({ ...bulkDeceasedForm, count: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500/20"
                            placeholder="e.g. 5"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                        <select
                            value={bulkDeceasedForm.reason}
                            onChange={e => setBulkDeceasedForm({ ...bulkDeceasedForm, reason: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500/20"
                        >
                            <option value="Sickness">Sickness</option>
                            <option value="Natural Causes">Natural Causes</option>
                            <option value="Accident">Accident</option>
                            <option value="Predator">Predator</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            value={bulkDeceasedForm.notes}
                            onChange={e => setBulkDeceasedForm({ ...bulkDeceasedForm, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500/20"
                            placeholder="Details..."
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsBulkDeceasedOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                            {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Confirming...</> : 'Confirm Deceased'}
                        </button>
                    </div>
                </form>
            </Modal>

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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sold Date</label>
                            <input
                                required
                                type="date"
                                value={bulkSaleForm.soldDate}
                                onChange={e => setBulkSaleForm({ ...bulkSaleForm, soldDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Avg Cost (₹)</label>
                            <input
                                type="number"
                                min="0"
                                value={flockEditForm.avgCost}
                                onChange={e => setFlockEditForm({ ...flockEditForm, avgCost: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            rows="2"
                            value={flockEditForm.notes}
                            onChange={e => setFlockEditForm({ ...flockEditForm, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20"
                            placeholder="e.g. 5"
                        />
                        <p className="text-xs text-gray-400 mt-1">Next available {sickTransitionForm.fromStatus} animals will be selected automatically.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Reason</label>
                        <textarea
                            value={sickTransitionForm.notes}
                            onChange={e => setSickTransitionForm({ ...sickTransitionForm, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/20"
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

        </div>
    );
};

export default Livestock;

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, ChevronDown, ChevronUp, Sprout, DollarSign, Bell, Clock, Users, TrendingUp, Plus } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { getMonthsBetween, calculateMonthlyAllocations } from '../lib/allocationUtils';
import Modal from '../components/ui/Modal';

// --- Emoji Mappings ---
const VEGETABLE_EMOJIS = {
    'spinach': '🥬', 'palak': '🥬', 'lettuce': '🥬', 'cabbage': '🥬', 'kale': '🥬',
    'methi': '🌿', 'fenugreek': '🌿', 'coriander': '🌿', 'dhania': '🌿', 'mint': '🌿', 'pudina': '🌿',
    'carrot': '🥕', 'gajar': '🥕',
    'potato': '🥔', 'aloo': '🥔',
    'radish': '🫚', 'mooli': '🫚',
    'beetroot': '🫒', 'onion': '🧅', 'pyaz': '🧅', 'garlic': '🧄', 'lahsun': '🧄',
    'ginger': '🫚', 'adrak': '🫚',
    'tomato': '🍅', 'tamatar': '🍅',
    'brinjal': '🍆', 'eggplant': '🍆', 'baingan': '🍆',
    'cucumber': '🥒', 'kheera': '🥒', 'kakdi': '🥒',
    'pepper': '🌶️', 'mirch': '🌶️', 'chilli': '🌶️', 'capsicum': '🫑', 'shimla': '🫑',
    'corn': '🌽', 'makai': '🌽', 'makka': '🌽',
    'pumpkin': '🎃', 'kaddu': '🎃',
    'cauliflower': '🥦', 'gobi': '🥦', 'broccoli': '🥦',
    'peas': '🫛', 'matar': '🫛',
    'beans': '🫘', 'sem': '🫘',
    'okra': '🥒', 'bhindi': '🥒', 'ladyfinger': '🥒',
    'bottle gourd': '🥒', 'lauki': '🥒', 'gourd': '🥒',
    'bitter gourd': '🥒', 'karela': '🥒',
    'ridge gourd': '🥒', 'turai': '🥒',
    'mushroom': '🍄',
    'moringa': '🌿', 'drumstick': '🌿', 'sahjan': '🌿',
    'curry leaves': '🌿', 'kadipatta': '🌿', 'neem': '🌿',
    'tulsi': '🌿', 'basil': '🌿',
    'default': '🥬'
};

const FRUIT_EMOJIS = {
    'apple': '🍎', 'seb': '🍎',
    'banana': '🍌', 'kela': '🍌',
    'orange': '🍊', 'santra': '🍊', 'narangi': '🍊',
    'mango': '🥭', 'aam': '🥭',
    'grape': '🍇', 'angoor': '🍇',
    'watermelon': '🍉', 'tarbooz': '🍉',
    'strawberry': '🍓',
    'pineapple': '🍍', 'ananas': '🍍',
    'coconut': '🥥', 'nariyal': '🥥',
    'lemon': '🍋', 'nimbu': '🍋', 'lime': '🍋',
    'peach': '🍑', 'aadu': '🍑',
    'pear': '🍐', 'nashpati': '🍐',
    'cherry': '🍒',
    'papaya': '__PAPAYA__', 'papita': '__PAPAYA__',
    'guava': '__GUAVA__', 'amrud': '__GUAVA__',
    'pomegranate': '🫐', 'anar': '🫐',
    'fig': '🫐', 'anjeer': '🫐',
    'moringa': '🌿', 'drumstick': '🌿', 'sahjan': '🌿',
    'curry': '🌿', 'neem': '🌿', 'tulsi': '🌿', 'basil': '🌿',
    'default': '🍎'
};

const getEmojiForCrop = (name, type) => {
    const lowerName = (name || '').toLowerCase().trim();
    const emojiMap = type === 'Vegetables' ? VEGETABLE_EMOJIS : FRUIT_EMOJIS;
    if (emojiMap[lowerName]) return emojiMap[lowerName];
    for (const [key, emoji] of Object.entries(emojiMap)) {
        if (lowerName.includes(key) || key.includes(lowerName)) return emoji;
    }
    return emojiMap['default'];
};

const renderCropEmoji = (name, type, sizeClass = 'text-2xl') => {
    const emojiStr = getEmojiForCrop(name, type);
    if (emojiStr === '__GUAVA__') return <img src="/emojis/guava.svg" alt="guava" style={{ width: '1.3em', height: '1.3em', display: 'inline-block', verticalAlign: 'middle' }} />;
    if (emojiStr === '__PAPAYA__') return <img src="/emojis/papaya.svg" alt="papaya" style={{ width: '1.3em', height: '1.3em', display: 'inline-block', verticalAlign: 'middle' }} />;
    return <span className={sizeClass}>{emojiStr}</span>;
};

// --- Helper Components ---

// 1. Operational Expenses Card
const OpExpensesCard = ({ expenses }) => {
    const [isOpen, setIsOpen] = useState(false);
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const currentAmount = expenses[currentMonthKey] || 0;
    const history = Object.entries(expenses).filter(([key]) => key !== currentMonthKey).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 4);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col hover:shadow-md">
            <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <p className="text-sm font-semibold text-gray-600">Op. Expenses</p>
                        <p className="text-xs text-gray-400">This Month</p>
                    </div>
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                        <Activity className="w-5 h-5" />
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900">₹{Math.round(currentAmount).toLocaleString('en-IN')}</h3>
            </div>
            <div className="border-t border-gray-100">
                <button onClick={() => setIsOpen(!isOpen)} className="w-full px-5 py-3 flex items-center justify-between text-xs font-medium text-gray-500 hover:bg-gray-50">
                    <span>Past 4 Months</span>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-5 pb-4 space-y-2">
                                {history.length > 0 ? history.map(([month, amount]) => {
                                    const [y, m] = month.split('-');
                                    const date = new Date(parseInt(y), parseInt(m) - 1);
                                    return (
                                        <div key={month} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">{date.toLocaleString('default', { month: 'short', year: '2-digit' })}</span>
                                            <span className="font-semibold text-gray-700">₹{Math.round(amount).toLocaleString('en-IN')}</span>
                                        </div>
                                    );
                                }) : <p className="text-sm text-gray-400 text-center py-2">No history</p>}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// 2. Livestock Card
const LivestockCard = ({ type, stats }) => {
    const emoji = type === 'Goat' ? '🐐' : type === 'Sheep' ? '🐑' : type === 'Chicken' ? '🐔' : '🐾';

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md">
            <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{emoji}</span>
                        <div>
                            <h4 className="font-bold text-gray-900">All {type === 'Chicken' ? 'Poultry' : `${type}s`}</h4>
                            <p className="text-xs text-gray-500">{stats.activeCount} Active</p>
                        </div>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${stats.deceasedCount > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                        {stats.deceasedCount} Dead ({stats.mortalityRate}%)
                    </span>
                </div>

                <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                        <span className="text-sm text-gray-500">Total Investment</span>
                        <span className="text-xl font-bold text-gray-900">₹{Math.round(stats.totalInvestment).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Bought</p>
                            <p className="text-sm font-bold text-gray-700">₹{Math.round(stats.boughtCost).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
                            <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Expenses</p>
                            <p className="text-sm font-bold text-red-600">₹{Math.round(stats.totalExpenses).toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 2.5 Egg Tracker Card
const EggTrackerCard = ({ eggLogs = [], onAddLog }) => {
    const totalCollected = eggLogs.filter(l => l.type === 'Collected').reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
    const totalHatched = eggLogs.filter(l => l.type === 'Hatched').reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
    const totalSold = eggLogs.filter(l => l.type === 'Sold').reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
    const totalRevenue = eggLogs.filter(l => l.type === 'Sold').reduce((sum, l) => sum + (Number(l.revenue) || 0), 0);

    const inventory = totalCollected - totalHatched - totalSold;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-yellow-200 overflow-hidden hover:shadow-md cursor-pointer transition-all h-full flex flex-col" onClick={onAddLog}>
            <div className="p-5 flex-1 bg-gradient-to-br from-yellow-50 to-white">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🥚</span>
                        <div>
                            <h4 className="font-bold text-yellow-900 leading-tight">Egg Tracker</h4>
                            <p className="text-[10px] text-yellow-600 font-medium">Click to log</p>
                        </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-yellow-100 text-yellow-700 whitespace-nowrap">
                        {inventory > 0 ? `${inventory} in stock` : '0 in stock'}
                    </span>
                </div>

                <div className="space-y-3 mt-auto">
                    <div className="flex justify-between items-end border-b border-yellow-100 pb-2 mb-3">
                        <div className="text-[10px] text-gray-500 uppercase font-bold">Revenue</div>
                        <div className="text-lg font-bold text-green-600 leading-none">₹{totalRevenue.toLocaleString()} <span className="text-[9px] text-gray-400 font-normal uppercase ml-0.5">Profit</span></div>
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-white rounded-lg p-2 text-center border border-yellow-100 shadow-sm">
                            <p className="text-[9px] text-gray-400 uppercase font-semibold mb-1">Collected</p>
                            <p className="text-xs font-bold text-gray-700">{totalCollected}</p>
                        </div>
                        <div className="flex-1 bg-white rounded-lg p-2 text-center border border-yellow-100 shadow-sm">
                            <p className="text-[9px] text-gray-400 uppercase font-semibold mb-1">Hatched</p>
                            <p className="text-xs font-bold text-blue-600">{totalHatched}</p>
                        </div>
                        <div className="flex-1 bg-white rounded-lg p-2 text-center border border-yellow-100 shadow-sm">
                            <p className="text-[9px] text-gray-400 uppercase font-semibold mb-1">Sold</p>
                            <p className="text-xs font-bold text-green-600">{totalSold}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 3. Active Crop Card
const ActiveCropCard = ({ type, item, stats }) => {
    const emoji = renderCropEmoji(item.name, type, 'text-2xl');
    const profit = stats.profit;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md">
            <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                    <span style={{ fontSize: '1.5rem', display: 'inline-flex', alignItems: 'center' }}>{emoji}</span>
                    <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-gray-900 truncate">{item.name}</h4>
                        <p className="text-xs text-gray-400">{item.plantedDate || 'No date'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-[9px] text-gray-400 uppercase font-semibold mb-0.5">Cost</p>
                        <p className="text-xs font-bold text-gray-700">₹{parseInt(stats.totalCost).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-[9px] text-gray-400 uppercase font-semibold mb-0.5">Sales</p>
                        <p className="text-xs font-bold text-green-600">₹{parseInt(stats.revenue).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-[9px] text-gray-400 uppercase font-semibold mb-0.5">P/L</p>
                        <p className={`text-xs font-bold ${profit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {profit >= 0 ? '+' : ''}₹{parseInt(profit).toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 4. Alert Card
const AlertCard = ({ alert }) => {
    const isCritical = alert.severity === 'critical';
    return (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${isCritical ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${isCritical ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                {isCritical ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{alert.type}</h4>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${isCritical ? 'bg-red-200 text-red-700' : 'bg-amber-200 text-amber-700'}`}>
                        {alert.daysRemaining < 0 ? `${Math.abs(alert.daysRemaining)}d Late` : `${alert.daysRemaining}d`}
                    </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{alert.batchName}</p>
            </div>
        </div>
    );
};

// --- Main Dashboard ---

const Dashboard = () => {
    const { data, addEggLog } = useData();
    const { settings } = useSettings();
    const [soldFilter, setSoldFilter] = useState('Month');
    const [isSaving, setIsSaving] = useState(false);

    // Egg Log Modal State
    const [isEggModalOpen, setIsEggModalOpen] = useState(false);
    const [eggLogForm, setEggLogForm] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'Collected',
        quantity: '',
        revenue: '',
        buyer: '',
        notes: ''
    });

    const handleEggLogSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await addEggLog({
                date: eggLogForm.date,
                type: eggLogForm.type,
                quantity: Number(eggLogForm.quantity),
                revenue: eggLogForm.type === 'Sold' ? Number(eggLogForm.revenue) : 0,
                buyer: eggLogForm.type === 'Sold' ? eggLogForm.buyer : '',
                notes: eggLogForm.notes
            });
            setIsEggModalOpen(false);
            setEggLogForm({
                date: new Date().toISOString().split('T')[0],
                type: 'Collected',
                quantity: '',
                revenue: '',
                buyer: '',
                notes: ''
            });
        } catch (error) {
            console.error("Error saving egg log:", error);
            alert("Failed to save egg log");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Unified Expenses (excludes yearly and salaries - those are calculated separately) ---
    const unifiedExpenses = useMemo(() => {
        const all = [...(data.expenses || [])];
        const globalIds = new Set((data.expenses || []).map(e => e.id));

        (data.batches || []).forEach(batch => {
            (batch.expenses || []).forEach(localExp => {
                if (!globalIds.has(localExp.id)) {
                    all.push({
                        ...localExp,
                        batchId: batch.id,
                        amount: Number(localExp.amount) || Number(localExp.cost) || 0,
                        date: localExp.date || batch.date || batch.startDate
                    });
                }
            });
        });
        return all;
    }, [data.expenses, data.batches]);

    // --- Monthly Expenses ---
    const monthlyExpenses = useMemo(() => {
        const history = {};
        unifiedExpenses.forEach(e => {
            if (!e.date) return;
            const monthKey = e.date.substring(0, 7);
            history[monthKey] = (history[monthKey] || 0) + (Number(e.amount) || 0);
        });
        return history;
    }, [unifiedExpenses]);

    // --- Livestock Stats ---
    const getAggregatedLivestock = (types) => {
        // Accept single type or array of types (for Chicken/Poultry)
        const typeArray = Array.isArray(types) ? types : [types];
        const batches = (data.batches || []).filter(b => typeArray.includes(b.type) && b.status !== 'Completed' && b.status !== 'Archived');
        let activeCount = 0, deceasedCount = 0, boughtCost = 0, directExpenses = 0, allocatedExpenses = 0, totalStartCount = 0;

        batches.forEach(batch => {
            const animals = batch.animals || [];
            const activeAnimals = animals.filter(a => a.status !== 'Sold' && a.status !== 'Deceased');
            activeCount += activeAnimals.length;
            deceasedCount += animals.filter(a => a.status === 'Deceased').length;
            totalStartCount += animals.length;
            activeAnimals.forEach(a => { boughtCost += (Number(a.purchasePrice) || Number(a.purchaseCost) || Number(a.cost) || 0); });
            unifiedExpenses.filter(e => e.batchId === batch.id).forEach(e => { directExpenses += (Number(e.amount) || 0); });
        });

        if (batches.length > 0) {
            const dates = batches.map(b => new Date(b.startDate || b.date).getTime()).filter(t => !isNaN(t));
            if (dates.length > 0) {
                const earliest = new Date(Math.min(...dates));
                getMonthsBetween(earliest.toISOString().slice(0, 10)).forEach(monthKey => {
                    calculateMonthlyAllocations(data, monthKey, 'fullMonth').forEach(alloc => {
                        if (batches.find(b => b.id === alloc.batchId)) allocatedExpenses += (Number(alloc.amount) || 0);
                    });
                });
            }
        }

        const totalExpenses = directExpenses + allocatedExpenses;
        const mortalityRate = totalStartCount > 0 ? ((deceasedCount / totalStartCount) * 100).toFixed(1) : 0;
        return { activeCount, deceasedCount, mortalityRate, boughtCost, totalExpenses, totalInvestment: boughtCost + totalExpenses };
    };

    const goatStats = useMemo(() => getAggregatedLivestock('Goat'), [data, unifiedExpenses]);
    const sheepStats = useMemo(() => getAggregatedLivestock('Sheep'), [data, unifiedExpenses]);
    const chickenStats = useMemo(() => getAggregatedLivestock(['Chicken', 'Poultry']), [data, unifiedExpenses]);

    // --- Active Agriculture ---
    const activeAgriculture = useMemo(() => {
        const items = [
            ...(data.crops || []).filter(c => c.status === 'Growing').map(c => ({ id: c.id, name: c.name, plantedDate: c.plantedDate || c.date, seedCost: Number(c.seedCost) || 0, type: 'Vegetables', obj: c })),
            ...(data.fruits || []).filter(f => f.status === 'Growing').map(f => ({ id: f.id, name: f.name, plantedDate: f.plantedDate || f.date, seedCost: Number(f.seedCost) || 0, type: 'Fruits', obj: f })),
        ];

        return items.map(item => {
            let directExpenses = 0;
            let allocatedExpenses = 0;

            // 1. Direct Expenses
            directExpenses = unifiedExpenses
                .filter(e => (item.type === 'Vegetables' ? e.cropId === item.id : e.fruitId === item.id))
                .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

            // 2. Allocated Expenses (Salaries)
            const startDateStr = item.plantedDate;
            if (startDateStr) {
                const months = getMonthsBetween(startDateStr.substring(0, 10)); // YYYY-MM
                months.forEach(monthKey => {
                    const allocs = calculateMonthlyAllocations(data, monthKey, 'fullMonth');
                    const myAlloc = allocs.find(a =>
                        (item.type === 'Vegetables' ? a.targetType === 'Crop' : a.targetType === 'Fruit') &&
                        a.targetId === item.id
                    );
                    if (myAlloc) {
                        allocatedExpenses += (Number(myAlloc.amount) || 0);
                    }
                });
            }

            const revenue = (item.obj.sales || []).reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
            const totalCost = item.seedCost + directExpenses + allocatedExpenses;

            return {
                item,
                stats: {
                    totalCost,
                    revenue,
                    profit: revenue - totalCost,
                    directExpenses,
                    allocatedExpenses
                }
            };
        });
    }, [data.crops, data.fruits, unifiedExpenses, data.employees, data.yearlyExpenses]);

    // --- Date Filter ---
    const isInFilter = (dateStr, filter) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const now = new Date();

        if (filter === 'Month') {
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }
        if (filter === 'Quarter') {
            const threeMonthsAgo = new Date(now);
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            return d >= threeMonthsAgo && d <= now;
        }
        if (filter === 'Half Year') {
            const sixMonthsAgo = new Date(now);
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            return d >= sixMonthsAgo && d <= now;
        }
        if (filter === 'Year') {
            const twelveMonthsAgo = new Date(now);
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
            return d >= twelveMonthsAgo && d <= now;
        }
        if (filter === 'YTD') {
            const jan1 = new Date(now.getFullYear(), 0, 1);
            return d >= jan1 && d <= now;
        }
        return false;
    };

    // --- Sold Stats ---
    const soldStats = useMemo(() => {
        let soldCount = 0, investment = 0, revenue = 0;

        (data.batches || []).forEach(b => {
            (b.animals || []).forEach(a => {
                if (a.status === 'Sold' && isInFilter(a.soldDate, soldFilter)) {
                    soldCount++;
                    investment += (Number(a.purchasePrice) || Number(a.purchaseCost) || 0);
                    revenue += (Number(a.soldPrice) || 0);
                }
            });
        });

        (data.crops || []).forEach(c => { (c.sales || []).forEach(s => { if (isInFilter(s.date, soldFilter)) revenue += (Number(s.amount) || 0); }); });
        (data.fruits || []).forEach(f => { (f.sales || []).forEach(s => { if (isInFilter(s.date, soldFilter)) revenue += (Number(s.amount) || 0); }); });

        return { soldCount, investment, revenue, profit: revenue - investment };
    }, [data, soldFilter]);

    // --- Farm OpEx (DATE-AWARE - respects start dates) ---
    const farmExpenses = useMemo(() => {
        const now = new Date();

        // Calculate period start date based on filter
        let periodStart = new Date(now);
        let periodMonths = 1;

        if (soldFilter === 'Month') {
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
            periodMonths = 1;
        } else if (soldFilter === 'Quarter') {
            periodStart.setMonth(periodStart.getMonth() - 3);
            periodMonths = 3;
        } else if (soldFilter === 'Half Year') {
            periodStart.setMonth(periodStart.getMonth() - 6);
            periodMonths = 6;
        } else if (soldFilter === 'Year') {
            periodStart.setMonth(periodStart.getMonth() - 12);
            periodMonths = 12;
        } else if (soldFilter === 'YTD') {
            periodStart = new Date(now.getFullYear(), 0, 1);
            periodMonths = now.getMonth() + 1;
        }

        // 1. Direct expenses within period
        let directExpenses = 0;
        unifiedExpenses.forEach(e => {
            if (isInFilter(e.date, soldFilter)) {
                directExpenses += (Number(e.amount) || 0);
            }
        });

        // 2. Salaries - only count months employee was active during period
        let salaryTotal = 0;
        (data.employees || []).filter(e => e.status === 'Active').forEach(emp => {
            const salary = Number(emp.salary) || 0;
            if (salary === 0) return;

            const empStart = new Date(emp.employedSince || emp.createdAt || now);

            // Count full months between empStart and now, within the period
            let monthsWorked = 0;
            for (let m = 0; m < periodMonths; m++) {
                const checkMonth = new Date(now);
                checkMonth.setMonth(checkMonth.getMonth() - m);
                const monthStart = new Date(checkMonth.getFullYear(), checkMonth.getMonth(), 1);

                // Employee was working in this month if they started before end of month
                if (empStart <= new Date(checkMonth.getFullYear(), checkMonth.getMonth() + 1, 0)) {
                    // And this month is within our period
                    if (monthStart >= periodStart) {
                        monthsWorked++;
                    }
                }
            }

            salaryTotal += salary * monthsWorked;
        });

        // 3. Yearly expenses - only count months since startDate, within period
        let yearlyTotal = 0;
        (data.yearlyExpenses || []).forEach(exp => {
            const yearlyAmount = Number(exp.amount) || 0;
            if (yearlyAmount === 0) return;

            const monthlyRate = Math.round(yearlyAmount / 12);
            const expStart = new Date(exp.startDate || now);

            // Count months this expense applies, within the period
            let monthsApplied = 0;
            for (let m = 0; m < periodMonths; m++) {
                const checkMonth = new Date(now);
                checkMonth.setMonth(checkMonth.getMonth() - m);
                const monthStart = new Date(checkMonth.getFullYear(), checkMonth.getMonth(), 1);

                // Expense applies to this month if it started before end of month
                if (expStart <= new Date(checkMonth.getFullYear(), checkMonth.getMonth() + 1, 0)) {
                    if (monthStart >= periodStart) {
                        monthsApplied++;
                    }
                }
            }

            yearlyTotal += monthlyRate * monthsApplied;
        });

        const fixedCosts = salaryTotal + yearlyTotal;

        return {
            direct: directExpenses,
            salaries: salaryTotal,
            yearly: yearlyTotal,
            fixed: fixedCosts,
            total: directExpenses + fixedCosts,
            months: periodMonths
        };
    }, [unifiedExpenses, data.employees, data.yearlyExpenses, soldFilter]);

    // Alerts
    const alerts = useMemo(() => {
        const list = [];
        const meds = settings?.scheduledMedications || [];
        const today = new Date();
        (data.batches || []).forEach(batch => {
            if (batch.status === 'Completed' || batch.status === 'Archived') return;
            meds.forEach(med => {
                if (!med.name || med.name === 'New Medication') return;
                const scheduleDays = parseInt(med.schedules?.[batch.type] || 0);
                if (!scheduleDays || scheduleDays <= 0) return;
                const rec = (batch.medical || []).find(m => m.type === 'Scheduled Medication' && m.name === med.name) || (batch.medical || []).find(m => med.name === 'Deworming' && m.type === 'De-worming');
                let dateStr = rec ? rec.date : (batch.startDate || batch.date);
                if (!dateStr) return;
                let next = new Date(dateStr); next.setDate(next.getDate() + scheduleDays);
                const remaining = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
                if (remaining <= (med.notificationDays || 7)) list.push({ id: `${batch.id}_${med.name}`, type: med.name, batchName: batch.name || `Batch ${batch.id}`, daysRemaining: remaining, severity: remaining < 0 ? 'critical' : 'warning', interval: scheduleDays });
            });
        });
        return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
    }, [data.batches, settings]);

    return (
        <div className="pb-20 max-w-[1920px] mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">Operations & Asset Overview</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* LEFT CONTENT */}
                <div className="xl:col-span-3 space-y-8">

                    {/* ROW 1: Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                        <OpExpensesCard expenses={monthlyExpenses} />
                        <LivestockCard type="Goat" stats={goatStats} />
                        <LivestockCard type="Sheep" stats={sheepStats} />
                        <LivestockCard type="Chicken" stats={chickenStats} />
                        <EggTrackerCard eggLogs={data.eggLogs || []} onAddLog={() => setIsEggModalOpen(true)} />
                    </div>

                    {/* ROW 2: Crops */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Sprout className="w-5 h-5 text-green-600" />
                            <h2 className="text-lg font-bold text-gray-900">Active Crops</h2>
                        </div>
                        {activeAgriculture.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {activeAgriculture.map((item, i) => <ActiveCropCard key={i} type={item.item.type} item={item.item} stats={item.stats} />)}
                            </div>
                        ) : (
                            <div className="text-center p-10 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-gray-400">
                                <Sprout className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p>No active crops</p>
                            </div>
                        )}
                    </div>

                    {/* ROW 3: Financials */}
                    <div className="space-y-4 pt-6 border-t border-gray-200">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-blue-600" />
                                <h2 className="text-lg font-bold text-gray-900">Financial Breakdown</h2>
                            </div>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                {['Month', 'Quarter', 'Half Year', 'Year', 'YTD'].map(f => (
                                    <button key={f} onClick={() => setSoldFilter(f)} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${soldFilter === f ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>{f}</button>
                                ))}
                            </div>
                        </div>

                        {/* Sales Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-4">Sales Performance</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Sold Count</p>
                                    <p className="text-2xl font-bold text-gray-900">{soldStats.soldCount}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Revenue</p>
                                    <p className="text-xl font-bold text-green-600">₹{Math.round(soldStats.revenue).toLocaleString('en-IN')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Investment</p>
                                    <p className="text-xl font-bold text-gray-700">₹{Math.round(soldStats.investment).toLocaleString('en-IN')}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Gross Profit</p>
                                    <p className={`text-xl font-bold ${soldStats.profit >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>₹{Math.round(soldStats.profit).toLocaleString('en-IN')}</p>
                                </div>
                            </div>
                        </div>

                        {/* OpEx Card - with detailed breakdown */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-red-600" />
                                    <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide">Total Operational Expenses</h3>
                                </div>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{farmExpenses.months} month{farmExpenses.months > 1 ? 's' : ''}</span>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Direct</p>
                                    <p className="text-lg font-bold text-gray-700">₹{Math.round(farmExpenses.direct).toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] text-gray-400">Feed, Meds etc.</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Salaries</p>
                                    <p className="text-lg font-bold text-gray-700">₹{Math.round(farmExpenses.salaries).toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] text-gray-400">From hire date</p>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4 text-center">
                                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Yearly ÷12</p>
                                    <p className="text-lg font-bold text-gray-700">₹{Math.round(farmExpenses.yearly).toLocaleString('en-IN')}</p>
                                    <p className="text-[10px] text-gray-400">From start date</p>
                                </div>
                                <div className="bg-red-50 rounded-lg p-4 text-center border border-red-100">
                                    <p className="text-xs text-red-500 uppercase font-semibold mb-1">Total</p>
                                    <p className="text-xl font-bold text-red-600">₹{Math.round(farmExpenses.total).toLocaleString('en-IN')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDEBAR */}
                <div className="xl:col-span-1">
                    <div className="sticky top-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-gray-500" />
                                <h2 className="font-bold text-gray-900">Notifications</h2>
                            </div>
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{alerts.length}</span>
                        </div>
                        {alerts.length > 0 ? (
                            <div className="space-y-3 max-h-[75vh] overflow-y-auto">
                                {alerts.map((alert, i) => <AlertCard key={i} alert={alert} />)}
                            </div>
                        ) : (
                            <div className="py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center text-gray-400">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p>All clear!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Egg Log Modal */}
            <Modal isOpen={isEggModalOpen} onClose={() => setIsEggModalOpen(false)} title="Log Egg Activity">
                <form onSubmit={handleEggLogSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                            type="date"
                            required
                            value={eggLogForm.date}
                            onChange={(e) => setEggLogForm({ ...eggLogForm, date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
                        <select
                            value={eggLogForm.type}
                            onChange={(e) => setEggLogForm({ ...eggLogForm, type: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                        >
                            <option value="Collected">Collected</option>
                            <option value="Hatched">Sent to Hatching</option>
                            <option value="Sold">Sold</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (Trays / Pieces)</label>
                        <input
                            type="number"
                            required
                            min="1"
                            value={eggLogForm.quantity}
                            onChange={(e) => setEggLogForm({ ...eggLogForm, quantity: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                            placeholder="e.g. 30"
                        />
                    </div>

                    {eggLogForm.type === 'Sold' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Revenue (₹)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={eggLogForm.revenue}
                                    onChange={(e) => setEggLogForm({ ...eggLogForm, revenue: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                    placeholder="Total amount received"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Buyer (Optional)</label>
                                <input
                                    type="text"
                                    value={eggLogForm.buyer}
                                    onChange={(e) => setEggLogForm({ ...eggLogForm, buyer: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                                    placeholder="e.g. local market"
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                        <textarea
                            value={eggLogForm.notes}
                            onChange={(e) => setEggLogForm({ ...eggLogForm, notes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500"
                            placeholder="Any details..."
                            rows="2"
                        />
                    </div>

                    <div className="flex justify-end pt-4 gap-3">
                        <button type="button" onClick={() => setIsEggModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium flex items-center justify-center min-w-[100px] transition-colors">{isSaving ? 'Saving...' : 'Save Log'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Dashboard;

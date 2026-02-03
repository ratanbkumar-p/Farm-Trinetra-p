import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, ChevronDown, ChevronUp, Sprout, DollarSign, Bell, Clock, Users } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { getMonthsBetween, calculateMonthlyAllocations } from '../lib/allocationUtils';

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
    'papaya': '🍈', 'papita': '🍈',
    'guava': '🍈', 'amrud': '🍈',
    'pomegranate': '🫐', 'anar': '🫐',
    'fig': '🫐', 'anjeer': '🫐',
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

// 3. Active Crop Card
const ActiveCropCard = ({ type, item, stats }) => {
    const emoji = getEmojiForCrop(item.name, type);
    const profit = stats.profit;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md">
            <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{emoji}</span>
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
    const { data } = useData();
    const { settings } = useSettings();
    const [soldFilter, setSoldFilter] = useState('Month');

    // --- Unified Expenses (excludes yearly and salaries - those are calculated separately) ---
    const unifiedExpenses = useMemo(() => {
        const all = [...data.expenses];
        const globalIds = new Set(data.expenses.map(e => e.id));

        data.batches.forEach(batch => {
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
        const batches = data.batches.filter(b => typeArray.includes(b.type) && b.status !== 'Completed' && b.status !== 'Archived');
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
            ...data.crops.filter(c => c.status === 'Growing').map(c => ({ id: c.id, name: c.name, plantedDate: c.plantedDate, seedCost: Number(c.seedCost) || 0, type: 'Vegetables' })),
            ...data.fruits.filter(f => f.status === 'Growing').map(f => ({ id: f.id, name: f.name, plantedDate: f.plantedDate, seedCost: Number(f.seedCost) || 0, type: 'Fruits' })),
        ];
        return items.map(item => {
            const itemExpenses = unifiedExpenses.filter(e => e.cropId === item.id || e.fruitId === item.id).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
            const fullObj = item.type === 'Vegetables' ? data.crops.find(c => c.id === item.id) : data.fruits.find(f => f.id === item.id);
            const revenue = fullObj?.sales?.reduce((sum, s) => sum + (Number(s.amount) || 0), 0) || 0;
            return { item, stats: { totalCost: item.seedCost + itemExpenses, revenue, profit: revenue - (item.seedCost + itemExpenses) } };
        });
    }, [data.crops, data.fruits, unifiedExpenses]);

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

        data.batches.forEach(b => {
            (b.animals || []).forEach(a => {
                if (a.status === 'Sold' && isInFilter(a.soldDate, soldFilter)) {
                    soldCount++;
                    investment += (Number(a.purchasePrice) || Number(a.purchaseCost) || 0);
                    revenue += (Number(a.soldPrice) || 0);
                }
            });
        });

        data.crops.forEach(c => { (c.sales || []).forEach(s => { if (isInFilter(s.date, soldFilter)) revenue += (Number(s.amount) || 0); }); });
        data.fruits.forEach(f => { (f.sales || []).forEach(s => { if (isInFilter(s.date, soldFilter)) revenue += (Number(s.amount) || 0); }); });

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
        data.batches.forEach(batch => {
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
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <OpExpensesCard expenses={monthlyExpenses} />
                        <LivestockCard type="Goat" stats={goatStats} />
                        <LivestockCard type="Sheep" stats={sheepStats} />
                        <LivestockCard type="Chicken" stats={chickenStats} />
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
        </div>
    );
};

export default Dashboard;

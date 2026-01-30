import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, Activity, Bell } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.1,
            duration: 0.5,
            type: "spring"
        }
    })
};

const StatCard = ({ title, value, trend, trendValue, icon: Icon, color, index, children }) => (
    <motion.div
        custom={index}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow h-full"
    >
        <div className="flex items-start justify-between">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <p className="text-gray-500 text-sm font-medium">{title}</p>
                </div>
                <h3 className="text-2xl font-bold mt-1 text-gray-800">{value}</h3>
            </div>
            <div className={cn("p-2 rounded-lg bg-opacity-10", color)}>
                <Icon className={cn("w-6 h-6", color.replace('bg-', 'text-'))} />
            </div>
        </div>
        {trend && (
            <div className="mt-4 flex items-center text-sm">
                {trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                    <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={trend === 'up' ? 'text-green-500' : 'text-red-500'}>
                    {trendValue}
                </span>
                <span className="text-gray-400 ml-2">vs last month</span>
            </div>
        )}
        {children && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                {children}
            </div>
        )}
    </motion.div>
);

const Dashboard = () => {
    const { data } = useData();
    const { settings } = useSettings();
    const [timeRange, setTimeRange] = useState('6M'); // For Chart: '6M' or '1Y'
    const [periodFilter, setPeriodFilter] = useState('month'); // For Totals: 'month', 'quarter', 'year', 'all'
    const [showFinancials, setShowFinancials] = useState(false); // Toggle for chart

    // Helper to check if date falls in filter period
    const isInPeriod = (dateStr) => {
        if (!dateStr) return false;
        if (periodFilter === 'all') return true;

        const date = new Date(dateStr);
        const now = new Date();
        const diffMonths = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());

        if (periodFilter === 'month') return diffMonths === 0;
        if (periodFilter === 'quarter') return diffMonths >= 0 && diffMonths < 3;
        if (periodFilter === 'year') return diffMonths >= 0 && diffMonths < 12;
        return false;
    };

    // Get comprehensive stats by type
    const getStatsByType = () => {
        const types = ['Goat', 'Sheep', 'Chicken', 'Cow'];
        const stats = {};

        types.forEach(type => {
            const typeBatches = data.batches.filter(b => b.type === type);
            let activeCount = 0;
            let soldCount = 0;
            let revenue = 0;
            let expenses = 0;
            let boughtCost = 0; // Investment

            typeBatches.forEach(batch => {
                const animals = batch.animals || [];
                activeCount += animals.filter(a => a.status !== 'Sold' && a.status !== 'Deceased').length;
                soldCount += animals.filter(a => a.status === 'Sold').length;

                // Bought Cost (Investment)
                animals.forEach(a => {
                    // Calculate Investment
                    // If filter is active, check boughtDate. If no boughtDate, using batch start date or created date.
                    const purchaseDate = a.boughtDate || batch.startDate || batch.date;
                    if (isInPeriod(purchaseDate)) {
                        boughtCost += (Number(a.purchaseCost) || Number(a.cost) || Number(a.boughtPrice) || 0);
                    }

                    // Revenue
                    if (a.status === 'Sold' && isInPeriod(a.soldDate)) {
                        revenue += (Number(a.soldPrice) || 0);
                    }
                });
            });

            // Calculate expenses linked to batches of this type
            const batchIds = typeBatches.map(b => b.id);
            data.expenses
                .filter(e => batchIds.includes(e.batchId))
                .forEach(e => {
                    if (isInPeriod(e.date)) {
                        expenses += (Number(e.amount) || 0);
                    }
                });

            stats[type] = {
                active: activeCount,
                sold: soldCount,
                revenue,
                expenses,
                boughtCost,
                profit: revenue - expenses - boughtCost
            };
        });

        // Vegetables
        let vegRevenue = 0;
        let vegExpenses = 0;
        let vegSeedCost = 0;
        data.crops.forEach(crop => {
            if (isInPeriod(crop.plantedDate)) {
                vegSeedCost += (Number(crop.seedCost) || 0);
            }
            (crop.sales || []).forEach(s => {
                if (isInPeriod(s.date)) vegRevenue += (Number(s.amount) || 0);
            });
        });
        data.expenses.filter(e => e.cropId).forEach(e => {
            if (isInPeriod(e.date)) vegExpenses += (Number(e.amount) || 0);
        });

        stats['Vegetables'] = {
            active: data.crops.filter(c => c.status === 'Growing').length,
            sold: data.crops.filter(c => c.status === 'Harvested').length,
            revenue: vegRevenue,
            expenses: vegExpenses,
            boughtCost: vegSeedCost,
            profit: vegRevenue - vegExpenses - vegSeedCost
        };

        // Fruits
        let fruitRevenue = 0;
        let fruitExpenses = 0;
        let fruitSeedCost = 0;
        (data.fruits || []).forEach(fruit => {
            if (isInPeriod(fruit.plantedDate)) {
                fruitSeedCost += (Number(fruit.seedCost) || 0);
            }
            (fruit.sales || []).forEach(s => {
                if (isInPeriod(s.date)) fruitRevenue += (Number(s.amount) || 0);
            });
        });
        data.expenses.filter(e => e.fruitId).forEach(e => {
            if (isInPeriod(e.date)) fruitExpenses += (Number(e.amount) || 0);
        });

        stats['Fruits'] = {
            active: (data.fruits || []).filter(f => f.status === 'Growing').length,
            sold: (data.fruits || []).filter(f => f.status === 'Harvested').length,
            revenue: fruitRevenue,
            expenses: fruitExpenses,
            boughtCost: fruitSeedCost,
            profit: fruitRevenue - fruitExpenses - fruitSeedCost
        };

        return stats;
    };

    const statsByType = getStatsByType();

    // Calculate totals
    const getTotals = () => {
        let totalRevenue = 0;
        let totalExpenses = 0;
        let totalBought = 0; // Investment
        let totalActiveAnimals = 0;

        // Sum up animal stats
        ['Goat', 'Sheep', 'Chicken', 'Cow'].forEach(type => {
            const s = statsByType[type];
            if (s) {
                totalRevenue += s.revenue;
                totalExpenses += s.expenses;
                totalBought += s.boughtCost;
                totalActiveAnimals += s.active;
            }
        });

        // Add crops/fruits
        ['Vegetables', 'Fruits'].forEach(type => {
            const s = statsByType[type];
            if (s) {
                totalRevenue += s.revenue;
                totalExpenses += s.expenses;
                totalBought += s.boughtCost;
            }
        });

        // Add general expenses (not linked)
        data.expenses
            .filter(e => !e.batchId && !e.cropId && !e.fruitId)
            .forEach(e => {
                if (isInPeriod(e.date)) {
                    totalExpenses += (Number(e.amount) || 0);
                }
            });

        // Recurring/Settings-based Expenses (Salaries, Yearly)
        // User requested: "if there is no data just same amount but not some random calculations"
        const monthlySalaries = (data.employees || [])
            .filter(e => e.status === 'Active')
            .reduce((sum, e) => sum + (Number(e.salary) || 0), 0);

        const yearlyMonthly = (data.yearlyExpenses || []).reduce((sum, e) => sum + (Number(e.monthlyAmount) || Math.round(Number(e.amount) / 12) || 0), 0);

        // Simply adding SINGLE MONTH worth of fixed costs to the period view to avoid "hallucinating" big numbers on Year views
        totalExpenses += monthlySalaries;
        totalExpenses += yearlyMonthly;

        return {
            revenue: totalRevenue,
            expenses: totalExpenses,
            bought: totalBought,
            active: totalActiveAnimals,
            profit: totalRevenue - totalExpenses - totalBought, // Net Profit
            yearlyExpensesMonthly: yearlyMonthly
        };
    };

    const totals = getTotals();

    // Chart Data Generation
    const getChartData = () => {
        const monthsToShow = timeRange === '6M' ? 6 : 12;
        const result = [];
        const now = new Date();

        for (let i = monthsToShow - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = d.toLocaleString('default', { month: 'short' });
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

            // Calculate Income (Sales)
            let income = 0;

            // Animal Sales
            data.batches.forEach(b => {
                (b.animals || []).forEach(a => {
                    if (a.status === 'Sold' && a.soldDate && a.soldDate.startsWith(monthKey)) {
                        income += Number(a.soldPrice) || 0;
                    }
                });
            });

            // Crop/Fruit Sales
            data.crops.forEach(c => {
                (c.sales || []).forEach(s => {
                    if (s.date && s.date.startsWith(monthKey)) income += Number(s.amount) || 0;
                });
            });
            data.fruits.forEach(f => {
                (f.sales || []).forEach(s => {
                    if (s.date && s.date.startsWith(monthKey)) income += Number(s.amount) || 0;
                });
            });

            // Calculate Expenses
            let expense = 0;
            // General Expenses
            data.expenses.forEach(e => {
                if (e.date && e.date.startsWith(monthKey)) {
                    expense += Number(e.amount) || 0;
                }
            });

            // Add Monthly portion of Yearlies
            expense += totals.yearlyExpensesMonthly;

            // Add Monthly Salaries
            const monthlySalaries = (data.employees || [])
                .filter(e => e.status === 'Active')
                .reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
            expense += monthlySalaries;

            result.push({
                name: monthName,
                income,
                expense,
                profit: income - expense
            });
        }
        return result;
    };

    const chartData = getChartData();

    // Type breakdown row component
    const TypeRow = ({ name, stats, color, isLivestock }) => (
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100/50 space-y-3">
            <div className="flex items-center justify-between">
                <span className={`font-bold text-lg ${color}`}>{name}</span>
                <span className="text-xs font-semibold bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-md shadow-sm">
                    {stats.active} Active
                </span>
            </div>

            <div className="space-y-2">
                {/* Expenses - Always shown */}
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Expenses</span>
                    <span className="font-medium text-red-600">₹ {Math.round(stats.expenses).toLocaleString()}</span>
                </div>

                {/* Bought Cost - Only for Livestock */}
                {isLivestock && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Bought</span>
                        <span className="font-medium text-gray-800">₹ {Math.round(stats.boughtCost).toLocaleString()}</span>
                    </div>
                )}

                {/* Revenue - Only for Veg/Fruit (and technically Livestock too but user said 'expenses that is it' for livestock? 
                    Actually user said 'include bought price, expenses that is it' for livestock.
                    And 'expenses revenue that is all' for veg/fruits.
                    This implies hiding Revenue for Livestock? That seems odd for a Profit calculation.
                    But I will follow instructions: 'include bought price, expenses that is it'.
                    I will hide Revenue for Livestock if that's what is meant.
                    However, Net Profit calculation depends on Revenue.
                    If I show Net Profit, I should probably show Revenue.
                    Let's assume 'that is it' referred to the *breakdown entries*, but Net Profit is the summary.
                    I'll keep Revenue for Veg/Fruit as explicitly requested.
                    For Livestock, if I hide Revenue, Net Profit appears magic.
                    I'll hide Revenue for Livestock for now to strictly follow 'that is it'.
                */}
                {!isLivestock && (
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Revenue</span>
                        <span className="font-medium text-green-600">₹ {Math.round(stats.revenue).toLocaleString()}</span>
                    </div>
                )}

                <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Net Profit</span>
                    <span className={`font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        ₹ {Math.round(stats.profit).toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );

    // Alerts Logic
    const getAlerts = () => {
        const alerts = [];
        const today = new Date();
        const meds = settings?.scheduledMedications || [];

        // Loop through all batches
        data.batches.forEach(batch => {
            if (batch.status === 'Completed' || batch.status === 'Archived') return;

            // Loop through all configured scheduled medications
            meds.forEach(med => {
                // Skip incomplete configurations
                if (!med.name || med.name === 'New Medication') return;

                const scheduleDays = parseInt(med.schedules?.[batch.type] || 0);
                if (!scheduleDays || scheduleDays <= 0) return; // No schedule for this animal type

                const notificationBuffer = med.notificationDays || 7;

                // Find last occurrence
                const medicalRecords = batch.medical || [];

                // Match either new style or legacy style (if med is Deworming)
                const lastRecord = medicalRecords
                    .filter(m => {
                        if (m.type === 'Scheduled Medication' && m.name === med.name) return true;
                        // Legacy support for existing Deworming records
                        if (med.name === 'Deworming' && m.type === 'De-worming') return true;
                        return false;
                    })
                    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

                // Robust date fallback: lastRecord -> batch.startDate -> batch.date
                let dateStr = lastRecord ? lastRecord.date : (batch.startDate || batch.date);
                if (!dateStr) return; // Skip if no valid date found

                let lastDate = new Date(dateStr);
                if (isNaN(lastDate.getTime())) return;

                const nextDueDate = new Date(lastDate);
                nextDueDate.setDate(nextDueDate.getDate() + scheduleDays);

                const daysRemaining = Math.ceil((nextDueDate - today) / (1000 * 60 * 60 * 24));

                if (daysRemaining <= notificationBuffer) {
                    alerts.push({
                        id: `${batch.id}_${med.name.replace(/\s+/g, '')}`,
                        type: med.name,
                        batchName: batch.name || `Batch ${batch.id}`,
                        batchType: batch.type,
                        daysRemaining,
                        dueDate: nextDueDate.toLocaleDateString(),
                        severity: daysRemaining < 0 ? 'critical' : 'warning',
                        // Debug/Context info
                        interval: scheduleDays,
                        basis: lastRecord ? `Last: ${new Date(lastRecord.date).toLocaleDateString()}` : `Start: ${new Date(batch.startDate || batch.date).toLocaleDateString()}`
                    });
                }
            });
        });

        return alerts;
    };

    const alerts = getAlerts();

    return (
        <div className="space-y-8 pb-10">
            {/* Alerts Section */}
            {alerts.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 space-y-3"
                >
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-red-500" />
                        Important Alerts
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {alerts.map(alert => (
                            <div
                                key={alert.id}
                                className={`p-4 rounded-xl border flex flex-col justify-between ${alert.severity === 'critical' ? 'bg-red-50 border-red-100' : 'bg-yellow-50 border-yellow-100'
                                    }`}
                            >
                                <div className="mb-2">
                                    <h4 className={`font-bold text-sm ${alert.severity === 'critical' ? 'text-red-800' : 'text-yellow-800'}`}>
                                        {alert.type} Due
                                    </h4>
                                    <p className="text-sm font-medium text-gray-700 mt-1">{alert.batchName} ({alert.batchType})</p>
                                    <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                                        <span>Due: {alert.dueDate}</span>
                                        <span>Every {alert.interval}d</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1 italic">
                                        From {alert.basis}
                                    </p>
                                </div>
                                <div className={`self-start px-2 py-1 rounded text-xs font-bold ${alert.severity === 'critical' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                                    }`}>
                                    {alert.daysRemaining < 0 ? `${Math.abs(alert.daysRemaining)} Days Overdue` : `In ${alert.daysRemaining} Days`}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

                {/* Global Period Filter */}
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
                    <button onClick={() => setPeriodFilter('month')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${periodFilter === 'month' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:text-gray-50'}`}>Month</button>
                    <button onClick={() => setPeriodFilter('quarter')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${periodFilter === 'quarter' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}>Quarter</button>
                    <button onClick={() => setPeriodFilter('year')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${periodFilter === 'year' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}>Year</button>
                    <button onClick={() => setPeriodFilter('all')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${periodFilter === 'all' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}>All Time</button>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    index={0}
                    title="Revenue"
                    value={`₹ ${Math.round(totals.revenue).toLocaleString()}`}
                    icon={Wallet}
                    color="bg-green-100 text-green-600"
                />
                <StatCard
                    index={1}
                    title="Operational Expenses"
                    value={`₹ ${Math.round(totals.expenses).toLocaleString()}`}
                    icon={Activity}
                    color="bg-red-100 text-red-600"
                >
                    <p className="text-xs text-gray-400 mt-1">Includes Labor & Feeds</p>
                </StatCard>
                <StatCard
                    index={2}
                    title="Bought (Investment)"
                    value={`₹ ${Math.round(totals.bought).toLocaleString()}`}
                    icon={Wallet}
                    color="bg-orange-100 text-orange-600"
                >
                    <p className="text-xs text-gray-400 mt-1">Animals, Seeds, etc.</p>
                </StatCard>
                <StatCard
                    index={3}
                    title="Net Profit"
                    value={`₹ ${Math.round(totals.profit).toLocaleString()}`}
                    trend={totals.profit >= 0 ? 'up' : 'down'}
                    trendValue={totals.profit >= 0 ? 'Profit' : 'Loss'}
                    icon={TrendingUp}
                    color="bg-purple-100 text-purple-600"
                >
                    <p className="text-xs text-gray-400 mt-1">Rev - (OpEx + Bought)</p>
                </StatCard>
            </div>

            {/* Breakdown Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Operational Breakdown</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <TypeRow name="🐐 Goat" stats={statsByType.Goat} color="text-amber-700" isLivestock={true} />
                    <TypeRow name="🐑 Sheep" stats={statsByType.Sheep} color="text-gray-700" isLivestock={true} />
                    <TypeRow name="🐔 Chicken" stats={statsByType.Chicken} color="text-orange-700" isLivestock={true} />
                    {/* Cow removed as requested */}
                    <TypeRow name="🌱 Vegetables" stats={statsByType.Vegetables} color="text-green-700" isLivestock={false} />
                    <TypeRow name="🍎 Fruits" stats={statsByType.Fruits} color="text-red-600" isLivestock={false} />
                </div>
            </motion.div>

            {/* Financial Performance Chart - Toggleable */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
            >
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={() => setShowFinancials(!showFinancials)}
                        className="flex items-center gap-2 text-lg font-bold text-gray-800 hover:text-green-700 transition-colors"
                    >
                        {showFinancials ? 'Hide' : 'Show'} Financial Performance (Trend)
                        {showFinancials ? <TrendingUp className="w-5 h-5 rotate-180" /> : <TrendingUp className="w-5 h-5" />}
                    </button>

                    {showFinancials && (
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setTimeRange('6M')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeRange === '6M' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                6 Months
                            </button>
                            <button
                                onClick={() => setTimeRange('1Y')}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeRange === '1Y' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                1 Year
                            </button>
                        </div>
                    )}
                </div>

                {showFinancials && (
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2E7D32" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#2E7D32" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    formatter={(value) => [`₹ ${value.toLocaleString()}`, '']}
                                />
                                <Area type="monotone" dataKey="income" stroke="#2E7D32" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" name="Income" />
                                <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" name="Operational Exp" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default Dashboard;

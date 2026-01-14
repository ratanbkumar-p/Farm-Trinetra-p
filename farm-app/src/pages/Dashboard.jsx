import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';
import { useData } from '../context/DataContext';

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

const StatCard = ({ title, value, trend, trendValue, icon: Icon, color, index, children, expandable, expanded, onToggle }) => (
    <motion.div
        custom={index}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
        <div className="flex items-start justify-between">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <p className="text-gray-500 text-sm font-medium">{title}</p>
                    {expandable && (
                        <button onClick={onToggle} className="text-gray-400 hover:text-gray-600">
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    )}
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
        {expanded && children && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                {children}
            </div>
        )}
    </motion.div>
);

const Dashboard = () => {
    const { data } = useData();
    const [breakdownExpanded, setBreakdownExpanded] = useState(false);

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

            typeBatches.forEach(batch => {
                const animals = batch.animals || [];
                activeCount += animals.filter(a => a.status !== 'Sold' && a.status !== 'Deceased').length;
                soldCount += animals.filter(a => a.status === 'Sold').length;
                revenue += animals.filter(a => a.status === 'Sold').reduce((sum, a) => sum + (a.purchaseCost || 0), 0);

                // Batch specific expenses
                expenses += (batch.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
            });

            // Add expenses from global expenses linked to these batches
            const batchIds = typeBatches.map(b => b.id);
            expenses += data.expenses
                .filter(e => batchIds.includes(e.batchId))
                .reduce((sum, e) => sum + (e.amount || 0), 0);

            stats[type] = {
                active: activeCount,
                sold: soldCount,
                revenue,
                expenses,
                profit: revenue - expenses
            };
        });

        // Vegetables (from crops)
        let vegRevenue = 0;
        let vegExpenses = 0;
        data.crops.forEach(crop => {
            vegRevenue += (crop.sales || []).reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        });
        vegExpenses += data.expenses.filter(e => e.cropId).reduce((sum, e) => sum + (e.amount || 0), 0);

        stats['Vegetables'] = {
            active: data.crops.filter(c => c.status === 'Growing').length,
            sold: data.crops.filter(c => c.status === 'Harvested').length,
            revenue: vegRevenue,
            expenses: vegExpenses,
            profit: vegRevenue - vegExpenses
        };

        // Fruits
        let fruitRevenue = 0;
        let fruitExpenses = 0;
        (data.fruits || []).forEach(fruit => {
            fruitRevenue += (fruit.sales || []).reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        });
        fruitExpenses += data.expenses.filter(e => e.fruitId).reduce((sum, e) => sum + (e.amount || 0), 0);

        stats['Fruits'] = {
            active: (data.fruits || []).filter(f => f.status === 'Growing').length,
            sold: (data.fruits || []).filter(f => f.status === 'Harvested').length,
            revenue: fruitRevenue,
            expenses: fruitExpenses,
            profit: fruitRevenue - fruitExpenses
        };

        return stats;
    };

    const statsByType = getStatsByType();

    // Calculate totals
    const getTotals = () => {
        let totalRevenue = 0;
        let totalExpenses = 0;
        let totalActive = 0;

        Object.values(statsByType).forEach(s => {
            totalRevenue += s.revenue;
            totalExpenses += s.expenses;
            totalActive += s.active;
        });

        // Add general expenses (not linked to any batch or crop)
        const generalExpenses = data.expenses
            .filter(e => !e.batchId && !e.cropId && !e.fruitId)
            .reduce((sum, e) => sum + (e.amount || 0), 0);
        totalExpenses += generalExpenses;

        // Add yearly expenses (divided by 12 for monthly)
        const yearlyExpensesMonthly = (data.yearlyExpenses || [])
            .reduce((sum, e) => sum + (e.monthlyAmount || Math.round(e.amount / 12) || 0), 0);
        totalExpenses += yearlyExpensesMonthly;

        const yearlyExpensesTotal = (data.yearlyExpenses || [])
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        return {
            revenue: totalRevenue,
            expenses: totalExpenses,
            active: totalActive,
            profit: totalRevenue - totalExpenses,
            generalExpenses,
            yearlyExpensesMonthly,
            yearlyExpensesTotal
        };
    };

    const totals = getTotals();

    // Mock chart data
    const chartData = [
        { name: 'Jan', income: 4000, expense: 2400 },
        { name: 'Feb', income: 3000, expense: 1398 },
        { name: 'Mar', income: 2000, expense: 9800 },
        { name: 'Apr', income: 2780, expense: 3908 },
        { name: 'May', income: 1890, expense: 4800 },
        { name: 'Jun', income: 2390, expense: 3800 },
    ];

    // Type breakdown row component
    const TypeRow = ({ name, stats, color }) => (
        <div className="p-3 rounded-lg bg-gray-50 space-y-2">
            <div className="flex items-center justify-between">
                <span className={`font-bold ${color}`}>{name}</span>
                <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                    Active: {stats.active} {stats.sold > 0 && `| Sold: ${stats.sold}`}
                </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                    <span className="text-gray-500">Revenue</span>
                    <p className="font-bold text-green-600">₹ {stats.revenue.toLocaleString()}</p>
                </div>
                <div>
                    <span className="text-gray-500">Expenses</span>
                    <p className="font-bold text-red-500">₹ {stats.expenses.toLocaleString()}</p>
                </div>
                <div>
                    <span className="text-gray-500">Profit</span>
                    <p className={`font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ₹ {stats.profit.toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Farm Overview</h1>
                    <p className="text-gray-500 mt-1">Welcome back, here's what's happening at Farm TNF.</p>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    index={0}
                    title="Total Revenue"
                    value={`₹ ${totals.revenue.toLocaleString()}`}
                    icon={Wallet}
                    color="bg-green-100 text-green-600"
                    expandable={true}
                    expanded={breakdownExpanded}
                    onToggle={() => setBreakdownExpanded(!breakdownExpanded)}
                >
                    <div className="text-xs text-gray-400 mb-2">Click to see breakdown by type</div>
                </StatCard>
                <StatCard
                    index={1}
                    title="Total Expenses"
                    value={`₹ ${totals.expenses.toLocaleString()}`}
                    icon={Activity}
                    color="bg-red-100 text-red-600"
                />
                <StatCard
                    index={2}
                    title="Active Animals"
                    value={totals.active.toString()}
                    icon={Activity}
                    color="bg-blue-100 text-blue-600"
                >
                    <div className="mt-3 flex flex-wrap gap-2">
                        {statsByType.Goat.active > 0 && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Goats: {statsByType.Goat.active}</span>
                        )}
                        {statsByType.Sheep.active > 0 && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Sheep: {statsByType.Sheep.active}</span>
                        )}
                        {statsByType.Chicken.active > 0 && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Chicken: {statsByType.Chicken.active}</span>
                        )}
                        {statsByType.Cow.active > 0 && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Cows: {statsByType.Cow.active}</span>
                        )}
                        {statsByType.Vegetables.active > 0 && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Crops: {statsByType.Vegetables.active}</span>
                        )}
                    </div>
                </StatCard>
                <StatCard
                    index={3}
                    title="Net Profit"
                    value={`₹ ${totals.profit.toLocaleString()}`}
                    trend={totals.profit >= 0 ? 'up' : 'down'}
                    trendValue={totals.profit >= 0 ? 'Profit' : 'Loss'}
                    icon={TrendingUp}
                    color="bg-purple-100 text-purple-600"
                />
            </div>

            {/* Breakdown Section (Expanded) */}
            {breakdownExpanded && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Breakdown by Type</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <TypeRow name="🐐 Goat" stats={statsByType.Goat} color="text-amber-700" />
                        <TypeRow name="🐑 Sheep" stats={statsByType.Sheep} color="text-gray-700" />
                        <TypeRow name="🐔 Chicken" stats={statsByType.Chicken} color="text-orange-700" />
                        <TypeRow name="🐄 Cow" stats={statsByType.Cow} color="text-purple-700" />
                        <TypeRow name="🌱 Vegetables" stats={statsByType.Vegetables} color="text-green-700" />
                        <TypeRow name="🍎 Fruits" stats={statsByType.Fruits} color="text-red-600" />
                        {totals.yearlyExpensesMonthly > 0 && (
                            <div className="p-3 rounded-lg bg-blue-50 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-blue-700">📅 Yearly Expenses</span>
                                    <span className="text-xs bg-blue-200 px-2 py-0.5 rounded">Monthly: ₹{totals.yearlyExpensesMonthly.toLocaleString()}</span>
                                </div>
                                <div className="text-xs text-blue-600">
                                    Total Annual: ₹ {totals.yearlyExpensesTotal.toLocaleString()} (divided into 12 months)
                                </div>
                            </div>
                        )}
                        {totals.generalExpenses > 0 && (
                            <div className="p-3 rounded-lg bg-gray-50 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-600">📋 General</span>
                                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">Unlinked expenses</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <span className="text-gray-500">Revenue</span>
                                        <p className="font-bold text-gray-400">-</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Expenses</span>
                                        <p className="font-bold text-red-500">₹ {totals.generalExpenses.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Profit</span>
                                        <p className="font-bold text-red-600">-₹ {totals.generalExpenses.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Charts Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
            >
                <h3 className="text-lg font-bold text-gray-800 mb-6">Financial Performance</h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                formatter={(value) => [`₹ ${value.toLocaleString()}`, '']}
                            />
                            <Area type="monotone" dataKey="income" stroke="#2E7D32" fillOpacity={1} fill="url(#colorIncome)" name="Income" />
                            <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" name="Expense" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>
        </div>
    );
};

export default Dashboard;



import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, Activity } from 'lucide-react';
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

const StatCard = ({ title, value, trend, trendValue, icon: Icon, color, index, children }) => (
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
    const [timeRange, setTimeRange] = useState('6M'); // '6M' or '1Y'

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

                // Revenue comes from SOLD animals
                revenue += animals.filter(a => a.status === 'Sold').reduce((sum, a) => sum + (Number(a.soldPrice) || 0), 0);
            });

            // Calculate expenses linked to batches of this type
            const batchIds = typeBatches.map(b => b.id);
            expenses += data.expenses
                .filter(e => batchIds.includes(e.batchId))
                .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

            // Add bought costs of ALL animals in these batches (active, sold, or deceased) as an expense/investment
            typeBatches.forEach(batch => {
                const animals = batch.animals || [];
                expenses += animals.reduce((sum, a) => sum + (Number(a.purchaseCost) || 0), 0);
            });

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
        vegExpenses += data.expenses.filter(e => e.cropId).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

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
        fruitExpenses += data.expenses.filter(e => e.fruitId).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

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
        let totalActiveAnimals = 0; // Only animals

        // Sum up animal stats
        ['Goat', 'Sheep', 'Chicken', 'Cow'].forEach(type => {
            const s = statsByType[type];
            if (s) {
                totalRevenue += s.revenue;
                totalExpenses += s.expenses;
                totalActiveAnimals += s.active;
            }
        });

        // Add crops/fruits to revenue/expenses but NOT active animals count
        ['Vegetables', 'Fruits'].forEach(type => {
            const s = statsByType[type];
            if (s) {
                totalRevenue += s.revenue;
                totalExpenses += s.expenses;
            }
        });

        // Add general expenses (not linked to any batch or crop)
        const generalExpenses = data.expenses
            .filter(e => !e.batchId && !e.cropId && !e.fruitId)
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        totalExpenses += generalExpenses;

        const yearlyExpensesMonthly = (data.yearlyExpenses || [])
            .reduce((sum, e) => sum + (Number(e.monthlyAmount) || Math.round(Number(e.amount) / 12) || 0), 0);

        const yearlyExpensesTotal = (data.yearlyExpenses || [])
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        // Incorporate full yearly amount into total expenses for "All Time" view/Current projection?
        // Let's stick to adding just the monthly part if we consider "Current Month" view, but this is "Total Overview".
        // Let's just add the yearly total.
        totalExpenses += yearlyExpensesTotal;

        return {
            revenue: totalRevenue,
            expenses: totalExpenses,
            active: totalActiveAnimals,
            profit: totalRevenue - totalExpenses,
            generalExpenses,
            yearlyExpensesMonthly,
            yearlyExpensesTotal
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

            // Animal Purchases (Investment)
            data.batches.forEach(b => {
                (b.animals || []).forEach(a => {
                    if (a.entryDate && a.entryDate.startsWith(monthKey)) {
                        expense += Number(a.purchaseCost) || 0;
                    }
                });
            });

            // Add Monthly portion of Yearlies
            // Assuming they apply every month
            expense += totals.yearlyExpensesMonthly;

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
    const TypeRow = ({ name, stats, color }) => (
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100/50 space-y-3">
            <div className="flex items-center justify-between">
                <span className={`font-bold text-lg ${color}`}>{name}</span>
                <span className="text-xs font-semibold bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-md shadow-sm">
                    {stats.active} Active
                </span>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Bought Cost</span>
                    <span className="font-medium text-gray-900">₹ {Math.round(stats.expenses).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Revenue</span>
                    <span className="font-medium text-green-600">₹ {Math.round(stats.revenue).toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Net Profit</span>
                    <span className={`font-bold ${stats.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        ₹ {Math.round(stats.profit).toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-8 pb-10">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    index={0}
                    title="Total Revenue"
                    value={`₹ ${Math.round(totals.revenue).toLocaleString()}`}
                    icon={Wallet}
                    color="bg-green-100 text-green-600"
                />
                <StatCard
                    index={1}
                    title="Total Expenses"
                    value={`₹ ${Math.round(totals.expenses).toLocaleString()}`}
                    icon={Activity}
                    color="bg-red-100 text-red-600"
                />
                <StatCard
                    index={2}
                    title="Active Animals"
                    value={totals.active.toString()}
                    icon={Activity}
                    color="bg-blue-100 text-blue-600"
                />
                <StatCard
                    index={3}
                    title="Net Profit"
                    value={`₹ ${Math.round(totals.profit).toLocaleString()}`}
                    trend={totals.profit >= 0 ? 'up' : 'down'}
                    trendValue={totals.profit >= 0 ? 'Profit' : 'Loss'}
                    icon={TrendingUp}
                    color="bg-purple-100 text-purple-600"
                />
            </div>

            {/* Financial Performance Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800">Financial Performance</h3>
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
                </div>

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
                            <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" name="Expense" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Breakdown Section - Always Visible */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">Breakdown by Type</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <TypeRow name="🐐 Goat" stats={statsByType.Goat} color="text-amber-700" />
                    <TypeRow name="🐑 Sheep" stats={statsByType.Sheep} color="text-gray-700" />
                    <TypeRow name="🐔 Chicken" stats={statsByType.Chicken} color="text-orange-700" />
                    <TypeRow name="🐄 Cow" stats={statsByType.Cow} color="text-purple-700" />
                    <TypeRow name="🌱 Vegetables" stats={statsByType.Vegetables} color="text-green-700" />
                    <TypeRow name="🍎 Fruits" stats={statsByType.Fruits} color="text-red-600" />

                    {totals.yearlyExpensesMonthly > 0 && (
                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-lg text-blue-700">📅 Yearly</span>
                                <span className="text-xs bg-white text-blue-600 px-2 py-1 rounded border border-blue-200">
                                    Recurring
                                </span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-blue-600">Monthly Avg: <span className="font-bold">₹ {totals.yearlyExpensesMonthly.toLocaleString()}</span></p>
                                <p className="text-xs text-blue-400">Total Annual: ₹ {totals.yearlyExpensesTotal.toLocaleString()}</p>
                            </div>
                        </div>
                    )}

                    {totals.generalExpenses > 0 && (
                        <div className="p-4 rounded-xl bg-gray-100 border border-gray-200 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-lg text-gray-700">📋 General</span>
                                <span className="text-xs bg-white text-gray-600 px-2 py-1 rounded border border-gray-200">
                                    Unallocated
                                </span>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">Expenses</span>
                                    <span className="font-bold text-red-500">₹ {Math.round(totals.generalExpenses).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default Dashboard;

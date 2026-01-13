import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';

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

const StatCard = ({ title, value, trend, trendValue, icon: Icon, color, index }) => (
    <motion.div
        custom={index}
        initial="hidden"
        animate="visible"
        variants={cardVariants}
        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
        <div className="flex items-start justify-between">
            <div>
                <p className="text-gray-500 text-sm font-medium">{title}</p>
                <h3 className="text-2xl font-bold mt-1 text-gray-800">{value}</h3>
            </div>
            <div className={cn("p-2 rounded-lg bg-opacity-10", color)}>
                <Icon className={cn("w-6 h-6", color.replace('bg-', 'text-'))} />
            </div>
        </div>
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
    </motion.div>
);

const data = [
    { name: 'Jan', income: 4000, expense: 2400 },
    { name: 'Feb', income: 3000, expense: 1398 },
    { name: 'Mar', income: 2000, expense: 9800 },
    { name: 'Apr', income: 2780, expense: 3908 },
    { name: 'May', income: 1890, expense: 4800 },
    { name: 'Jun', income: 2390, expense: 3800 },
];

const Dashboard = () => {
    return (
        <div className="space-y-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Farm Overview <span className="text-sm font-normal text-gray-400">v1.1 (Mobile Fix)</span></h1>
                    <p className="text-gray-500 mt-1">Welcome back, here's what's happening at Farm TNF.</p>
                </div>
                <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl shadow-lg shadow-green-200 transition-all font-medium">
                    + New Entry
                </button>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    index={0}
                    title="Total Revenue"
                    value="₹ 1,24,000"
                    trend="up"
                    trendValue="+12.5%"
                    icon={DollarSign}
                    color="bg-green-100 text-green-600"
                />
                <StatCard
                    index={1}
                    title="Total Expenses"
                    value="₹ 45,200"
                    trend="down"
                    trendValue="-2.3%"
                    icon={Activity}
                    color="bg-red-100 text-red-600"
                />
                <StatCard
                    index={2}
                    title="Livestock Count"
                    value="142"
                    trend="up"
                    trendValue="+4"
                    icon={Activity}
                    color="bg-blue-100 text-blue-600"
                />
                <StatCard
                    index={3}
                    title="Net Profit"
                    value="₹ 78,800"
                    trend="up"
                    trendValue="+8.1%"
                    icon={TrendingUp}
                    color="bg-purple-100 text-purple-600"
                />
            </div>

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
                        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                            <YAxis axisLine={false} tickLine={false} prefix="₹" />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Area type="monotone" dataKey="income" stroke="#2E7D32" fillOpacity={1} fill="url(#colorIncome)" />
                            <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>
        </div>
    );
};

export default Dashboard;

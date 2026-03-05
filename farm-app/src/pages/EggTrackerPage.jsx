import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, Egg, Package, Flame, AlertTriangle, IndianRupee, TrendingUp, ChevronDown, Loader2, ArrowLeft } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const LOG_TYPES = [
    { key: 'Collected', label: 'Collected', color: 'yellow', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-yellow-200', icon: Egg },
    { key: 'Hatched', label: 'Hatched', color: 'blue', bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200', icon: Flame },
    { key: 'Spoiled', label: 'Spoiled', color: 'red', bgColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200', icon: AlertTriangle },
    { key: 'Sold', label: 'Sold', color: 'green', bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200', icon: IndianRupee },
];

const FILTER_OPTIONS = [
    { key: '1M', label: 'This Month' },
    { key: '3M', label: '3 Months' },
    { key: '6M', label: '6 Months' },
    { key: '1Y', label: 'Year' },
    { key: 'All', label: 'All Time' },
];

const isInPeriod = (dateStr, period) => {
    if (period === 'All') return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    const months = period === '1M' ? 1 : period === '3M' ? 3 : period === '6M' ? 6 : 12;
    const cutoff = new Date(now);
    if (period === '1M') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    cutoff.setMonth(cutoff.getMonth() - months);
    return d >= cutoff;
};

const typeConfig = (type) => LOG_TYPES.find(t => t.key === type) || LOG_TYPES[0];

const initialForm = () => ({
    date: new Date().toISOString().split('T')[0],
    type: 'Collected',
    quantity: '',
    revenue: '',
    buyer: '',
    notes: '',
});

export default function EggTrackerPage({ onClose }) {
    const { data, addEggLog, deleteEggLog } = useData();
    const { isSuperAdmin, isAdmin } = useAuth();
    const canEdit = isSuperAdmin || isAdmin;

    const eggLogs = data.eggLogs || [];

    const [period, setPeriod] = useState('1M');
    const [showForm, setShowForm] = useState(false);
    const [formType, setFormType] = useState('Collected');
    const [form, setForm] = useState(initialForm());
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    // Filtered logs
    const filteredLogs = useMemo(() =>
        [...eggLogs]
            .filter(l => isInPeriod(l.date, period))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
        , [eggLogs, period]);

    // Stats computed from ALL logs (not filtered) for inventory accuracy
    const allCollected = eggLogs.reduce((s, l) => l.type === 'Collected' ? s + (Number(l.quantity) || 0) : s, 0);
    const allHatched = eggLogs.reduce((s, l) => l.type === 'Hatched' ? s + (Number(l.quantity) || 0) : s, 0);
    const allSpoiled = eggLogs.reduce((s, l) => l.type === 'Spoiled' ? s + (Number(l.quantity) || 0) : s, 0);
    const allSold = eggLogs.reduce((s, l) => l.type === 'Sold' ? s + (Number(l.quantity) || 0) : s, 0);
    const allRevenue = eggLogs.reduce((s, l) => l.type === 'Sold' ? s + (Number(l.revenue) || 0) : s, 0);
    const inStock = Math.max(0, allCollected - allHatched - allSpoiled - allSold);

    // Filtered stats for display period
    const filteredCollected = filteredLogs.filter(l => l.type === 'Collected').reduce((s, l) => s + (Number(l.quantity) || 0), 0);
    const filteredHatched = filteredLogs.filter(l => l.type === 'Hatched').reduce((s, l) => s + (Number(l.quantity) || 0), 0);
    const filteredSpoiled = filteredLogs.filter(l => l.type === 'Spoiled').reduce((s, l) => s + (Number(l.quantity) || 0), 0);
    const filteredSold = filteredLogs.filter(l => l.type === 'Sold').reduce((s, l) => s + (Number(l.quantity) || 0), 0);
    const filteredRevenue = filteredLogs.filter(l => l.type === 'Sold').reduce((s, l) => s + (Number(l.revenue) || 0), 0);

    const openForm = (type) => {
        setFormType(type);
        setForm({ ...initialForm(), type });
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await addEggLog({
                date: form.date,
                type: formType,
                quantity: Number(form.quantity),
                revenue: formType === 'Sold' ? Number(form.revenue) : 0,
                buyer: formType === 'Sold' ? form.buyer : '',
                notes: form.notes,
            });
            setShowForm(false);
            setForm(initialForm());
        } catch (err) {
            console.error(err);
            alert('Failed to save. Try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this log entry?')) return;
        setDeletingId(id);
        try {
            await deleteEggLog(id);
        } catch (err) {
            console.error(err);
        } finally {
            setDeletingId(null);
        }
    };

    const cfg = typeConfig(formType);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 mr-1"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <span className="text-3xl">🥚</span>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 leading-tight">Egg Tracker</h1>
                            <p className="text-xs text-gray-500">Log and manage all egg activity</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Stock badge */}
                        <div className="hidden sm:flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-full px-4 py-1.5">
                            <Package className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm font-bold text-yellow-800">{inStock} in stock</span>
                        </div>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="bg-white rounded-xl border border-yellow-100 p-4 text-center shadow-sm">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Collected</p>
                            <p className="text-2xl font-bold text-yellow-700">{filteredCollected}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">total: {allCollected}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-blue-100 p-4 text-center shadow-sm">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Hatching</p>
                            <p className="text-2xl font-bold text-blue-600">{filteredHatched}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">total: {allHatched}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-red-100 p-4 text-center shadow-sm">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Spoiled</p>
                            <p className="text-2xl font-bold text-red-500">{filteredSpoiled}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">total: {allSpoiled}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-green-100 p-4 text-center shadow-sm">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Sold</p>
                            <p className="text-2xl font-bold text-green-600">{filteredSold}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">total: {allSold}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-green-200 p-4 text-center shadow-sm col-span-1">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Revenue</p>
                            <p className="text-xl font-bold text-green-700">₹{filteredRevenue.toLocaleString('en-IN')}</p>
                            <p className="text-[10px] text-green-500 mt-0.5 font-medium">Pure Profit</p>
                        </div>
                        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 text-center shadow-sm">
                            <p className="text-[10px] text-yellow-700 uppercase font-bold tracking-wider mb-1">In Stock</p>
                            <p className="text-2xl font-bold text-yellow-800">{inStock}</p>
                            <p className="text-[10px] text-yellow-600 mt-0.5">available</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    {canEdit && (
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Log</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {LOG_TYPES.map(lt => {
                                    const Icon = lt.icon;
                                    return (
                                        <button
                                            key={lt.key}
                                            onClick={() => openForm(lt.key)}
                                            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm border-2 transition-all hover:shadow-md active:scale-95 ${lt.bgColor} ${lt.textColor} ${lt.borderColor}`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            + {lt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Log Form */}
                    {showForm && (
                        <div className={`rounded-2xl border-2 p-6 shadow-lg ${cfg.bgColor} ${cfg.borderColor}`}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className={`font-bold text-lg ${cfg.textColor}`}>
                                    Log: {formType}
                                </h3>
                                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-full hover:bg-black/10">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={form.date}
                                            onChange={e => setForm({ ...form, date: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-yellow-500/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Quantity {formType === 'Sold' ? '(Trays/Pieces)' : '(Count)'}
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            value={form.quantity}
                                            onChange={e => setForm({ ...form, quantity: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-yellow-500/20"
                                            placeholder={formType === 'Sold' ? 'e.g. 30 trays' : 'How many?'}
                                        />
                                    </div>
                                </div>

                                {formType === 'Sold' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Revenue (₹)</label>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                value={form.revenue}
                                                onChange={e => setForm({ ...form, revenue: e.target.value })}
                                                className="w-full px-3 py-2 border border-green-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-green-500/20"
                                                placeholder="Total amount received"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Buyer (Optional)</label>
                                            <input
                                                type="text"
                                                value={form.buyer}
                                                onChange={e => setForm({ ...form, buyer: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-yellow-500/20"
                                                placeholder="e.g. local market"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                                    <input
                                        type="text"
                                        value={form.notes}
                                        onChange={e => setForm({ ...form, notes: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-yellow-500/20"
                                        placeholder="Any additional details..."
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="px-4 py-2 text-gray-600 hover:bg-black/10 rounded-lg font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className={`px-6 py-2 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 ${formType === 'Sold' ? 'bg-green-600 hover:bg-green-700' :
                                                formType === 'Hatched' ? 'bg-blue-600 hover:bg-blue-700' :
                                                    formType === 'Spoiled' ? 'bg-red-500 hover:bg-red-600' :
                                                        'bg-yellow-500 hover:bg-yellow-600'
                                            }`}
                                    >
                                        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : `Save ${formType}`}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Period Filter + Log Table */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <h2 className="font-bold text-gray-800">Activity Log</h2>
                            <div className="flex bg-gray-100 p-1 rounded-lg gap-0.5 flex-wrap">
                                {FILTER_OPTIONS.map(f => (
                                    <button
                                        key={f.key}
                                        onClick={() => setPeriod(f.key)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${period === f.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {filteredLogs.length === 0 ? (
                            <div className="p-16 text-center text-gray-400">
                                <span className="text-5xl block mb-4">🥚</span>
                                <p className="font-medium">No egg activity logged for this period.</p>
                                <p className="text-sm mt-1">Use the buttons above to start tracking.</p>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                            <tr>
                                                <th className="px-5 py-3 font-semibold">Date</th>
                                                <th className="px-5 py-3 font-semibold">Type</th>
                                                <th className="px-5 py-3 font-semibold text-right">Quantity</th>
                                                <th className="px-5 py-3 font-semibold text-right">Revenue</th>
                                                <th className="px-5 py-3 font-semibold">Buyer</th>
                                                <th className="px-5 py-3 font-semibold">Notes</th>
                                                {canEdit && <th className="px-5 py-3 font-semibold text-center">Action</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredLogs.map(log => {
                                                const c = typeConfig(log.type);
                                                const Icon = c.icon;
                                                return (
                                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-5 py-4 font-medium text-gray-800 whitespace-nowrap">{log.date}</td>
                                                        <td className="px-5 py-4">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${c.bgColor} ${c.textColor}`}>
                                                                <Icon className="w-3 h-3" />
                                                                {log.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4 text-right font-bold text-gray-800">{Number(log.quantity).toLocaleString()}</td>
                                                        <td className="px-5 py-4 text-right font-bold text-green-600">
                                                            {log.type === 'Sold' ? `₹${Number(log.revenue || 0).toLocaleString('en-IN')}` : '—'}
                                                        </td>
                                                        <td className="px-5 py-4 text-gray-500 text-xs">{log.buyer || '—'}</td>
                                                        <td className="px-5 py-4 text-gray-500 text-xs max-w-[200px] truncate">{log.notes || '—'}</td>
                                                        {canEdit && (
                                                            <td className="px-5 py-4 text-center">
                                                                <button
                                                                    onClick={() => handleDelete(log.id)}
                                                                    disabled={deletingId === log.id}
                                                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                                                    title="Delete"
                                                                >
                                                                    {deletingId === log.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {/* Totals Footer */}
                                        <tfoot className="bg-gray-50 border-t-2 border-gray-100 text-xs font-bold">
                                            <tr>
                                                <td className="px-5 py-3 text-gray-600" colSpan={2}>Period Totals</td>
                                                <td className="px-5 py-3 text-right text-gray-800">
                                                    {filteredLogs.reduce((s, l) => s + (Number(l.quantity) || 0), 0).toLocaleString()}
                                                </td>
                                                <td className="px-5 py-3 text-right text-green-700">
                                                    ₹{filteredRevenue.toLocaleString('en-IN')}
                                                </td>
                                                <td colSpan={canEdit ? 3 : 2}></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="md:hidden divide-y divide-gray-50">
                                    {filteredLogs.map(log => {
                                        const c = typeConfig(log.type);
                                        const Icon = c.icon;
                                        return (
                                            <div key={log.id} className="p-4 flex items-start gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bgColor}`}>
                                                    <Icon className={`w-4 h-4 ${c.textColor}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={`text-xs font-bold ${c.textColor}`}>{log.type}</span>
                                                        <span className="text-xs text-gray-400">{log.date}</span>
                                                    </div>
                                                    <div className="flex items-baseline gap-3 mt-0.5">
                                                        <span className="font-bold text-gray-800">×{Number(log.quantity).toLocaleString()}</span>
                                                        {log.type === 'Sold' && (
                                                            <span className="text-green-600 font-bold text-sm">₹{Number(log.revenue || 0).toLocaleString('en-IN')}</span>
                                                        )}
                                                    </div>
                                                    {(log.buyer || log.notes) && (
                                                        <p className="text-xs text-gray-400 mt-0.5 truncate">{log.buyer || log.notes}</p>
                                                    )}
                                                </div>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => handleDelete(log.id)}
                                                        disabled={deletingId === log.id}
                                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                                                    >
                                                        {deletingId === log.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

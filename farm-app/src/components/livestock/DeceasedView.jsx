import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarX, Pencil, RotateCcw, ArrowRight, Search, TrendingDown, TrendingUp } from 'lucide-react';
import SegmentedTabs from '../ui/SegmentedTabs';
import EmptyState from '../ui/EmptyState';
import DeathGroupModal from './DeathGroupModal';
import AnimatedNumber from '../ui/AnimatedNumber';
import { ANIMAL_EMOJI } from '../../lib/navigation';
import { groupDeaths, inPeriod, formatMonth, parseISODate, reasonEmoji, relativeDay, rupees } from './livestockUtils';

const PERIODS = [
    { id: 'all', label: 'All time' },
    { id: 'month', label: 'This month' },
    { id: '3m', label: '3 months' },
    { id: '6m', label: '6 months' },
    { id: '1y', label: '1 year' }
];

const monthKeyOf = (iso) => (iso ? iso.slice(0, 7) : 'undated');

/**
 * Livestock → Deceased tab. A dated timeline of every loss across all batches,
 * with filters, cause breakdown, and a guided fix for old records missing a date.
 */
const DeceasedView = ({ animals, canEdit, canUndo, onEditRecord, onReviveRecord, onOpenBatch }) => {
    const [period, setPeriod] = useState('all');
    const [type, setType] = useState('All');
    const [search, setSearch] = useState('');
    const [groupKey, setGroupKey] = useState(null);

    const records = useMemo(() => groupDeaths(animals), [animals]);
    const openGroup = records.find(r => r.key === groupKey) || null;
    const missing = records.filter(r => !r.date);
    const types = ['All', ...Array.from(new Set(animals.map(a => (a.batchType === 'Chicken' ? 'Poultry' : a.batchType)))).filter(Boolean)];

    const visible = records.filter(r => {
        if (period === 'missing') return !r.date;
        if (period !== 'all' && !inPeriod(r.date, period)) return false;
        if (type !== 'All' && (r.batchType === 'Chicken' ? 'Poultry' : r.batchType) !== type) return false;
        if (search) {
            const q = search.toLowerCase();
            if (!`${r.batchName} ${r.ids.join(' ')} ${r.reason} ${r.notes}`.toLowerCase().includes(q)) return false;
        }
        return true;
    });

    // KPIs
    const totalAnimals = animals.length;
    const totalLoss = records.reduce((s, r) => s + r.loss, 0);
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    const countIn = (key) => records.filter(r => monthKeyOf(r.date) === key).reduce((s, r) => s + r.count, 0);
    const thisMonth = countIn(thisMonthKey);
    const lastMonth = countIn(prevMonthKey);

    const reasons = useMemo(() => {
        const tally = {};
        visible.forEach(r => { tally[r.reason] = (tally[r.reason] || 0) + r.count; });
        return Object.entries(tally).sort((a, b) => b[1] - a[1]);
    }, [visible]);
    const reasonMax = reasons[0]?.[1] || 1;

    // Group visible records by month for the timeline
    const months = useMemo(() => {
        const map = new Map();
        visible.forEach(r => {
            const key = monthKeyOf(r.date);
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(r);
        });
        return Array.from(map.entries());
    }, [visible]);

    if (totalAnimals === 0) {
        return <EmptyState emoji="🌈" title="No losses recorded" message="Every animal is accounted for. When one dies, open its batch and tap “Record death” so the date and reason are saved here." />;
    }

    return (
        <div className="space-y-6">
            <DeathGroupModal
                record={openGroup}
                onClose={() => setGroupKey(null)}
                canEdit={canEdit}
                canUndo={canUndo}
                onEditRecord={onEditRecord}
                onReviveRecord={onReviveRecord}
            />
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-3xl bg-white p-4 ring-1 ring-gray-200 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Animals lost</p>
                    <p className="mt-1 font-display text-3xl font-semibold text-gray-900"><AnimatedNumber value={totalAnimals} /></p>
                    <p className="text-xs text-gray-400">{records.length} records</p>
                </div>
                <div className="rounded-3xl bg-white p-4 ring-1 ring-red-100 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Value lost</p>
                    <p className="mt-1 font-display text-3xl font-semibold text-red-600"><AnimatedNumber value={totalLoss} prefix="₹" /></p>
                    <p className="text-xs text-gray-400">cost + share of expenses</p>
                </div>
                <div className="rounded-3xl bg-white p-4 ring-1 ring-gray-200 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">This month</p>
                    <p className="mt-1 font-display text-3xl font-semibold text-gray-900"><AnimatedNumber value={thisMonth} /></p>
                    <p className={`text-xs font-semibold flex items-center gap-1 ${thisMonth > lastMonth ? 'text-red-600' : 'text-green-700'}`}>
                        {thisMonth > lastMonth ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {lastMonth} last month
                    </p>
                </div>
                <div className="rounded-3xl bg-white p-4 ring-1 ring-gray-200 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Top cause</p>
                    <p className="mt-1 font-display text-2xl font-semibold text-gray-900 truncate">
                        {reasons[0] ? <>{reasonEmoji(reasons[0][0])} {reasons[0][0]}</> : '—'}
                    </p>
                    <p className="text-xs text-gray-400">{reasons[0] ? `${reasons[0][1]} animals in view` : 'no data'}</p>
                </div>
            </div>

            {/* Missing-date fixer */}
            {missing.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-3xl bg-amber-50 ring-1 ring-amber-200 p-4"
                >
                    <span className="grid place-items-center w-11 h-11 rounded-2xl bg-white text-2xl animate-wiggle">📅</span>
                    <div className="flex-1">
                        <p className="font-bold text-amber-900">{missing.reduce((s, r) => s + r.count, 0)} deaths have no date</p>
                        <p className="text-sm text-amber-800/80">These were saved before dates were tracked, so they don’t show up in monthly reports. Add the dates to fix it.</p>
                    </div>
                    <button
                        onClick={() => setPeriod(period === 'missing' ? 'all' : 'missing')}
                        className="shrink-0 rounded-2xl bg-amber-500 text-white font-bold text-sm px-4 py-2.5 shadow-[0_3px_0_#b45309]"
                    >
                        {period === 'missing' ? 'Show all' : 'Fix dates'}
                    </button>
                </motion.div>
            )}

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                <SegmentedTabs
                    layoutId="deceased-period"
                    value={period}
                    onChange={setPeriod}
                    tabs={[...PERIODS, ...(missing.length ? [{ id: 'missing', label: 'No date', emoji: '📅', count: missing.length }] : [])]}
                />
                <div className="flex gap-2 items-center">
                    <div className="flex gap-1 overflow-x-auto scrollbar-none">
                        {types.map(t => (
                            <button
                                key={t}
                                onClick={() => setType(t)}
                                className={`px-3 py-2 rounded-xl text-sm font-bold whitespace-nowrap ring-1 ${type === t ? 'bg-forest text-white ring-forest' : 'bg-white text-gray-600 ring-gray-200'}`}
                            >
                                {t !== 'All' && <span className="mr-1">{ANIMAL_EMOJI[t] || '🐾'}</span>}{t}
                            </button>
                        ))}
                    </div>
                    <div className="relative hidden sm:block">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="w-40 pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem] gap-6 items-start">
                {/* Timeline */}
                <div className="space-y-6 min-w-0">
                    {months.length === 0 && (
                        <EmptyState compact emoji="🔎" title="Nothing in this view" message="Try a wider date range or another animal type." />
                    )}
                    {months.map(([key, list]) => (
                        <section key={key}>
                            <div className="flex items-baseline justify-between mb-2 px-1">
                                <h3 className="text-lg text-forest font-semibold">{key === 'undated' ? 'Date not recorded' : formatMonth(key)}</h3>
                                <span className="text-xs font-bold text-gray-500">
                                    {list.reduce((s, r) => s + r.count, 0)} lost · {rupees(list.reduce((s, r) => s + r.loss, 0))}
                                </span>
                            </div>
                            <ol className="relative space-y-2 before:absolute before:left-[1.65rem] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                                <AnimatePresence initial={false}>
                                    {list.map((r, i) => {
                                        const d = parseISODate(r.date);
                                        return (
                                            <motion.li
                                                key={r.key}
                                                layout
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.97 }}
                                                transition={{ delay: Math.min(i, 8) * 0.03 }}
                                                className="relative flex gap-3 rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm p-3 pr-2"
                                            >
                                                {/* Date badge */}
                                                {d ? (
                                                    <div className="relative z-10 shrink-0 w-[3.3rem] rounded-xl bg-red-50 ring-1 ring-red-100 text-center py-1">
                                                        <p className="font-display text-xl font-semibold leading-none text-red-600">{d.getDate()}</p>
                                                        <p className="text-[10px] font-bold uppercase text-red-400">{d.toLocaleDateString('en-IN', { month: 'short' })}</p>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => canEdit && onEditRecord(r)}
                                                        className="relative z-10 shrink-0 w-[3.3rem] rounded-xl bg-amber-50 ring-1 ring-amber-300 grid place-items-center py-1.5 text-amber-600"
                                                        title="Add date"
                                                    >
                                                        <CalendarX className="w-5 h-5" />
                                                        <span className="text-[9px] font-bold uppercase">Add</span>
                                                    </button>
                                                )}

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-lg leading-none">{ANIMAL_EMOJI[r.batchType] || '🐾'}</span>
                                                        {r.count > 1 ? (
                                                            <button onClick={() => setGroupKey(r.key)} className="font-bold text-forest underline decoration-dotted underline-offset-4 truncate">
                                                                {r.label} ›
                                                            </button>
                                                        ) : (
                                                            <span className="font-bold text-gray-900 truncate">{r.label}</span>
                                                        )}
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">
                                                            {reasonEmoji(r.reason)} {r.reason}
                                                        </span>
                                                    </div>
                                                    <button onClick={() => onOpenBatch(r.batchId)} className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-forest">
                                                        <span className="w-2 h-2 rounded-full" style={{ background: r.batchColor || '#2ea44f' }} />
                                                        {r.batchName} <ArrowRight className="w-3 h-3" />
                                                    </button>
                                                    {r.count > 1 && (
                                                        <button onClick={() => setGroupKey(r.key)} className="block text-[11px] font-semibold text-gray-400 hover:text-forest truncate">
                                                            See all {r.count} birds →
                                                        </button>
                                                    )}
                                                    {r.notes && <p className="mt-1 text-xs text-gray-500 line-clamp-2">“{r.notes}”</p>}
                                                </div>

                                                <div className="shrink-0 flex flex-col items-end justify-between">
                                                    <div className="text-right">
                                                        <p className="font-bold text-red-600 text-sm">−{rupees(r.loss)}</p>
                                                        <p className="text-[11px] text-gray-400">{r.date ? relativeDay(r.date) : 'no date'}</p>
                                                    </div>
                                                    <div className="flex gap-0.5">
                                                        {canEdit && (
                                                            <button onClick={() => onEditRecord(r)} className="p-2 rounded-lg text-gray-400 hover:text-forest hover:bg-gray-100" title="Edit date / reason" aria-label="Edit date or reason">
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {canUndo && (
                                                            <button onClick={() => onReviveRecord(r)} className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50" title="Undo — entered by mistake" aria-label="Undo death">
                                                                <RotateCcw className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.li>
                                        );
                                    })}
                                </AnimatePresence>
                            </ol>
                        </section>
                    ))}
                </div>

                {/* Causes */}
                <aside className="rounded-3xl bg-white ring-1 ring-gray-200 shadow-sm p-5 lg:sticky lg:top-24">
                    <h3 className="font-semibold text-gray-900">What’s causing losses</h3>
                    <p className="text-xs text-gray-500 mb-4">For the current filter</p>
                    {reasons.length === 0 ? (
                        <p className="text-sm text-gray-400">No data.</p>
                    ) : (
                        <ul className="space-y-3">
                            {reasons.map(([reason, n]) => (
                                <li key={reason}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-semibold text-gray-700">{reasonEmoji(reason)} {reason}</span>
                                        <span className="font-bold text-gray-900">{n}</span>
                                    </div>
                                    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                                        <motion.div
                                            className="h-full rounded-full bg-gradient-to-r from-red-400 to-barn"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(n / reasonMax) * 100}%` }}
                                            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </aside>
            </div>
        </div>
    );
};

export default DeceasedView;

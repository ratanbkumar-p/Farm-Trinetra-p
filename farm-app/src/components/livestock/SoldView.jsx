import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, RotateCcw, Search, TrendingUp, TrendingDown } from 'lucide-react';
import SegmentedTabs from '../ui/SegmentedTabs';
import EmptyState from '../ui/EmptyState';
import AnimatedNumber from '../ui/AnimatedNumber';
import Modal from '../ui/Modal';
import { ANIMAL_EMOJI } from '../../lib/navigation';
import { animalSeq, formatDate, formatMonth, inPeriod, parseISODate, relativeDay, rupees } from './livestockUtils';

const PERIODS = [
    { id: 'all', label: 'All time' },
    { id: 'month', label: 'This month' },
    { id: '3m', label: '3 months' },
    { id: '6m', label: '6 months' },
    { id: '1y', label: '1 year' }
];

const kindOf = (t) => (t === 'Chicken' ? 'Poultry' : t);

/** Sales that happened together (same batch, day and price) become one line */
const groupSales = (animals) => {
    const map = new Map();
    animals.forEach(a => {
        const key = `${a.batchId}|${a.soldDate || ''}|${a.soldPrice}|${a.soldTo || ''}`;
        if (!map.has(key)) map.set(key, { key, batchId: a.batchId, batchName: a.batchName, batchType: a.batchType, batchColor: a.batchColor, date: a.soldDate || '', price: Number(a.soldPrice) || 0, buyer: a.soldTo || '', animals: [] });
        map.get(key).animals.push(a);
    });
    return Array.from(map.values()).map(g => {
        const revenue = g.animals.reduce((s, a) => s + (Number(a.soldPrice) || 0), 0);
        const cost = g.animals.reduce((s, a) => s + (Number(a.trueCost) || 0), 0);
        return { ...g, count: g.animals.length, revenue, cost, profit: revenue - cost };
    }).sort((x, y) => (y.date || '').localeCompare(x.date || ''));
};

const SaleGroupModal = ({ group, onClose, canUndo, onUndo }) => {
    if (!group) return null;
    const animals = [...group.animals].sort((a, b) => animalSeq(a) - animalSeq(b));
    return (
        <Modal isOpen={!!group} onClose={onClose} title={`Sold ${group.count} · ${rupees(group.revenue)}`} subtitle={`${group.batchName} · ${group.date ? formatDate(group.date) : 'no date'}${group.buyer ? ` · to ${group.buyer}` : ''}`} emoji="💰" size="lg">
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl bg-green-50 p-3"><p className="text-[10px] font-bold uppercase text-green-700/70">Revenue</p><p className="font-display text-xl font-semibold text-green-700">{rupees(group.revenue)}</p></div>
                    <div className="rounded-2xl bg-gray-50 p-3"><p className="text-[10px] font-bold uppercase text-gray-400">Batch cost</p><p className="font-display text-xl font-semibold">{rupees(group.cost)}</p></div>
                    <div className={`rounded-2xl p-3 ${group.profit >= 0 ? 'bg-sky-50' : 'bg-red-50'}`}><p className="text-[10px] font-bold uppercase text-gray-500">Profit</p><p className={`font-display text-xl font-semibold ${group.profit >= 0 ? 'text-sky-700' : 'text-red-600'}`}>{group.profit >= 0 ? '+' : '−'}{rupees(Math.abs(group.profit))}</p></div>
                </div>
                <ul className="max-h-[50vh] overflow-y-auto rounded-2xl ring-1 ring-gray-200 divide-y divide-gray-100">
                    {animals.map(a => {
                        const profit = (Number(a.soldPrice) || 0) - (Number(a.trueCost) || 0);
                        const held = a.boughtDate && a.soldDate ? Math.max(0, Math.round((parseISODate(a.soldDate) - parseISODate(a.boughtDate)) / 86400000)) : null;
                        return (
                            <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                                <span className="shrink-0 grid place-items-center min-w-9 h-9 px-1.5 rounded-xl bg-green-50 text-sm font-bold text-green-700">#{String(a.id).split('-').pop()}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[11px] font-semibold text-gray-700 break-all leading-tight">{a.id}</span>
                                    <span className="block text-[11px] text-gray-500">
                                        {[a.gender && a.gender !== 'Both' ? a.gender : null, a.weight ? `${a.weight} kg` : null, held !== null ? `kept ${held} days` : null].filter(Boolean).join(' · ')}
                                    </span>
                                </span>
                                <span className="text-right">
                                    <span className="block text-sm font-bold text-gray-900">{rupees(a.soldPrice)}</span>
                                    <span className={`block text-[11px] font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>{profit >= 0 ? '+' : '−'}{rupees(Math.abs(profit))}</span>
                                </span>
                                {canUndo && (
                                    <button onClick={() => onUndo(a)} className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50" aria-label={`Undo sale of ${a.id}`} title="Undo sale — back to the batch">
                                        <RotateCcw className="w-4 h-4" />
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
                <p className="text-xs text-gray-500">Profit here uses batch costs (animal price + batch expenses). Shared farm costs are shown in each batch and in the Profit Calculator.</p>
            </div>
        </Modal>
    );
};

/**
 * Sales timeline (Livestock → Sold, and inside a batch). Every sale with date,
 * buyer, revenue and profit; grouped sales open into one row per animal.
 */
const SoldView = ({ animals, canUndo, onUndo, onOpenBatch, hideBatch = false }) => {
    const [period, setPeriod] = useState('all');
    const [type, setType] = useState('All');
    const [search, setSearch] = useState('');
    const [openKey, setOpenKey] = useState(null);

    const groups = useMemo(() => groupSales(animals), [animals]);
    const openGroup = groups.find(g => g.key === openKey) || null;
    const types = ['All', ...Array.from(new Set(animals.map(a => kindOf(a.batchType)))).filter(Boolean)];

    const visible = groups.filter(g => {
        if (period !== 'all' && !inPeriod(g.date, period)) return false;
        if (type !== 'All' && kindOf(g.batchType) !== type) return false;
        if (search && !`${g.batchName} ${g.buyer} ${g.animals.map(a => a.id).join(' ')}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });
    const sum = (list, k) => list.reduce((s, g) => s + g[k], 0);
    const totals = { count: sum(visible, 'count'), revenue: sum(visible, 'revenue'), cost: sum(visible, 'cost'), profit: sum(visible, 'profit') };

    const byBatch = useMemo(() => {
        const m = new Map();
        visible.forEach(g => {
            const e = m.get(g.batchId) || { name: g.batchName, type: g.batchType, profit: 0, revenue: 0, count: 0 };
            e.profit += g.profit; e.revenue += g.revenue; e.count += g.count;
            m.set(g.batchId, e);
        });
        return Array.from(m.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
    }, [visible]);
    const maxRevenue = Math.max(1, ...byBatch.map(([, e]) => e.revenue));

    const months = useMemo(() => {
        const m = new Map();
        visible.forEach(g => {
            const k = g.date ? g.date.slice(0, 7) : 'undated';
            if (!m.has(k)) m.set(k, []);
            m.get(k).push(g);
        });
        return Array.from(m.entries());
    }, [visible]);

    if (animals.length === 0) {
        return <EmptyState emoji="💰" title="No sales yet" message="Tap the 💰 Sell button to record a sale — it shows up here with profit after costs." />;
    }

    return (
        <div className="space-y-6">
            <SaleGroupModal group={openGroup} onClose={() => setOpenKey(null)} canUndo={canUndo} onUndo={onUndo} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    ['Sold', totals.count, '', 'text-gray-900', '🐾', 'animals & birds'],
                    ['Revenue', totals.revenue, '₹', 'text-green-700', '💰', 'money received'],
                    ['Batch cost', totals.cost, '₹', 'text-gray-700', '🧾', 'animal + batch expenses'],
                    ['Profit', totals.profit, '₹', totals.profit >= 0 ? 'text-sky-700' : 'text-red-600', totals.profit >= 0 ? '📈' : '📉', 'before shared costs']
                ].map(([label, value, prefix, tone, emoji, hint]) => (
                    <div key={label} className="rounded-3xl bg-white ring-1 ring-gray-200 shadow-sm p-4">
                        <div className="flex justify-between"><p className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</p><span>{emoji}</span></div>
                        <p className={`mt-1 font-display text-2xl sm:text-3xl font-semibold ${tone}`}>{value < 0 ? '−' : ''}<AnimatedNumber value={Math.abs(Math.round(value))} prefix={prefix} /></p>
                        <p className="text-xs text-gray-400">{hint}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                <SegmentedTabs layoutId={hideBatch ? 'batch-sold-period' : 'sold-period'} value={period} onChange={setPeriod} tabs={PERIODS} />
                <div className="flex gap-2 items-center">
                    {!hideBatch && types.length > 2 && (
                        <div className="flex gap-1 overflow-x-auto scrollbar-none">
                            {types.map(t => (
                                <button key={t} onClick={() => setType(t)} className={`px-3 py-2 rounded-xl text-sm font-bold whitespace-nowrap ring-1 ${type === t ? 'bg-forest text-white ring-forest' : 'bg-white text-gray-600 ring-gray-200'}`}>
                                    {t !== 'All' && <span className="mr-1">{ANIMAL_EMOJI[t] || '🐾'}</span>}{t}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="relative hidden sm:block">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Batch, buyer, ID…" className="w-44 pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm" />
                    </div>
                </div>
            </div>

            <div className={`grid grid-cols-1 ${hideBatch ? '' : 'lg:grid-cols-[minmax(0,1fr)_18rem]'} gap-6 items-start`}>
                <div className="space-y-6 min-w-0">
                    {months.length === 0 && <EmptyState compact emoji="🔎" title="No sales in this view" message="Try a wider date range." />}
                    {months.map(([key, list]) => (
                        <section key={key}>
                            <div className="flex items-baseline justify-between mb-2 px-1">
                                <h3 className="text-lg text-forest font-semibold">{key === 'undated' ? 'Date not recorded' : formatMonth(key)}</h3>
                                <span className="text-xs font-bold text-gray-500">{sum(list, 'count')} sold · {rupees(sum(list, 'revenue'))}</span>
                            </div>
                            <ol className="space-y-2">
                                <AnimatePresence initial={false}>
                                    {list.map((g, i) => {
                                        const d = parseISODate(g.date);
                                        const multi = g.count > 1;
                                        return (
                                            <motion.li
                                                key={g.key}
                                                layout
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ delay: Math.min(i, 8) * 0.03 }}
                                            >
                                                <button
                                                    onClick={() => setOpenKey(g.key)}
                                                    className="w-full flex gap-3 rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm hover:shadow-md hover:ring-green-200 p-3 text-left"
                                                >
                                                    <div className="shrink-0 w-[3.3rem] rounded-xl bg-green-50 ring-1 ring-green-100 text-center py-1">
                                                        <p className="font-display text-xl font-semibold leading-none text-green-700">{d ? d.getDate() : '?'}</p>
                                                        <p className="text-[10px] font-bold uppercase text-green-600/70">{d ? d.toLocaleDateString('en-IN', { month: 'short' }) : 'date'}</p>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="flex items-center gap-1.5 font-bold text-gray-900 truncate">
                                                            <span className="text-lg leading-none">{ANIMAL_EMOJI[g.batchType] || '🐾'}</span>
                                                            {multi ? `${g.count} ${kindOf(g.batchType) === 'Poultry' ? 'birds' : 'animals'}` : g.animals[0].id}
                                                            <span className="font-medium text-gray-500 text-sm">· {rupees(g.price)}{multi ? ' each' : ''}</span>
                                                        </p>
                                                        <p className="text-xs text-gray-500 truncate">
                                                            {!hideBatch && <><span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: g.batchColor || '#2ea44f' }} />{g.batchName} · </>}
                                                            {g.buyer ? `to ${g.buyer} · ` : ''}{g.date ? relativeDay(g.date) : 'no date'}
                                                        </p>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <p className="font-bold text-green-700">+{rupees(g.revenue)}</p>
                                                        <p className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${g.profit >= 0 ? 'text-sky-700' : 'text-red-600'}`}>
                                                            {g.profit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                            {g.profit >= 0 ? '+' : '−'}{rupees(Math.abs(g.profit))}
                                                        </p>
                                                    </div>
                                                </button>
                                            </motion.li>
                                        );
                                    })}
                                </AnimatePresence>
                            </ol>
                        </section>
                    ))}
                </div>

                {!hideBatch && (
                    <aside className="rounded-3xl bg-white ring-1 ring-gray-200 shadow-sm p-5 lg:sticky lg:top-24">
                        <h3 className="font-semibold text-gray-900">Sales by batch</h3>
                        <p className="text-xs text-gray-500 mb-4">For the current filter</p>
                        <ul className="space-y-3">
                            {byBatch.map(([id, e]) => (
                                <li key={id}>
                                    <button onClick={() => onOpenBatch?.(id)} className="w-full text-left group">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-semibold text-gray-700 truncate">{ANIMAL_EMOJI[e.type] || '🐾'} {e.name}</span>
                                            <span className="font-bold text-gray-900">{rupees(e.revenue)}</span>
                                        </div>
                                        <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                                            <motion.div className="h-full rounded-full bg-gradient-to-r from-green-400 to-meadow" initial={{ width: 0 }} animate={{ width: `${(e.revenue / maxRevenue) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-gray-500 flex items-center gap-1">{e.count} sold · profit <span className={e.profit >= 0 ? 'text-sky-700 font-bold' : 'text-red-600 font-bold'}>{e.profit >= 0 ? '+' : '−'}{rupees(Math.abs(e.profit))}</span> <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100" /></p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </aside>
                )}
            </div>
        </div>
    );
};

export default SoldView;

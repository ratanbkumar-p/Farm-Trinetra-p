import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IndianRupee, Search, CalendarDays, Scale } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';
import { useCosting } from '../lib/costing';
import { ANIMAL_EMOJI } from '../lib/navigation';
import { isAlive, isPoultryType, animalSeq, todayISO, formatDate, rupees, parseISODate } from '../components/livestock/livestockUtils';

const isAdult = (a) => a.category === 'Adult' || a.category === 'Parent';
const daysBetween = (fromISO, toISO) => {
    const a = parseISODate(fromISO);
    const b = parseISODate(toISO);
    return a && b ? Math.max(0, Math.round((b - a) / 86400000)) : null;
};

const Card = ({ title, emoji, children, className = '' }) => (
    <section className={`rounded-3xl bg-white ring-1 ring-gray-200 shadow-sm p-4 sm:p-5 ${className}`}>
        {title && <h3 className="flex items-center gap-2 font-semibold text-gray-900 text-lg mb-3"><span>{emoji}</span>{title}</h3>}
        {children}
    </section>
);

/**
 * Profit Calculator: choose a batch + the animals you plan to sell and see
 * what they really cost (batch costs vs shared farm costs) and what to ask for them.
 */
const ProfitCalculator = () => {
    const { data } = useData();
    const { openSell } = useUI();
    const costing = useCosting();
    const location = useLocation();

    const batches = useMemo(() => (data.batches || []).filter(b => (b.animals || []).some(isAlive)), [data.batches]);
    const [batchId, setBatchId] = useState(location.state?.batchId || null);
    const [selected, setSelected] = useState([]);
    const [count, setCount] = useState('');
    const [search, setSearch] = useState('');
    const [sellDate, setSellDate] = useState(todayISO());
    const [priceMode, setPriceMode] = useState('total'); // 'total' | 'perKg'
    const [priceInput, setPriceInput] = useState('');

    const batch = batches.find(b => b.id === batchId) || null;
    const flock = isPoultryType(batch?.type);
    const living = useMemo(() => (batch?.animals || []).filter(isAlive)
        .sort((a, b) => (a.status === 'Sick') - (b.status === 'Sick') || animalSeq(a) - animalSeq(b)), [batch]);

    // Default: everything alive in the chosen batch
    useEffect(() => {
        if (!batch && batches.length > 0 && !batchId) setBatchId(batches[0].id);
    }, [batch, batches, batchId]);
    useEffect(() => {
        setSelected(living.map(a => a.id));
        setCount(String(living.length));
        setPriceInput('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batchId]);

    const chosen = living.filter(a => selected.includes(a.id));
    const n = chosen.length;
    const totals = chosen.reduce((acc, a) => {
        const c = costing.costOf(a, batch);
        acc.purchase += c.purchase;
        acc.batchShare += c.batchShare;
        acc.base += c.base;
        acc.sharedShare += c.sharedShare;
        acc.full += c.full;
        acc.weight += Number(a.weight) || 0;
        return acc;
    }, { purchase: 0, batchShare: 0, base: 0, sharedShare: 0, full: 0, weight: 0 });

    const boughtDates = chosen.map(a => a.boughtDate || batch?.startDate).filter(Boolean).sort();
    const firstBought = boughtDates[0];
    const lastBought = boughtDates[boughtDates.length - 1];
    const daysHeld = daysBetween(firstBought, sellDate);
    const shared = batch ? costing.sharedFor(batch.id) : null;

    const margins = Array.from(new Set([0, 10, 20, 30, costing.margin])).sort((a, b) => a - b);
    const priceTotal = priceMode === 'perKg' ? (Number(priceInput) || 0) * totals.weight : Number(priceInput) || 0;
    const per = (v) => (n > 0 ? v / n : 0);

    const setFlockCount = (value) => {
        setCount(value);
        const k = Math.max(0, Math.min(living.length, parseInt(value, 10) || 0));
        setSelected(living.slice(0, k).map(a => a.id));
    };
    const toggle = (id) => setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    const group = (filter) => setSelected(living.filter(filter).map(a => a.id));

    if (batches.length === 0) {
        return (
            <div className="space-y-6">
                <PageHeader section="calculator" />
                <EmptyState emoji="🧮" title="No animals to price yet" message="Once a batch has living animals you can work out costs and selling prices here." />
            </div>
        );
    }

    const segments = [
        { label: 'Purchase', value: totals.purchase, cls: 'bg-sky-400' },
        { label: 'Batch expenses', value: totals.batchShare, cls: 'bg-orange-400' },
        { label: 'Shared farm costs', value: totals.sharedShare, cls: 'bg-amber-300' }
    ];

    return (
        <div className="space-y-6">
            <PageHeader section="calculator" />

            {/* 1. Batch */}
            <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto scrollbar-none">
                <div className="flex gap-2 min-w-max pb-1">
                    {batches.map(b => {
                        const active = b.id === batchId;
                        return (
                            <button
                                key={b.id}
                                onClick={() => setBatchId(b.id)}
                                className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 ring-1 text-sm font-bold ${active ? 'bg-forest text-white ring-forest shadow-md' : 'bg-white text-gray-700 ring-gray-200'}`}
                            >
                                <span className="text-lg">{ANIMAL_EMOJI[b.type] || '🐾'}</span>
                                {b.name}
                                <span className={`rounded-full px-1.5 text-[11px] ${active ? 'bg-white/20' : 'bg-gray-100'}`}>{(b.animals || []).filter(isAlive).length}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {batch && (
                <div className="grid grid-cols-1 lg:grid-cols-[22rem_minmax(0,1fr)] gap-6 items-start">
                    {/* 2. Animals */}
                    <Card title={flock ? 'How many birds?' : 'Which animals?'} emoji="✅" className="lg:sticky lg:top-24">
                        {flock ? (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        min="1"
                                        max={living.length}
                                        value={count}
                                        onChange={e => setFlockCount(e.target.value)}
                                        className="flex-1 px-4 py-3 rounded-2xl border border-gray-300 text-2xl font-display font-semibold"
                                    />
                                    <button onClick={() => setFlockCount(String(living.length))} className="px-3 rounded-2xl bg-gray-100 text-sm font-bold text-gray-700">All {living.length}</button>
                                </div>
                                <p className="text-xs text-gray-500">Healthy birds are counted first.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-1.5">
                                    {[['All', () => true], ['Kids', a => !isAdult(a)], ['Adults', isAdult], ['Males', a => a.gender === 'Male'], ['Females', a => a.gender !== 'Male']].map(([label, fn]) => (
                                        <button key={label} onClick={() => group(fn)} className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700">{label}</button>
                                    ))}
                                    <button onClick={() => setSelected([])} className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-500">Clear</button>
                                </div>
                                {living.length > 8 && (
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ID…" className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 text-sm" />
                                    </div>
                                )}
                                <div className="max-h-[22rem] overflow-y-auto rounded-2xl ring-1 ring-gray-200 divide-y divide-gray-100">
                                    {living.filter(a => !search || String(a.id).toLowerCase().includes(search.toLowerCase())).map(a => {
                                        const on = selected.includes(a.id);
                                        return (
                                            <label key={a.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${on ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                                                <input type="checkbox" checked={on} onChange={() => toggle(a.id)} className="w-5 h-5 rounded" />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-bold text-gray-900 truncate">{a.id}</span>
                                                    <span className="block text-[11px] text-gray-500">{a.gender} · {a.weight || 0} kg · {a.category || '—'}</span>
                                                </span>
                                                <span className="text-xs font-bold text-orange-600">{rupees(costing.costOf(a, batch).base)}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <p className="mt-3 text-sm font-bold text-forest">{n} selected · {totals.weight.toFixed(1)} kg live weight</p>
                    </Card>

                    <div className="space-y-6 min-w-0">
                        {n === 0 ? (
                            <EmptyState compact emoji="👆" title="Pick some animals" message="Select the animals you plan to sell to see the numbers." />
                        ) : (
                            <>
                                {/* The two headline prices */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {[
                                        { label: 'Without shared costs', sub: 'animal price + batch expenses', cost: totals.base, tone: 'from-sky-50 ring-sky-200', text: 'text-sky-900' },
                                        { label: 'With shared costs', sub: '+ salaries, rent & bills share', cost: totals.full, tone: 'from-amber-50 ring-amber-200', text: 'text-amber-900' }
                                    ].map(p => (
                                        <motion.div
                                            key={p.label}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`rounded-3xl bg-gradient-to-br ${p.tone} to-white ring-1 shadow-sm p-4`}
                                        >
                                            <p className={`text-xs font-extrabold uppercase tracking-wider ${p.text}`}>{p.label}</p>
                                            <p className="text-[11px] text-gray-500">{p.sub}</p>
                                            <p className="mt-2 text-[11px] font-bold uppercase text-gray-400">Sell at (+{costing.margin}%)</p>
                                            <p className={`font-display text-3xl font-semibold ${p.text}`}>
                                                <AnimatedNumber value={Math.round(per(p.cost) * (1 + costing.margin / 100))} prefix="₹" />
                                                <span className="text-sm font-sans font-bold text-gray-500"> / animal</span>
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {rupees(p.cost * (1 + costing.margin / 100))} for all {n} · break-even {rupees(per(p.cost))}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                                {totals.sharedShare === 0 && (
                                    <div className="flex gap-3 rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-3 text-sm text-amber-900">
                                        <span className="text-xl">💡</span>
                                        <p>
                                            {(costing.poolThisMonth?.total || 0) === 0
                                                ? 'Both prices match because no shared costs are recorded yet — add staff salaries (Team), yearly bills like rent, or general expenses not linked to a batch, and they will be shared here automatically.'
                                                : 'Both prices match because this batch had no animals on the farm in the months when shared costs were paid.'}
                                        </p>
                                    </div>
                                )}

                                {/* Timeline */}
                                <Card title="When" emoji="📅">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                                        <div className="rounded-2xl bg-gray-50 p-3">
                                            <p className="text-[10px] font-bold uppercase text-gray-400">Bought</p>
                                            <p className="text-sm font-bold text-gray-900">{firstBought ? formatDate(firstBought, { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</p>
                                            {lastBought && lastBought !== firstBought && <p className="text-[10px] text-gray-400">to {formatDate(lastBought, { day: 'numeric', month: 'short' })}</p>}
                                        </div>
                                        <div className="rounded-2xl bg-gray-50 p-3 col-span-2 sm:col-span-1 order-last sm:order-none">
                                            <p className="text-[10px] font-bold uppercase text-gray-400">Selling on</p>
                                            <input type="date" value={sellDate} onChange={e => setSellDate(e.target.value)} className="w-full bg-transparent text-sm font-bold text-gray-900 text-center" />
                                        </div>
                                        <div className="rounded-2xl bg-green-50 p-3">
                                            <p className="text-[10px] font-bold uppercase text-green-700/70">Raised for</p>
                                            <p className="font-display text-xl font-semibold text-green-800">{daysHeld ?? '—'} <span className="text-xs">days</span></p>
                                        </div>
                                    </div>
                                </Card>

                                {/* Cost breakdown */}
                                <Card title="What they cost you" emoji="🧾">
                                    <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 mb-4">
                                        {segments.map(sg => sg.value > 0 && (
                                            <motion.span key={sg.label} className={sg.cls} initial={{ width: 0 }} animate={{ width: `${(sg.value / (totals.full || 1)) * 100}%` }} transition={{ type: 'spring', stiffness: 90, damping: 20 }} />
                                        ))}
                                    </div>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-[11px] uppercase text-gray-400">
                                                <th className="text-left font-bold pb-2">Item</th>
                                                <th className="text-right font-bold pb-2">Per animal</th>
                                                <th className="text-right font-bold pb-2">All {n}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            <tr><td className="py-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-400 mr-2" />Purchase price</td><td className="text-right">{rupees(per(totals.purchase))}</td><td className="text-right">{rupees(totals.purchase)}</td></tr>
                                            <tr><td className="py-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400 mr-2" />Batch expenses <span className="text-[11px] text-gray-400">(feed, medicine…)</span></td><td className="text-right">{rupees(per(totals.batchShare))}</td><td className="text-right">{rupees(totals.batchShare)}</td></tr>
                                            <tr className="font-bold bg-gray-50"><td className="py-2 pl-2">Batch cost <span className="font-medium text-[11px] text-gray-500">= break-even</span></td><td className="text-right">{rupees(per(totals.base))}</td><td className="text-right pr-2">{rupees(totals.base)}</td></tr>
                                            <tr><td className="py-2"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-300 mr-2" />Shared farm costs <span className="text-[11px] text-gray-400">(salaries, rent, bills)</span></td><td className="text-right">{rupees(per(totals.sharedShare))}</td><td className="text-right">{rupees(totals.sharedShare)}</td></tr>
                                            <tr className="font-bold bg-amber-50"><td className="py-2 pl-2">Full cost</td><td className="text-right">{rupees(per(totals.full))}</td><td className="text-right pr-2">{rupees(totals.full)}</td></tr>
                                        </tbody>
                                    </table>
                                    {shared && (
                                        <p className="mt-3 text-xs text-gray-500">
                                            This batch has carried {rupees(shared.total)} of shared costs so far ({(shared.percentNow * 100).toFixed(1)}% of this month’s farm costs). Each animal’s part follows its purchase price.
                                        </p>
                                    )}
                                </Card>

                                {/* Price ladder */}
                                <Card title="Price ladder" emoji="🪜">
                                    <div className="overflow-x-auto -mx-1">
                                        <table className="w-full text-sm min-w-[30rem]">
                                            <thead>
                                                <tr className="text-[11px] uppercase text-gray-400">
                                                    <th className="text-left font-bold pb-2 px-1">Margin</th>
                                                    <th className="text-right font-bold pb-2 px-1">Batch cost · each</th>
                                                    <th className="text-right font-bold pb-2 px-1">Batch cost · all</th>
                                                    <th className="text-right font-bold pb-2 px-1 bg-amber-50 rounded-tl-xl">+ shared · each</th>
                                                    <th className="text-right font-bold pb-2 px-1 bg-amber-50 rounded-tr-xl">+ shared · all</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {margins.map(m => {
                                                    const k = 1 + m / 100;
                                                    const recommended = m === costing.margin;
                                                    return (
                                                        <tr key={m} className={recommended ? 'font-bold text-forest' : ''}>
                                                            <td className="py-2.5 px-1 whitespace-nowrap">
                                                                {m === 0 ? 'Break-even' : `+${m}%`}
                                                                {recommended && <span className="ml-1.5 rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-[10px]">your margin</span>}
                                                            </td>
                                                            <td className="text-right px-1">{rupees(per(totals.base) * k)}</td>
                                                            <td className="text-right px-1">
                                                                <button onClick={() => { setPriceMode('total'); setPriceInput(String(Math.round(totals.base * k))); }} className="hover:underline">{rupees(totals.base * k)}</button>
                                                            </td>
                                                            <td className="text-right px-1 bg-amber-50/60">{rupees(per(totals.full) * k)}</td>
                                                            <td className="text-right px-1 bg-amber-50/60">
                                                                <button onClick={() => { setPriceMode('total'); setPriceInput(String(Math.round(totals.full * k))); }} className="hover:underline">{rupees(totals.full * k)}</button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {totals.weight > 0 && (
                                        <p className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                                            <Scale className="w-3.5 h-3.5" /> Per kg live weight: break-even {rupees(totals.base / totals.weight)}/kg · with shared {rupees(totals.full / totals.weight)}/kg
                                        </p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-400">Tap a total to try it below.</p>
                                </Card>

                                {/* Try a price */}
                                <Card title="Try a price" emoji="🤝">
                                    <div className="flex gap-1 p-1 rounded-xl bg-gray-100 w-fit mb-3">
                                        {[['total', 'Total ₹'], ['perKg', '₹ per kg']].map(([id, label]) => (
                                            <button key={id} onClick={() => setPriceMode(id)} disabled={id === 'perKg' && totals.weight <= 0} className={`px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 ${priceMode === id ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>{label}</button>
                                        ))}
                                    </div>
                                    <div className="relative">
                                        <IndianRupee className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            value={priceInput}
                                            onChange={e => setPriceInput(e.target.value)}
                                            placeholder={priceMode === 'perKg' ? 'Rate per kg' : `Total for ${n}`}
                                            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-300 text-2xl font-display font-semibold"
                                        />
                                    </div>
                                    {priceMode === 'perKg' && priceTotal > 0 && <p className="mt-1 text-xs text-gray-500">{totals.weight.toFixed(1)} kg × ₹{priceInput} = {rupees(priceTotal)}</p>}

                                    {priceTotal > 0 && (
                                        <div className="mt-4 grid sm:grid-cols-2 gap-3">
                                            {[['After batch costs', priceTotal - totals.base, totals.base], ['After shared costs too', priceTotal - totals.full, totals.full]].map(([label, profit, cost]) => (
                                                <div key={label} className={`rounded-2xl p-4 ${profit >= 0 ? 'bg-green-50 ring-1 ring-green-100' : 'bg-red-50 ring-1 ring-red-100'}`}>
                                                    <p className="text-[11px] font-bold uppercase text-gray-500">{label}</p>
                                                    <p className={`font-display text-2xl font-semibold ${profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                                                        {profit >= 0 ? '+' : '−'}<AnimatedNumber value={Math.abs(Math.round(profit))} prefix="₹" />
                                                    </p>
                                                    <p className="text-xs text-gray-500">{cost > 0 ? `${((profit / cost) * 100).toFixed(1)}% margin` : '—'} · {rupees(per(profit))} per animal</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <button
                                        onClick={() => openSell({ batchId: batch.id, presetIds: chosen.map(a => a.id), presetTotal: priceTotal || undefined })}
                                        className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-forest text-white font-bold py-3.5 shadow-[0_3px_0_#0b2416]"
                                    >
                                        <CalendarDays className="w-4 h-4" /> Record this sale
                                    </button>
                                </Card>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfitCalculator;

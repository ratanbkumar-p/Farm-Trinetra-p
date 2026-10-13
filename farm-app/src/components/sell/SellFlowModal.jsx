import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Search, Check } from 'lucide-react';
import Modal from '../ui/Modal';
import { useUI } from '../../context/UIContext';
import { useData } from '../../context/DataContext';
import { useCosting } from '../../lib/costing';
import { ANIMAL_EMOJI } from '../../lib/navigation';
import { notify, celebrate } from '../../lib/notify';
import { isAlive, isPoultryType, animalSeq, todayISO, formatDate, rupees } from '../livestock/livestockUtils';

const isAdult = (a) => a.category === 'Adult' || a.category === 'Parent';

/**
 * One sell flow for the whole app: pick a batch → pick animals → price & date.
 * Opened from Home, the mobile "Sell" button, the Profit Calculator and inside a batch.
 */
const SellFlowModal = () => {
    const { sell, closeSell } = useUI();
    const { data, sellSelectedAnimals } = useData();
    const costing = useCosting();

    const [step, setStep] = useState(0);
    const [batchId, setBatchId] = useState(null);
    const [selected, setSelected] = useState([]);
    const [count, setCount] = useState('');
    const [showExact, setShowExact] = useState(false);
    const [search, setSearch] = useState('');
    const [total, setTotal] = useState('');
    const [date, setDate] = useState(todayISO());
    const [buyer, setBuyer] = useState('');
    const [saving, setSaving] = useState(false);

    const sellable = useMemo(() => (data.batches || [])
        .filter(b => b.status !== 'Completed' && (b.animals || []).some(isAlive)), [data.batches]);

    // Reset each time the flow opens (optionally jumping straight to a batch / selection)
    useEffect(() => {
        if (!sell.open) return;
        setBatchId(sell.batchId || null);
        setSelected(sell.presetIds || []);
        setCount(sell.presetIds?.length ? String(sell.presetIds.length) : '');
        setShowExact(false);
        setSearch('');
        setTotal(sell.presetTotal ? String(Math.round(sell.presetTotal)) : '');
        setDate(todayISO());
        setBuyer('');
        setStep(sell.batchId ? (sell.presetIds?.length ? 2 : 1) : 0);
    }, [sell]);

    const batch = (data.batches || []).find(b => b.id === batchId);
    const flock = isPoultryType(batch?.type);
    const living = useMemo(() => (batch?.animals || []).filter(isAlive)
        // healthy before sick, then by number
        .sort((a, b) => (a.status === 'Sick') - (b.status === 'Sick') || animalSeq(a) - animalSeq(b)), [batch]);

    const chosen = living.filter(a => selected.includes(a.id));
    const costs = chosen.map(a => costing.costOf(a, batch));
    const baseCost = costs.reduce((s, c) => s + c.base, 0);
    const fullCost = costs.reduce((s, c) => s + c.full, 0);
    const amount = Number(total) || 0;
    const margin = costing.margin;

    const setFlockCount = (value) => {
        setCount(value);
        const n = Math.max(0, Math.min(living.length, parseInt(value, 10) || 0));
        setSelected(living.slice(0, n).map(a => a.id));
    };

    const toggle = (id) => setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    const selectGroup = (filter) => {
        const ids = living.filter(filter).map(a => a.id);
        const all = ids.every(id => selected.includes(id));
        setSelected(prev => (all ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))));
    };

    const submit = async () => {
        if (!batch || chosen.length === 0 || amount <= 0) return;
        setSaving(true);
        try {
            await sellSelectedAnimals(batch.id, chosen.map(a => a.id), Math.round(amount / chosen.length), date, { soldTo: buyer.trim() });
            notify.success(`${chosen.length} from ${batch.name} sold for ${rupees(amount)}.`, { title: 'Sale recorded' });
            celebrate(['💰', '🎉', ANIMAL_EMOJI[batch.type] || '✨']);
            closeSell();
        } catch (err) {
            console.error('Sale failed:', err);
            notify.error('Could not save the sale. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const titles = ['Sell animals', batch ? `Sell from ${batch.name}` : 'Pick animals', 'Price & date'];
    const subtitles = ['Step 1 · choose a batch', `Step 2 · choose ${flock ? 'how many birds' : 'animals'}`, `Step 3 · ${chosen.length} selected`];

    return (
        <Modal isOpen={sell.open} onClose={closeSell} title={titles[step]} subtitle={subtitles[step]} emoji="💰" size="lg">
            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    className="space-y-4"
                >
                    {/* STEP 1 — batch */}
                    {step === 0 && (
                        sellable.length === 0 ? (
                            <p className="py-10 text-center text-gray-500">No batches have animals to sell right now.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {sellable.map(b => {
                                    const alive = (b.animals || []).filter(isAlive).length;
                                    return (
                                        <button
                                            key={b.id}
                                            onClick={() => { setBatchId(b.id); setSelected([]); setCount(''); setStep(1); }}
                                            className="flex items-center gap-3 rounded-2xl p-3 text-left ring-1 ring-gray-200 bg-white hover:ring-forest hover:bg-green-50"
                                        >
                                            <span className="grid place-items-center w-11 h-11 rounded-xl bg-straw text-2xl">{ANIMAL_EMOJI[b.type] || '🐾'}</span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-bold text-gray-900 truncate">{b.name}</span>
                                                <span className="block text-xs text-gray-500">{b.type} · {alive} alive</span>
                                            </span>
                                            <ArrowRight className="w-4 h-4 text-gray-400" />
                                        </button>
                                    );
                                })}
                            </div>
                        )
                    )}

                    {/* STEP 2 — animals */}
                    {step === 1 && batch && (
                        <>
                            {flock ? (
                                <div className="rounded-2xl bg-sky-50 ring-1 ring-sky-100 p-4">
                                    <label className="block text-sm font-bold text-sky-900 mb-1">How many birds are you selling?</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min="1"
                                            max={living.length}
                                            autoFocus
                                            value={count}
                                            onChange={e => setFlockCount(e.target.value)}
                                            className="flex-1 px-4 py-3 rounded-xl border border-sky-200 bg-white text-2xl font-display font-semibold"
                                            placeholder="0"
                                        />
                                        <button type="button" onClick={() => setFlockCount(String(living.length))} className="px-4 rounded-xl bg-white ring-1 ring-sky-200 text-sm font-bold text-sky-800">
                                            All {living.length}
                                        </button>
                                    </div>
                                    <p className="text-xs text-sky-800/70 mt-1.5">Healthy birds are picked first.</p>
                                    <button type="button" onClick={() => setShowExact(v => !v)} className="mt-2 text-xs font-bold text-sky-800 underline">
                                        {showExact ? 'Hide bird list' : 'Pick exact birds instead'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => selectGroup(a => !isAdult(a))} className="px-3 py-2 rounded-xl text-xs font-bold bg-sky-50 text-sky-800 ring-1 ring-sky-200">Kids</button>
                                    <button type="button" onClick={() => selectGroup(isAdult)} className="px-3 py-2 rounded-xl text-xs font-bold bg-green-50 text-green-800 ring-1 ring-green-200">Adults</button>
                                    <button type="button" onClick={() => selectGroup(a => a.gender === 'Male')} className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-gray-700 ring-1 ring-gray-200">Males</button>
                                    <button type="button" onClick={() => selectGroup(() => true)} className="px-3 py-2 rounded-xl text-xs font-bold bg-white text-gray-700 ring-1 ring-gray-200">All</button>
                                    <span className="ml-auto self-center text-xs font-bold text-forest">{selected.length} selected</span>
                                </div>
                            )}

                            {(!flock || showExact) && (
                                <>
                                    {living.length > 8 && (
                                        <div className="relative">
                                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ID…" className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 text-sm" />
                                        </div>
                                    )}
                                    <div className="max-h-72 overflow-y-auto rounded-2xl ring-1 ring-gray-200 divide-y divide-gray-100 bg-white">
                                        {living.filter(a => !search || String(a.id).toLowerCase().includes(search.toLowerCase())).map(a => {
                                            const on = selected.includes(a.id);
                                            const c = costing.costOf(a, batch);
                                            return (
                                                <label key={a.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer ${on ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                                                    <input type="checkbox" checked={on} onChange={() => toggle(a.id)} className="w-5 h-5 rounded" />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-sm font-bold text-gray-900 truncate">{a.id}</span>
                                                        <span className="block text-xs text-gray-500">{a.gender} · {a.weight || 0} kg{a.status === 'Sick' ? ' · sick' : ''}</span>
                                                    </span>
                                                    <span className="text-right">
                                                        <span className="block text-[10px] font-bold uppercase text-gray-400">Break-even</span>
                                                        <span className="block text-xs font-bold text-orange-600">{rupees(c.base)}</span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {/* STEP 3 — price */}
                    {step === 2 && batch && (
                        <>
                            <div className="rounded-2xl bg-gray-50 p-3 flex items-center gap-3">
                                <span className="text-2xl">{ANIMAL_EMOJI[batch.type] || '🐾'}</span>
                                <p className="text-sm text-gray-700"><strong>{chosen.length}</strong> from <strong>{batch.name}</strong></p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-1">Total price for all {chosen.length} (₹)</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min="1"
                                    autoFocus
                                    value={total}
                                    onChange={e => setTotal(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl border border-gray-300 text-2xl font-display font-semibold"
                                    placeholder="0"
                                />
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {[['Break-even', baseCost], [`+${margin}%`, baseCost * (1 + margin / 100)], ['+ shared costs', fullCost], [`+ shared +${margin}%`, fullCost * (1 + margin / 100)]].map(([label, value]) => (
                                        <button key={label} type="button" onClick={() => setTotal(String(Math.round(value)))} className="rounded-full bg-white ring-1 ring-gray-200 hover:ring-forest px-3 py-1 text-xs font-bold text-gray-700">
                                            {label}: {rupees(value)}
                                        </button>
                                    ))}
                                </div>
                                {amount > 0 && chosen.length > 1 && <p className="mt-1 text-xs text-gray-500">{rupees(amount / chosen.length)} each</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-1">Sale date</label>
                                    <input type="date" max={todayISO()} value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-300 font-semibold" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-800 mb-1">Buyer <span className="font-normal text-gray-400">(optional)</span></label>
                                    <input value={buyer} onChange={e => setBuyer(e.target.value)} placeholder="Name" className="w-full px-3 py-2.5 rounded-xl border border-gray-300" />
                                </div>
                            </div>

                            {amount > 0 && (
                                <div className="grid grid-cols-2 gap-2">
                                    {[['Profit (batch costs)', amount - baseCost], ['Profit after shared costs', amount - fullCost]].map(([label, value]) => (
                                        <div key={label} className={`rounded-2xl p-3 ${value >= 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
                                            <p className="text-[11px] font-bold uppercase opacity-70">{label}</p>
                                            <p className="font-display text-xl font-semibold">{value >= 0 ? '+' : '−'}{rupees(Math.abs(value))}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <p className="text-xs text-gray-500">Recording on {formatDate(date)}.</p>
                        </>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Footer */}
            <div className="mt-6 flex gap-3">
                {step > 0 && !(step === 1 && sell.batchId && !sell.allowBatchChange) ? (
                    <button onClick={() => setStep(s => s - 1)} className="flex items-center justify-center gap-1 flex-1 py-3 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                ) : (
                    <button onClick={closeSell} className="flex-1 py-3 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
                )}
                {step === 1 && (
                    <button
                        disabled={chosen.length === 0}
                        onClick={() => setStep(2)}
                        className="flex-[2] flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-white bg-forest shadow-[0_3px_0_#0b2416] disabled:opacity-40 disabled:shadow-none"
                    >
                        Next · {chosen.length} selected <ArrowRight className="w-4 h-4" />
                    </button>
                )}
                {step === 2 && (
                    <button
                        disabled={saving || amount <= 0 || chosen.length === 0}
                        onClick={submit}
                        className="flex-[2] flex items-center justify-center gap-1.5 py-3 rounded-2xl font-bold text-white bg-forest shadow-[0_3px_0_#0b2416] disabled:opacity-40 disabled:shadow-none"
                    >
                        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Check className="w-4 h-4" /> Confirm sale {amount > 0 ? rupees(amount) : ''}</>}
                    </button>
                )}
            </div>
        </Modal>
    );
};

export default SellFlowModal;

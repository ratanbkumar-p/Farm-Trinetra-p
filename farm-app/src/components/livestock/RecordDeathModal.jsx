import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Search, CalendarDays, AlertTriangle } from 'lucide-react';
import Modal from '../ui/Modal';
import { DEATH_REASONS, isAlive, isPoultryType, animalSeq, todayISO, formatDate, rupees } from './livestockUtils';

/**
 * Records one or more deaths with a real date + reason.
 * - Goats / sheep / cows: tick the exact animals.
 * - Poultry: pick a group (healthy flock / sick bay) and how many birds.
 */
const RecordDeathModal = ({ isOpen, onClose, batch, presetAnimalIds = [], onSubmit, lossFor }) => {
    const flock = isPoultryType(batch?.type);
    const living = useMemo(() => (batch?.animals || []).filter(isAlive).sort((a, b) => animalSeq(a) - animalSeq(b)), [batch]);
    const sick = living.filter(a => a.status === 'Sick');
    const healthy = living.filter(a => a.status !== 'Sick');

    const [selected, setSelected] = useState([]);
    const [group, setGroup] = useState('Healthy');
    const [count, setCount] = useState('');
    const [date, setDate] = useState(todayISO());
    const [reason, setReason] = useState('Sickness');
    const [notes, setNotes] = useState('');
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    // Reset the form each time it opens
    useEffect(() => {
        if (!isOpen) return;
        setSelected(presetAnimalIds);
        setGroup(sick.length > 0 && presetAnimalIds.length === 0 ? 'Sick' : 'Healthy');
        setCount('');
        setDate(todayISO());
        setReason('Sickness');
        setNotes('');
        setSearch('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const pool = group === 'Sick' ? sick : healthy;
    const n = Math.max(0, parseInt(count, 10) || 0);
    const targetAnimals = flock
        ? pool.slice(0, n)
        : living.filter(a => selected.includes(a.id));

    const estimatedLoss = targetAnimals.reduce((sum, a) => sum + (lossFor ? lossFor(a) : Number(a.purchaseCost) || 0), 0);
    const tooMany = flock && n > pool.length;
    const beforeArrival = targetAnimals.some(a => a.boughtDate && date && date < a.boughtDate);
    const future = date > todayISO();
    const canSubmit = targetAnimals.length > 0 && date && !tooMany && !future && !saving;

    const filtered = living.filter(a => !search || String(a.id).toLowerCase().includes(search.toLowerCase()));

    const toggle = (id) => setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

    const submit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSaving(true);
        try {
            await onSubmit({ animalIds: targetAnimals.map(a => a.id), date, reason, notes: notes.trim() });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Record a death"
            subtitle={batch ? `${batch.name} · ${batch.type}` : undefined}
            emoji="🕊️"
        >
            <form onSubmit={submit} className="space-y-5">
                {/* WHO */}
                {flock ? (
                    <div className="space-y-3">
                        <p className="text-sm font-bold text-gray-800">Which birds?</p>
                        <div className="grid grid-cols-2 gap-2">
                            {[{ id: 'Healthy', label: 'Main flock', emoji: '🐔', list: healthy }, { id: 'Sick', label: 'Sick bay', emoji: '🤒', list: sick }].map(g => (
                                <button
                                    type="button"
                                    key={g.id}
                                    onClick={() => setGroup(g.id)}
                                    disabled={g.list.length === 0}
                                    className={`rounded-2xl p-3 text-left ring-2 disabled:opacity-40 ${group === g.id ? 'ring-red-400 bg-red-50' : 'ring-gray-200 bg-white'}`}
                                >
                                    <span className="text-2xl">{g.emoji}</span>
                                    <span className="block text-sm font-bold text-gray-900 mt-1">{g.label}</span>
                                    <span className="block text-xs text-gray-500">{g.list.length} alive</span>
                                </button>
                            ))}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-800 mb-1">How many died?</label>
                            <input
                                type="number"
                                min="1"
                                max={pool.length}
                                inputMode="numeric"
                                required
                                autoFocus
                                value={count}
                                onChange={e => setCount(e.target.value)}
                                className="w-full px-4 py-3 rounded-2xl border border-gray-300 text-2xl font-display font-semibold"
                                placeholder="0"
                            />
                            {tooMany && <p className="mt-1 text-xs font-semibold text-red-600">Only {pool.length} birds in this group.</p>}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-gray-800">Which animal{selected.length === 1 ? '' : 's'}?</p>
                            <span className="text-xs font-bold text-red-600">{selected.length} selected</span>
                        </div>
                        {living.length > 6 && (
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search by ID…"
                                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 text-sm"
                                />
                            </div>
                        )}
                        <div className="max-h-56 overflow-y-auto rounded-2xl ring-1 ring-gray-200 divide-y divide-gray-100 bg-white">
                            {filtered.length === 0 && <p className="p-4 text-sm text-gray-500 text-center">No living animals in this batch.</p>}
                            {filtered.map(a => {
                                const on = selected.includes(a.id);
                                return (
                                    <label key={a.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer ${on ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                                        <input type="checkbox" checked={on} onChange={() => toggle(a.id)} className="w-5 h-5 rounded accent-red-500" />
                                        <span className={`grid place-items-center w-8 h-8 rounded-full text-xs font-bold ${a.gender === 'Male' ? 'bg-sky-100 text-sky-700' : 'bg-pink-100 text-pink-700'}`}>
                                            {a.gender === 'Male' ? 'M' : 'F'}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-bold text-gray-900 truncate">{a.id}</span>
                                            <span className="block text-xs text-gray-500">{a.category || '—'} · {a.weight || 0} kg {a.status === 'Sick' && <span className="text-orange-600 font-bold">· sick</span>}</span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* WHEN */}
                <div>
                    <label className="flex items-center gap-1.5 text-sm font-bold text-gray-800 mb-1">
                        <CalendarDays className="w-4 h-4 text-red-500" /> Date of death
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            required
                            max={todayISO()}
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 font-semibold"
                        />
                        <button
                            type="button"
                            onClick={() => { const d = new Date(); d.setDate(d.getDate() - 1); setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`); }}
                            className="px-3 rounded-xl text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                            Yesterday
                        </button>
                        <button type="button" onClick={() => setDate(todayISO())} className="px-3 rounded-xl text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">
                            Today
                        </button>
                    </div>
                    {future && <p className="mt-1 text-xs font-semibold text-red-600">The date can’t be in the future.</p>}
                    {beforeArrival && !future && (
                        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-700">
                            <AlertTriangle className="w-3.5 h-3.5" /> This is before the animal arrived — double-check the date.
                        </p>
                    )}
                </div>

                {/* WHY */}
                <div>
                    <p className="text-sm font-bold text-gray-800 mb-2">Reason</p>
                    <div className="flex flex-wrap gap-2">
                        {DEATH_REASONS.map(r => (
                            <motion.button
                                type="button"
                                key={r.id}
                                whileTap={{ scale: 0.92 }}
                                onClick={() => setReason(r.id)}
                                className={`px-3 py-1.5 rounded-full text-sm font-semibold ring-1 ${reason === r.id ? 'bg-forest text-white ring-forest' : 'bg-white text-gray-700 ring-gray-200 hover:ring-gray-300'}`}
                            >
                                <span className="mr-1">{r.emoji}</span>{r.id}
                            </motion.button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1">Notes <span className="font-normal text-gray-400">(optional)</span></label>
                    <textarea
                        rows="2"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Symptoms, vet visit, what was found…"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm"
                    />
                </div>

                {/* SUMMARY */}
                <div className="rounded-2xl bg-red-50 ring-1 ring-red-100 p-4 flex items-center justify-between gap-3">
                    <div className="text-sm text-red-900">
                        <p className="font-bold">
                            {targetAnimals.length || 'No'} {flock ? 'bird' : 'animal'}{targetAnimals.length === 1 ? '' : 's'} · {formatDate(date) || 'pick a date'}
                        </p>
                        <p className="text-xs text-red-700/80">Estimated loss (cost + share of expenses)</p>
                    </div>
                    <p className="font-display text-xl font-semibold text-red-600">{rupees(estimatedLoss)}</p>
                </div>

                <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="flex-[2] py-3 rounded-2xl font-bold text-white bg-barn shadow-[0_3px_0_#b23d1b] disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : `Record ${targetAnimals.length || ''} death${targetAnimals.length === 1 ? '' : 's'}`}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default RecordDeathModal;

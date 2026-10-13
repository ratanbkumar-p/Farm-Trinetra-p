import React, { useMemo, useState } from 'react';
import { Pencil, RotateCcw, Search } from 'lucide-react';
import Modal from '../ui/Modal';
import { animalSeq, formatDate, reasonEmoji, rupees } from './livestockUtils';

/**
 * Poultry deaths are stored per bird but shown as one "12 birds" line.
 * This sheet opens that line into one row per bird so nothing is hidden.
 */
const DeathGroupModal = ({ record, onClose, canEdit, canUndo, onEditRecord, onReviveRecord }) => {
    const [search, setSearch] = useState('');
    const birds = useMemo(() => [...(record?.animals || [])].sort((a, b) => animalSeq(a) - animalSeq(b)), [record]);
    if (!record) return null;

    const single = (a) => ({
        ...record,
        key: `${record.key}|${a.id}`,
        ids: [a.id],
        animals: [a],
        count: 1,
        label: a.id,
        loss: Number(a.trueCost) || Number(a.purchaseCost) || 0
    });
    const shown = birds.filter(a => !search || String(a.id).toLowerCase().includes(search.toLowerCase()));

    return (
        <Modal
            isOpen={!!record}
            onClose={onClose}
            title={`${record.count} birds lost`}
            subtitle={`${record.batchName} · ${record.date ? formatDate(record.date) : 'date not recorded'}`}
            emoji={reasonEmoji(record.reason)}
            size="lg"
        >
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-2xl bg-gray-50 p-3">
                        <p className="text-[10px] font-bold uppercase text-gray-400">Birds</p>
                        <p className="font-display text-xl font-semibold">{record.count}</p>
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-3">
                        <p className="text-[10px] font-bold uppercase text-gray-400">Reason</p>
                        <p className="text-sm font-bold truncate">{record.reason}</p>
                    </div>
                    <div className="rounded-2xl bg-red-50 p-3">
                        <p className="text-[10px] font-bold uppercase text-red-400">Loss</p>
                        <p className="font-display text-xl font-semibold text-red-600">{rupees(record.loss)}</p>
                    </div>
                </div>

                {record.notes && <p className="rounded-2xl bg-gray-50 px-3 py-2 text-sm text-gray-600">“{record.notes}”</p>}

                <div className="flex gap-2">
                    {birds.length > 8 && (
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a bird…" className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 text-sm" />
                        </div>
                    )}
                    {canEdit && (
                        <button
                            onClick={() => { onClose(); onEditRecord(record); }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold ${record.date ? 'bg-gray-100 text-gray-700' : 'bg-amber-500 text-white shadow-[0_3px_0_#b45309]'}`}
                        >
                            <Pencil className="w-4 h-4" /> {record.date ? 'Edit all' : `Add date for all ${record.count}`}
                        </button>
                    )}
                </div>

                <div className="rounded-2xl ring-1 ring-gray-200 overflow-hidden">
                    <div className="grid grid-cols-[1fr_4.5rem_auto] gap-2 px-3 py-2 bg-gray-50 text-[10px] font-bold uppercase text-gray-400">
                        <span>Bird</span><span className="text-right">Loss</span><span className="w-16" />
                    </div>
                    <ul className="max-h-[45vh] overflow-y-auto divide-y divide-gray-100">
                        {shown.map(a => (
                            <li key={a.id} className="grid grid-cols-[1fr_4.5rem_auto] gap-2 items-center px-3 py-2">
                                <span className="min-w-0 flex items-center gap-2.5">
                                    <span className="shrink-0 grid place-items-center min-w-9 h-9 px-1.5 rounded-xl bg-red-50 text-sm font-bold text-red-700">#{String(a.id).split('-').pop()}</span>
                                    <span className="min-w-0">
                                        <span className="block text-[11px] font-semibold text-gray-700 break-all leading-tight">{a.id}</span>
                                        <span className="block text-[11px] text-gray-500">{a.weight ? `${a.weight} kg` : ''}{a.weight && a.boughtDate ? ' · ' : ''}{a.boughtDate ? `since ${formatDate(a.boughtDate, { day: 'numeric', month: 'short' })}` : ''}</span>
                                    </span>
                                </span>
                                <span className="text-right text-sm font-bold text-red-600">−{rupees(Number(a.trueCost) || Number(a.purchaseCost) || 0)}</span>
                                <span className="flex w-16 justify-end">
                                    {canEdit && (
                                        <button onClick={() => onEditRecord(single(a))} className="p-1.5 rounded-lg text-gray-400 hover:text-forest hover:bg-gray-100" aria-label={`Edit ${a.id}`}>
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    )}
                                    {canUndo && (
                                        <button onClick={() => onReviveRecord(single(a))} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50" aria-label={`Undo ${a.id}`}>
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="text-xs text-gray-500">Editing one bird moves it to its own line if its date or reason changes.</p>
            </div>
        </Modal>
    );
};

export default DeathGroupModal;

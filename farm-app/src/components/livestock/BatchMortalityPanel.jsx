import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartCrack, Pencil, RotateCcw, CalendarX } from 'lucide-react';
import { formatDate, reasonEmoji, relativeDay, rupees } from './livestockUtils';
import DeathGroupModal from './DeathGroupModal';

/** Losses card inside a batch: mortality rate + dated list of every death in this batch */
const BatchMortalityPanel = ({ batch, records, canRecord, canEdit, canUndo, onRecord, onEditRecord, onReviveRecord }) => {
    const [showAll, setShowAll] = useState(false);
    const [groupKey, setGroupKey] = useState(null);
    const openGroup = records.find(r => r.key === groupKey) || null;
    const total = (batch.animals || []).length;
    const dead = records.reduce((s, r) => s + r.count, 0);
    const rate = total > 0 ? (dead / total) * 100 : 0;
    const loss = records.reduce((s, r) => s + r.loss, 0);
    const shown = showAll ? records : records.slice(0, 5);
    const rateTone = rate === 0 ? 'text-green-700 bg-green-50' : rate < 5 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';

    return (
        <section className="rounded-3xl bg-white ring-1 ring-gray-200 shadow-sm overflow-hidden">
            <DeathGroupModal
                record={openGroup}
                onClose={() => setGroupKey(null)}
                canEdit={canEdit}
                canUndo={canUndo}
                onEditRecord={onEditRecord}
                onReviveRecord={onReviveRecord}
            />
            <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-gray-100 bg-gradient-to-r from-red-50/60 to-transparent">
                <div className="flex items-center gap-3">
                    <span className="grid place-items-center w-11 h-11 rounded-2xl bg-white ring-1 ring-red-100 text-2xl">🕊️</span>
                    <div>
                        <h4 className="font-semibold text-gray-900 text-lg leading-tight">Losses</h4>
                        <p className="text-xs text-gray-500">
                            {dead} of {total} animals · <span className={`px-1.5 py-0.5 rounded-md font-bold ${rateTone}`}>{rate.toFixed(1)}% mortality</span>
                            {dead > 0 && <> · <span className="font-bold text-red-600">{rupees(loss)}</span></>}
                        </p>
                    </div>
                </div>
                {canRecord && (
                    <button
                        onClick={onRecord}
                        className="shrink-0 flex items-center gap-1.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 px-3 py-2 text-sm font-bold"
                    >
                        <HeartCrack className="w-4 h-4" />
                        <span className="hidden sm:inline">Record death</span>
                        <span className="sm:hidden">Record</span>
                    </button>
                )}
            </div>

            {records.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-500">No losses in this batch 🎉</p>
            ) : (
                <ul className="divide-y divide-gray-100">
                    <AnimatePresence initial={false}>
                        {shown.map(r => (
                            <motion.li
                                key={r.key}
                                layout
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="flex items-center gap-3 px-4 sm:px-5 py-3"
                            >
                                <span className="text-xl">{reasonEmoji(r.reason)}</span>
                                <div className="min-w-0 flex-1">
                                    {r.count > 1 ? (
                                        <button onClick={() => setGroupKey(r.key)} className="text-sm font-bold text-forest underline decoration-dotted underline-offset-4 truncate">
                                            {r.label} › <span className="font-medium text-gray-500 no-underline">· {r.reason}</span>
                                        </button>
                                    ) : (
                                        <p className="text-sm font-bold text-gray-900 truncate">{r.label} <span className="font-medium text-gray-500">· {r.reason}</span></p>
                                    )}
                                    {r.date ? (
                                        <p className="text-xs text-gray-500">{formatDate(r.date)} · {relativeDay(r.date)}</p>
                                    ) : (
                                        <button onClick={() => canEdit && onEditRecord(r)} className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                                            <CalendarX className="w-3.5 h-3.5" /> Date not recorded{canEdit ? ' — add it' : ''}
                                        </button>
                                    )}
                                </div>
                                <span className="text-sm font-bold text-red-600 whitespace-nowrap">−{rupees(r.loss)}</span>
                                <div className="flex">
                                    {canEdit && (
                                        <button onClick={() => onEditRecord(r)} className="p-2 rounded-lg text-gray-400 hover:text-forest hover:bg-gray-100" aria-label="Edit date or reason">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                    )}
                                    {canUndo && (
                                        <button onClick={() => onReviveRecord(r)} className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50" aria-label="Undo death">
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </motion.li>
                        ))}
                    </AnimatePresence>
                </ul>
            )}
            {records.length > 5 && (
                <button onClick={() => setShowAll(v => !v)} className="w-full py-2.5 text-sm font-bold text-forest bg-gray-50 hover:bg-gray-100">
                    {showAll ? 'Show less' : `Show all ${records.length} records`}
                </button>
            )}
        </section>
    );
};

export default BatchMortalityPanel;

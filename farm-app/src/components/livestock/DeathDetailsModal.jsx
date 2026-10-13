import React, { useEffect, useState } from 'react';
import { Loader2, CalendarDays, CalendarX } from 'lucide-react';
import Modal from '../ui/Modal';
import { DEATH_REASONS, todayISO } from './livestockUtils';

/**
 * Edit date / reason / notes for an existing death record (one animal or a
 * same-day group of birds). Also the place where old records with no date get fixed.
 * record: { batchName, count, label, date, reason, notes }
 */
const DeathDetailsModal = ({ isOpen, onClose, record, onSubmit }) => {
    const [date, setDate] = useState('');
    const [reason, setReason] = useState('Unknown');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen || !record) return;
        setDate(record.date || '');
        setReason(record.reason || 'Unknown');
        setNotes(record.notes || '');
    }, [isOpen, record]);

    if (!record) return null;
    const missingDate = !record.date;

    const submit = async (e) => {
        e.preventDefault();
        if (!date) return;
        setSaving(true);
        try {
            await onSubmit({ date, reason, notes: notes.trim() });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={missingDate ? 'Add the missing date' : 'Edit death record'}
            subtitle={`${record.label} · ${record.batchName}`}
            emoji={missingDate ? '📅' : '✏️'}
        >
            <form onSubmit={submit} className="space-y-5">
                {missingDate && (
                    <div className="flex gap-3 rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-3 text-sm text-amber-900">
                        <CalendarX className="w-5 h-5 shrink-0 text-amber-600" />
                        <p>This death was saved before dates were tracked. Add when it happened so your monthly loss reports are correct.</p>
                    </div>
                )}

                <div>
                    <label className="flex items-center gap-1.5 text-sm font-bold text-gray-800 mb-1">
                        <CalendarDays className="w-4 h-4 text-red-500" /> Date of death
                    </label>
                    <input
                        type="date"
                        required
                        autoFocus={missingDate}
                        max={todayISO()}
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 font-semibold"
                    />
                </div>

                <div>
                    <p className="text-sm font-bold text-gray-800 mb-2">Reason</p>
                    <div className="flex flex-wrap gap-2">
                        {DEATH_REASONS.map(r => (
                            <button
                                type="button"
                                key={r.id}
                                onClick={() => setReason(r.id)}
                                className={`px-3 py-1.5 rounded-full text-sm font-semibold ring-1 ${reason === r.id ? 'bg-forest text-white ring-forest' : 'bg-white text-gray-700 ring-gray-200 hover:ring-gray-300'}`}
                            >
                                <span className="mr-1">{r.emoji}</span>{r.id}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1">Notes</label>
                    <textarea rows="2" value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm" />
                </div>

                {record.count > 1 && (
                    <p className="text-xs text-gray-500">This change applies to all {record.count} animals in this record.</p>
                )}

                <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
                    <button
                        type="submit"
                        disabled={!date || saving}
                        className="flex-[2] py-3 rounded-2xl font-bold text-white bg-forest shadow-[0_3px_0_#0b2416] disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Save'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default DeathDetailsModal;

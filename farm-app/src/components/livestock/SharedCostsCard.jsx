import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Calculator, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatMonth, rupees } from './livestockUtils';

/**
 * Shared farm costs (salaries, yearly bills, general expenses) carried by one batch.
 * Deliberately kept OUT of the batch's own numbers — shown here for reference and
 * added on demand in the Profit Calculator.
 */
const SharedCostsCard = ({ batch, shared, pool }) => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const pct = shared.percentNow || 0;
    const parts = [
        ['Salaries', pool?.salaries || 0],
        ['Yearly bills ÷ 12', pool?.yearly || 0],
        ['General expenses', pool?.general || 0]
    ];

    return (
        <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-white ring-1 ring-amber-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h4 className="font-semibold text-amber-950 text-lg leading-tight">Shared farm costs</h4>
                        <p className="text-xs text-amber-800/80">Salaries, rent & general bills — this batch’s share</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white ring-1 ring-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-800">Not included</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 no-entrance">
                    <div className="rounded-2xl bg-white ring-1 ring-amber-100 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase text-amber-700/70">So far</p>
                        <p className="font-display text-xl font-semibold text-amber-900">{rupees(shared.total)}</p>
                    </div>
                    <div className="rounded-2xl bg-white ring-1 ring-amber-100 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase text-amber-700/70">This month</p>
                        <p className="font-display text-xl font-semibold text-amber-900">{rupees(shared.thisMonth)}</p>
                    </div>
                </div>

                <div className="mt-3">
                    <div className="flex justify-between text-xs font-semibold text-amber-900">
                        <span>Share of farm costs this month</span>
                        <span>{(pct * 100).toFixed(1)}%</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-amber-100 overflow-hidden">
                        <motion.div className="h-full rounded-full bg-amber-400" initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct * 100)}%` }} transition={{ type: 'spring', stiffness: 90, damping: 20 }} />
                    </div>
                    <p className="mt-1 text-[11px] text-amber-800/70">Based on how much money is tied up in this batch’s animals compared with all batches.</p>
                </div>

                <div className="mt-3 space-y-1">
                    {parts.map(([label, amount]) => (
                        <div key={label} className="flex justify-between text-sm">
                            <span className="text-gray-600">{label}</span>
                            <span className="font-semibold text-gray-800">{rupees(amount * pct)} <span className="text-[11px] font-medium text-gray-400">of {rupees(amount)}</span></span>
                        </div>
                    ))}
                </div>

                <div className="mt-3 flex gap-2 rounded-2xl bg-white/80 ring-1 ring-amber-100 p-3 text-xs text-amber-900">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <p>Min. sell price, break-even and profit on this page use <strong>batch costs only</strong>. Add shared costs when pricing a sale in the Profit Calculator.</p>
                </div>

                <button
                    onClick={() => navigate('/calculator', { state: { batchId: batch.id } })}
                    className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl bg-amber-500 text-white font-bold text-sm py-2.5 shadow-[0_3px_0_#b45309]"
                >
                    <Calculator className="w-4 h-4" /> Open Profit Calculator
                </button>
            </div>

            {shared.months.length > 0 && (
                <>
                    <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-bold text-amber-900 bg-amber-100/60 hover:bg-amber-100">
                        Month by month
                        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence initial={false}>
                        {open && (
                            <motion.ul initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-white">
                                {[...shared.months].reverse().map(m => (
                                    <li key={m.month} className="flex justify-between px-5 py-2 text-sm border-t border-amber-50">
                                        <span className="text-gray-600">{formatMonth(m.month)} <span className="text-[11px] text-gray-400">· {(m.percent * 100).toFixed(0)}%</span></span>
                                        <span className="font-semibold text-gray-800">{rupees(m.amount)}</span>
                                    </li>
                                ))}
                            </motion.ul>
                        )}
                    </AnimatePresence>
                </>
            )}
        </section>
    );
};

export default SharedCostsCard;

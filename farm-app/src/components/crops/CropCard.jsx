import React from 'react';
import { motion } from 'framer-motion';
import { formatDate, rupees, parseISODate } from '../livestock/livestockUtils';

const daysSince = (iso) => {
    const d = parseISODate(iso);
    return d ? Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000)) : null;
};

/**
 * Crop / fruit card: what it is, how long it has been growing, what it cost,
 * what it has earned, and how close it is to paying for itself.
 */
const CropCard = ({ emoji, name, variety, status, statusClass, plantedDate, totalCost, revenue, profit, tone = 'green', onClick }) => {
    const days = daysSince(plantedDate);
    const recovered = totalCost > 0 ? Math.min(1, revenue / totalCost) : (revenue > 0 ? 1 : 0);
    const band = tone === 'red' ? 'from-rose-100' : 'from-green-100';
    return (
        <motion.button
            type="button"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`group h-full flex flex-col text-left rounded-3xl bg-gradient-to-b ${band} to-white to-45% ring-1 ring-gray-200 shadow-sm hover:shadow-lg p-4`}
        >
            <div className="flex items-start gap-3">
                <span className="grid place-items-center w-14 h-14 rounded-2xl bg-white shadow-md text-3xl shrink-0 group-hover:animate-wiggle">{emoji}</span>
                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 leading-tight truncate">{name}</h3>
                    <p className="text-xs text-gray-500 truncate">{variety || (days !== null ? `Day ${days}` : '')}</p>
                    {plantedDate && <p className="text-[11px] text-gray-400">Planted {formatDate(plantedDate, { day: 'numeric', month: 'short', year: '2-digit' })}{variety && days !== null ? ` · day ${days}` : ''}</p>}
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusClass}`}>{status}</span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-1.5 no-entrance">
                <div className="rounded-2xl bg-white ring-1 ring-gray-100 px-2.5 py-2">
                    <p className="text-[9px] font-bold uppercase text-gray-400">Cost</p>
                    <p className="text-sm font-bold text-gray-900">{rupees(totalCost)}</p>
                </div>
                <div className="rounded-2xl bg-white ring-1 ring-gray-100 px-2.5 py-2">
                    <p className="text-[9px] font-bold uppercase text-gray-400">Sales</p>
                    <p className="text-sm font-bold text-green-700">{rupees(revenue)}</p>
                </div>
                <div className={`rounded-2xl px-2.5 py-2 ${profit >= 0 ? 'bg-sky-50' : 'bg-red-50'}`}>
                    <p className="text-[9px] font-bold uppercase text-gray-400">Profit</p>
                    <p className={`text-sm font-bold ${profit >= 0 ? 'text-sky-700' : 'text-red-600'}`}>{profit >= 0 ? '+' : '−'}{rupees(Math.abs(profit))}</p>
                </div>
            </div>

            <div className="mt-auto pt-3">
                <div className="flex justify-between text-[11px] font-semibold text-gray-500 mb-1">
                    <span>{profit >= 0 ? '🎉 Paid for itself' : 'Paying back its cost'}</span>
                    <span>{Math.round(recovered * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <motion.div className={`h-full rounded-full ${profit >= 0 ? 'bg-sky-500' : 'bg-green-500'}`} initial={{ width: 0 }} animate={{ width: `${recovered * 100}%` }} transition={{ type: 'spring', stiffness: 90, damping: 20 }} />
                </div>
            </div>
        </motion.button>
    );
};

export default CropCard;

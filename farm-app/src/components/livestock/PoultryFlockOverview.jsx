import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { formatDate, parseISODate, reasonEmoji, relativeDay, rupees } from './livestockUtils';

const Stat = ({ label, value, hint, tone = 'text-gray-900' }) => (
    <div className="rounded-2xl bg-white ring-1 ring-gray-200 px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
        <p className={`font-display text-xl font-semibold leading-tight ${tone}`}>{value}</p>
        {hint && <p className="text-[11px] text-gray-500 truncate">{hint}</p>}
    </div>
);

const SurvivalRing = ({ alive, total }) => {
    const pct = total > 0 ? alive / total : 0;
    return (
        <div className="relative w-32 h-32 shrink-0">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f3efe6" strokeWidth="12" />
                <motion.circle
                    cx="60" cy="60" r="50" fill="none" stroke="#2ea44f" strokeWidth="12" strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: pct }}
                    transition={{ type: 'spring', stiffness: 50, damping: 16 }}
                />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                    <p className="font-display text-3xl font-semibold text-forest leading-none">{alive}</p>
                    <p className="text-[10px] font-bold uppercase text-gray-400">alive of {total}</p>
                </div>
            </div>
        </div>
    );
};

const fmtKg = (kg) => (kg >= 1 ? `${kg.toFixed(2)} kg` : `${Math.round(kg * 1000)} g`);

const daysSince = (iso) => {
    const d = parseISODate(iso);
    return d ? Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000)) : null;
};

const avgWeightHistory = (birds) => {
    const byDate = new Map();
    birds.forEach(b => (b.weightHistory || []).forEach(w => {
        if (!w.date) return;
        const e = byDate.get(w.date) || { total: 0, n: 0 };
        e.total += Number(w.weight) || 0;
        e.n += 1;
        byDate.set(w.date, e);
    }));
    return Array.from(byDate.entries()).map(([date, e]) => ({ date, weight: e.total / e.n })).sort((a, b) => a.date.localeCompare(b.date));
};

const Sparkline = ({ points }) => {
    if (points.length < 2) return <p className="text-xs text-gray-400 py-6 text-center">Weigh the flock twice to see a trend.</p>;
    const ws = points.map(p => p.weight);
    const min = Math.min(...ws);
    const max = Math.max(...ws);
    const span = max - min || 1;
    const path = points.map((p, i) => `${(i / (points.length - 1)) * 100},${36 - ((p.weight - min) / span) * 30}`).join(' L ');
    return (
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-16">
            <motion.path d={`M ${path}`} fill="none" stroke="#2ea44f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
        </svg>
    );
};

/**
 * Poultry batch overview: one glance at flock health, money per bird and growth,
 * big one-tap actions, weekly loss bars and a flock diary of everything that happened.
 */
const PoultryFlockOverview = ({ batch, financials, costPerBird, canEdit, actions }) => {
    const [showAllDiary, setShowAllDiary] = useState(false);
    const animals = batch.animals || [];
    const alive = animals.filter(a => a.status !== 'Sold' && a.status !== 'Deceased');
    const sick = alive.filter(a => a.status === 'Sick');
    const sold = animals.filter(a => a.status === 'Sold');
    const dead = animals.filter(a => a.status === 'Deceased');
    const mortality = animals.length ? (dead.length / animals.length) * 100 : 0;
    const health = mortality < 3 ? ['Healthy flock', 'text-green-700'] : mortality < 7 ? ['Keep an eye', 'text-amber-600'] : ['High losses', 'text-red-600'];

    const start = batch.startDate || batch.date;
    const ageDays = daysSince(start);

    const weights = useMemo(() => avgWeightHistory(alive), [alive]);
    const latest = weights[weights.length - 1];
    const previous = weights[weights.length - 2];
    const gainPerDay = latest && previous
        ? ((latest.weight - previous.weight) * 1000) / Math.max(1, (parseISODate(latest.date) - parseISODate(previous.date)) / 86400000)
        : null;

    const feedSpend = (batch.expenses || []).filter(e => /feed/i.test(e.type || e.category || '')).reduce((s, e) => s + (Number(e.amount) || 0), 0);

    // Deaths per week, last 8 weeks
    const weeks = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return Array.from({ length: 8 }, (_, i) => {
            const end = new Date(now);
            end.setDate(end.getDate() - i * 7);
            const begin = new Date(end);
            begin.setDate(begin.getDate() - 6);
            const n = dead.filter(a => {
                const d = parseISODate(a.deceasedDate);
                return d && d >= begin && d <= end;
            }).length;
            return { label: i === 0 ? 'This wk' : `${i}w ago`, n };
        }).reverse();
    }, [dead]);
    const weekMax = Math.max(1, ...weeks.map(w => w.n));

    // Flock diary
    const diary = useMemo(() => {
        const ev = new Map();
        const add = (key, base) => { if (!ev.has(key)) ev.set(key, { key, ...base, n: 0, amount: 0 }); return ev.get(key); };
        dead.forEach(a => { if (a.deceasedDate) add(`d${a.deceasedDate}${a.deathReason}`, { date: a.deceasedDate, emoji: reasonEmoji(a.deathReason), kind: 'death', reason: a.deathReason }).n += 1; });
        sold.forEach(a => { if (a.soldDate) { const e = add(`s${a.soldDate}${a.soldPrice}`, { date: a.soldDate, emoji: '💰', kind: 'sale', price: a.soldPrice }); e.n += 1; e.amount += Number(a.soldPrice) || 0; } });
        weights.forEach(w => add(`w${w.date}`, { date: w.date, emoji: '⚖️', kind: 'weight', weight: w.weight }));
        (batch.medical || []).forEach(m => add(`m${m.id}`, { date: m.date, emoji: '💉', kind: 'medical', name: m.name, birds: (m.animalIds || []).length, type: m.type }));
        (batch.expenses || []).forEach(e => { const x = add(`e${e.id}`, { date: e.date, emoji: '🧾', kind: 'expense', name: e.type, desc: e.description }); x.amount = Number(e.amount) || 0; });
        return Array.from(ev.values()).filter(e => e.date).sort((a, b) => b.date.localeCompare(a.date));
    }, [dead, sold, weights, batch.medical, batch.expenses]);

    const describe = (e) => {
        if (e.kind === 'death') return [`${e.n} bird${e.n === 1 ? '' : 's'} died`, e.reason || 'Unknown'];
        if (e.kind === 'sale') return [`Sold ${e.n} bird${e.n === 1 ? '' : 's'}`, `${rupees(e.amount)} · ${rupees(e.price)} each`];
        if (e.kind === 'weight') return ['Flock weighed', `${fmtKg(e.weight)} average`];
        if (e.kind === 'medical') return [`${e.type}: ${e.name}`, `${e.birds} birds`];
        return [`${e.name || 'Expense'} ${rupees(e.amount)}`, e.desc || ''];
    };

    const buttons = [
        { emoji: '💰', label: 'Sell birds', onClick: actions.sell, show: alive.length > 0, tone: 'bg-forest text-white ring-forest' },
        { emoji: '🕊️', label: 'Record deaths', onClick: actions.death, show: canEdit && alive.length > 0, tone: 'bg-red-50 text-red-800 ring-red-100' },
        { emoji: '🤒', label: 'Move to sick bay', onClick: actions.toSick, show: alive.length - sick.length > 0, tone: 'bg-orange-50 text-orange-800 ring-orange-100' },
        { emoji: '💚', label: `Recovered${sick.length ? ` (${sick.length})` : ''}`, onClick: actions.recover, show: sick.length > 0, tone: 'bg-green-50 text-green-800 ring-green-100' },
        { emoji: '⚖️', label: 'Weigh flock', onClick: actions.weigh, show: alive.length > 0, tone: 'bg-white text-gray-800 ring-gray-200' },
        { emoji: '💉', label: 'Medicine / vaccine', onClick: actions.medical, show: true, tone: 'bg-white text-gray-800 ring-gray-200' },
        { emoji: '🐣', label: 'Add birds', onClick: actions.add, show: true, tone: 'bg-white text-gray-800 ring-gray-200' },
        { emoji: '🧾', label: 'Add expense', onClick: actions.expense, show: true, tone: 'bg-white text-gray-800 ring-gray-200' }
    ].filter(b => b.show);

    return (
        <div className="space-y-5">
            {/* Flock today */}
            <section className="rounded-3xl bg-gradient-to-br from-green-50 to-white ring-1 ring-green-100 shadow-sm p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row gap-5 items-center">
                    <SurvivalRing alive={alive.length} total={animals.length} />
                    <div className="flex-1 w-full">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-xl font-semibold text-forest">Flock today</h3>
                            <span className={`text-sm font-bold ${health[1]}`}>{health[0]} · {mortality.toFixed(1)}% lost</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-full bg-green-100 text-green-800 px-2.5 py-1 text-xs font-bold">🌿 {alive.length - sick.length} healthy</span>
                            <span className="rounded-full bg-orange-100 text-orange-800 px-2.5 py-1 text-xs font-bold">🤒 {sick.length} sick bay</span>
                            <span className="rounded-full bg-sky-100 text-sky-800 px-2.5 py-1 text-xs font-bold">💰 {sold.length} sold</span>
                            <span className="rounded-full bg-red-100 text-red-700 px-2.5 py-1 text-xs font-bold">🕊️ {dead.length} lost</span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 no-entrance">
                            <Stat label="Flock age" value={ageDays !== null ? `${ageDays} d` : '—'} hint={start ? `since ${formatDate(start, { day: 'numeric', month: 'short' })}` : ''} />
                            <Stat label="Avg weight" value={latest ? fmtKg(latest.weight) : '—'} hint={gainPerDay !== null ? `${gainPerDay >= 0 ? '+' : ''}${gainPerDay.toFixed(0)} g/day` : latest ? formatDate(latest.date, { day: 'numeric', month: 'short' }) : 'not weighed'} tone={gainPerDay !== null && gainPerDay < 0 ? 'text-red-600' : 'text-gray-900'} />
                            <Stat label="Cost / bird" value={rupees(costPerBird)} hint={latest ? `${rupees(costPerBird / (latest.weight || 1))}/kg live` : 'batch costs only'} />
                            <Stat label="Feed / bird" value={rupees(alive.length ? feedSpend / alive.length : 0)} hint={`${rupees(feedSpend)} feed so far`} />
                        </div>
                    </div>
                </div>
            </section>

            {/* Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {buttons.map(b => (
                    <motion.button
                        key={b.label}
                        whileTap={{ scale: 0.95 }}
                        onClick={b.onClick}
                        className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-sm font-bold ring-1 shadow-sm text-left ${b.tone}`}
                    >
                        <span className="text-xl">{b.emoji}</span>{b.label}
                    </motion.button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <section className="rounded-3xl bg-white ring-1 ring-gray-200 shadow-sm p-4">
                    <div className="flex justify-between items-baseline">
                        <h4 className="font-semibold text-gray-900">Growth</h4>
                        <span className="text-xs text-gray-500">{weights.length} weigh-ins</span>
                    </div>
                    <Sparkline points={weights} />
                    {weights.length > 0 && (
                        <div className="flex justify-between text-[11px] text-gray-400">
                            <span>{fmtKg(weights[0].weight)}</span>
                            <span>{latest ? fmtKg(latest.weight) : ''}</span>
                        </div>
                    )}
                </section>
                <section className="rounded-3xl bg-white ring-1 ring-gray-200 shadow-sm p-4">
                    <div className="flex justify-between items-baseline">
                        <h4 className="font-semibold text-gray-900">Losses per week</h4>
                        <span className="text-xs text-gray-500">last 8 weeks</span>
                    </div>
                    <div className="mt-3 flex items-end gap-1.5 h-16">
                        {weeks.map((w, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${w.n} lost · ${w.label}`}>
                                <motion.div
                                    className={`w-full rounded-md ${w.n ? 'bg-red-400' : 'bg-gray-100'}`}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${Math.max(6, (w.n / weekMax) * 56)}px` }}
                                    transition={{ type: 'spring', stiffness: 120, damping: 18, delay: i * 0.03 }}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>8 wks ago</span><span>this week</span></div>
                </section>
            </div>

            {/* Diary */}
            <section className="rounded-3xl bg-white ring-1 ring-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-2 flex justify-between items-baseline">
                    <h4 className="font-semibold text-gray-900 text-lg">Flock diary</h4>
                    <span className="text-xs text-gray-500">everything that happened</span>
                </div>
                {diary.length === 0 ? (
                    <p className="px-4 pb-4 text-sm text-gray-500">Weigh-ins, sales, losses, medicines and expenses will appear here.</p>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {(showAllDiary ? diary : diary.slice(0, 6)).map(e => {
                            const [title, sub] = describe(e);
                            return (
                                <li key={e.key} className="flex items-center gap-3 px-4 py-2.5">
                                    <span className="text-xl w-7 text-center">{e.emoji}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-bold text-gray-900 truncate">{title}</span>
                                        <span className="block text-xs text-gray-500 truncate">{sub}</span>
                                    </span>
                                    <span className="text-right text-[11px] text-gray-400 whitespace-nowrap">
                                        {formatDate(e.date, { day: 'numeric', month: 'short' })}<br />{relativeDay(e.date)}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {diary.length > 6 && (
                    <button onClick={() => setShowAllDiary(v => !v)} className="w-full py-2.5 text-sm font-bold text-forest bg-gray-50 hover:bg-gray-100">
                        {showAllDiary ? 'Show less' : `Show all ${diary.length}`}
                    </button>
                )}
            </section>

            {financials.sharedTotal > 0 && (
                <p className="text-xs text-amber-800 bg-amber-50 rounded-2xl px-3 py-2">Cost per bird uses batch costs only. Shared farm costs add {rupees(financials.sharedPerAnimal)} per bird — see the Shared farm costs card.</p>
            )}
        </div>
    );
};

export default PoultryFlockOverview;

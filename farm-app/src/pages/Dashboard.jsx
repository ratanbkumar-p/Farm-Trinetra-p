import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, AlertTriangle, Clock, CalendarX, PackageX, Stethoscope, CheckCircle2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { useModules } from '../lib/useSections';
import { ANIMAL_EMOJI } from '../lib/navigation';
import { batchOwnCosts } from '../lib/costing';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import { formatDate, relativeDay, reasonEmoji, rupees } from '../components/livestock/livestockUtils';
import EggTrackerPage from './EggTrackerPage';

// --- Emoji Mappings ---
const VEGETABLE_EMOJIS = {
    'spinach': '🥬', 'palak': '🥬', 'lettuce': '🥬', 'cabbage': '🥬', 'kale': '🥬',
    'methi': '🌿', 'fenugreek': '🌿', 'coriander': '🌿', 'dhania': '🌿', 'mint': '🌿', 'pudina': '🌿',
    'carrot': '🥕', 'gajar': '🥕',
    'potato': '🥔', 'aloo': '🥔',
    'radish': '🫚', 'mooli': '🫚',
    'beetroot': '🫒', 'onion': '🧅', 'pyaz': '🧅', 'garlic': '🧄', 'lahsun': '🧄',
    'ginger': '🫚', 'adrak': '🫚',
    'tomato': '🍅', 'tamatar': '🍅',
    'brinjal': '🍆', 'eggplant': '🍆', 'baingan': '🍆',
    'cucumber': '🥒', 'kheera': '🥒', 'kakdi': '🥒',
    'pepper': '🌶️', 'mirch': '🌶️', 'chilli': '🌶️', 'capsicum': '🫑', 'shimla': '🫑',
    'corn': '🌽', 'makai': '🌽', 'makka': '🌽',
    'pumpkin': '🎃', 'kaddu': '🎃',
    'cauliflower': '🥦', 'gobi': '🥦', 'broccoli': '🥦',
    'peas': '🫛', 'matar': '🫛',
    'beans': '🫘', 'sem': '🫘',
    'okra': '🥒', 'bhindi': '🥒', 'ladyfinger': '🥒',
    'bottle gourd': '🥒', 'lauki': '🥒', 'gourd': '🥒',
    'bitter gourd': '🥒', 'karela': '🥒',
    'ridge gourd': '🥒', 'turai': '🥒',
    'mushroom': '🍄',
    'moringa': '🌿', 'drumstick': '🌿', 'sahjan': '🌿',
    'curry leaves': '🌿', 'kadipatta': '🌿', 'neem': '🌿',
    'tulsi': '🌿', 'basil': '🌿',
    'default': '🥬'
};

const FRUIT_EMOJIS = {
    'apple': '🍎', 'seb': '🍎',
    'banana': '🍌', 'kela': '🍌',
    'orange': '🍊', 'santra': '🍊', 'narangi': '🍊',
    'mango': '🥭', 'aam': '🥭',
    'grape': '🍇', 'angoor': '🍇',
    'watermelon': '🍉', 'tarbooz': '🍉',
    'strawberry': '🍓',
    'pineapple': '🍍', 'ananas': '🍍',
    'coconut': '🥥', 'nariyal': '🥥',
    'lemon': '🍋', 'nimbu': '🍋', 'lime': '🍋',
    'peach': '🍑', 'aadu': '🍑',
    'pear': '🍐', 'nashpati': '🍐',
    'cherry': '🍒',
    'papaya': '__PAPAYA__', 'papita': '__PAPAYA__',
    'guava': '__GUAVA__', 'amrud': '__GUAVA__',
    'pomegranate': '🫐', 'anar': '🫐',
    'fig': '🫐', 'anjeer': '🫐',
    'moringa': '🌿', 'drumstick': '🌿', 'sahjan': '🌿',
    'curry': '🌿', 'neem': '🌿', 'tulsi': '🌿', 'basil': '🌿',
    'default': '🍎'
};

const getEmojiForCrop = (name, type) => {
    const lowerName = (name || '').toLowerCase().trim();
    const emojiMap = type === 'Vegetables' ? VEGETABLE_EMOJIS : FRUIT_EMOJIS;
    if (emojiMap[lowerName]) return emojiMap[lowerName];
    for (const [key, emoji] of Object.entries(emojiMap)) {
        if (lowerName.includes(key) || key.includes(lowerName)) return emoji;
    }
    return emojiMap['default'];
};

const renderCropEmoji = (name, type, sizeClass = 'text-2xl') => {
    const emojiStr = getEmojiForCrop(name, type);
    if (emojiStr === '__GUAVA__') return <img src="/emojis/guava.svg" alt="guava" style={{ width: '1.3em', height: '1.3em', display: 'inline-block', verticalAlign: 'middle' }} />;
    if (emojiStr === '__PAPAYA__') return <img src="/emojis/papaya.svg" alt="papaya" style={{ width: '1.3em', height: '1.3em', display: 'inline-block', verticalAlign: 'middle' }} />;
    return <span className={sizeClass}>{emojiStr}</span>;
};

// --- Small building blocks ---

const Card = ({ children, className = '' }) => (
    <section className={`rounded-3xl bg-white ring-1 ring-gray-200 shadow-sm ${className}`}>{children}</section>
);

const CardHeader = ({ title, action, onAction }) => (
    <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-2">
        <h2 className="font-semibold text-gray-900 text-lg">{title}</h2>
        {action && (
            <button onClick={onAction} className="flex items-center gap-0.5 text-sm font-bold text-forest">
                {action} <ChevronRight className="w-4 h-4" />
            </button>
        )}
    </div>
);

const Row = ({ emoji, title, subtitle, right, rightTone = 'text-gray-900', onClick }) => (
    <button onClick={onClick} disabled={!onClick} className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left hover:bg-gray-50 disabled:hover:bg-transparent disabled:cursor-default">
        <span className="grid place-items-center w-10 h-10 rounded-2xl bg-straw text-xl shrink-0">{emoji}</span>
        <span className="min-w-0 flex-1">
            <span className="block font-bold text-gray-900 truncate">{title}</span>
            {subtitle && <span className="block text-xs text-gray-500 truncate">{subtitle}</span>}
        </span>
        {right !== undefined && <span className={`text-right font-bold whitespace-nowrap ${rightTone}`}>{right}</span>}
        {onClick && <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />}
    </button>
);

const HERD_NAMES = { Goat: 'Goats', Sheep: 'Sheep', Cow: 'Cows', Poultry: 'Poultry' };
const HERD_TONES = {
    Goat: 'from-amber-50 ring-amber-200',
    Sheep: 'from-violet-50 ring-violet-200',
    Poultry: 'from-green-50 ring-green-200',
    Cow: 'from-sky-50 ring-sky-200'
};

/** One animal type at a glance: headcount, health split, this month's sales/losses and money */
const HerdCard = ({ herd, eggs, onOpen }) => {
    const healthy = herd.alive - herd.sick;
    const mortality = herd.total ? (herd.lost / herd.total) * 100 : 0;
    const segments = [
        { n: healthy, cls: 'bg-green-500', label: 'healthy' },
        { n: herd.sick, cls: 'bg-orange-400', label: 'sick' },
        { n: herd.sold, cls: 'bg-sky-400', label: 'sold' },
        { n: herd.lost, cls: 'bg-red-400', label: 'lost' }
    ];
    return (
        <motion.button
            type="button"
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpen}
            className={`group h-full flex flex-col justify-between gap-3 text-left rounded-3xl bg-gradient-to-br ${HERD_TONES[herd.type] || 'from-gray-50 ring-gray-200'} to-white ring-1 shadow-sm hover:shadow-lg p-4`}
        >
            <div className="flex items-center gap-3">
                <span className="grid place-items-center w-12 h-12 rounded-2xl bg-white shadow-sm text-3xl group-hover:animate-wiggle">{ANIMAL_EMOJI[herd.type] || '🐾'}</span>
                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg leading-tight">{HERD_NAMES[herd.type] || herd.type}</h3>
                    <p className="text-xs text-gray-500 truncate">{herd.batches.length === 1 ? herd.batches[0] : `${herd.batches.length} batches`}</p>
                </div>
                <div className="text-right">
                    <p className="font-display text-3xl font-semibold text-forest leading-none"><AnimatedNumber value={herd.alive} /></p>
                    <p className="text-[10px] font-bold uppercase text-gray-400">alive</p>
                </div>
            </div>

            <div>
                <div className="flex h-2.5 rounded-full overflow-hidden bg-white ring-1 ring-black/5" title={segments.map(sg => `${sg.n} ${sg.label}`).join(' · ')}>
                    {segments.map(sg => sg.n > 0 && (
                        <motion.span key={sg.label} className={sg.cls} initial={{ width: 0 }} animate={{ width: `${(sg.n / (herd.total || 1)) * 100}%` }} transition={{ type: 'spring', stiffness: 90, damping: 18, delay: 0.1 }} />
                    ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-green-700">🌿 {healthy} healthy</span>
                    {herd.sick > 0 && <span className="rounded-full bg-white/80 px-2 py-0.5 text-orange-700">🤒 {herd.sick} sick</span>}
                    <span className={`rounded-full bg-white/80 px-2 py-0.5 ${mortality >= 7 ? 'text-red-600' : 'text-gray-600'}`}>🕊️ {mortality.toFixed(1)}% lost</span>
                    {eggs !== undefined && <span className="rounded-full bg-white/80 px-2 py-0.5 text-amber-700">🥚 {eggs} eggs</span>}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 no-entrance">
                <div className="rounded-2xl bg-white/80 px-2.5 py-2">
                    <p className="text-[9px] font-bold uppercase text-gray-400">Invested</p>
                    <p className="text-sm font-bold text-gray-900">{rupees(herd.invested)}</p>
                </div>
                <div className="rounded-2xl bg-white/80 px-2.5 py-2">
                    <p className="text-[9px] font-bold uppercase text-gray-400">Sold · month</p>
                    <p className="text-sm font-bold text-green-700">{herd.soldThisMonth ? rupees(herd.salesThisMonth) : '—'}</p>
                </div>
                <div className="rounded-2xl bg-white/80 px-2.5 py-2">
                    <p className="text-[9px] font-bold uppercase text-gray-400">Lost · month</p>
                    <p className={`text-sm font-bold ${herd.lostThisMonth ? 'text-red-600' : 'text-gray-900'}`}>{herd.lostThisMonth}</p>
                </div>
            </div>
            <p className="text-[11px] text-gray-500 truncate">
                {herd.lastSale ? `Last sale ${relativeDay(herd.lastSale).toLowerCase()}` : 'No sales yet'}
                {herd.lastDeath ? ` · last loss ${relativeDay(herd.lastDeath).toLowerCase()}` : ''}
            </p>
        </motion.button>
    );
};

// "Needs attention" is always the same checklist: each line is either a problem to tap or a green tick
const CHECKS = [
    { group: 'meds', ok: 'Vaccines & medicines on schedule' },
    { group: 'sick', ok: 'No animals in the sick bay' },
    { group: 'dates', ok: 'Every death has a date' },
    { group: 'stock', ok: 'Medicine stock is fine' }
];

const monthKeyNow = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// --- Home ---

const Dashboard = () => {
    const { data } = useData();
    const { settings } = useSettings();
    const { user } = useAuth();
    const { openSell } = useUI();
    const modules = useModules();
    const navigate = useNavigate();
    const [isEggTrackerOpen, setIsEggTrackerOpen] = useState(false);

    const monthKey = monthKeyNow();
    const inMonth = (iso) => (iso || '').slice(0, 7) === monthKey;

    // --- This month's money: every rupee spent, no matter where it is booked ---
    const month = useMemo(() => {
        const globalIds = new Set((data.expenses || []).map(e => e.id));
        let linked = 0;
        let general = 0;
        (data.expenses || []).forEach(e => {
            if (!inMonth(e.date)) return;
            const amt = Number(e.amount) || 0;
            if (e.batchId || e.cropId || e.fruitId) linked += amt; else general += amt;
        });
        // Older batch expenses that only live inside the batch document
        (data.batches || []).forEach(b => (b.expenses || []).forEach(e => {
            if (!globalIds.has(e.id) && inMonth(e.date)) linked += Number(e.amount) || Number(e.cost) || 0;
        }));

        const [y, m] = monthKey.split('-').map(Number);
        const monthEnd = new Date(y, m, 0, 23, 59, 59);
        const salaries = (data.employees || [])
            .filter(e => e.status === 'Active' && new Date(e.employedSince || e.createdAt || 0) <= monthEnd)
            .reduce((s, e) => s + (Number(e.salary) || 0), 0);
        const yearly = (data.yearlyExpenses || [])
            .filter(e => !e.startDate || new Date(e.startDate) <= monthEnd)
            .reduce((s, e) => s + (Number(e.monthlyAmount) || (Number(e.amount) || 0) / 12), 0);

        let sales = 0;
        (data.batches || []).forEach(b => (b.animals || []).forEach(a => {
            if (a.status === 'Sold' && inMonth(a.soldDate)) sales += Number(a.soldPrice) || 0;
        }));
        if (modules.crops) (data.crops || []).forEach(c => (c.sales || []).forEach(s => { if (inMonth(s.date)) sales += Number(s.amount) || 0; }));
        if (modules.fruits) (data.fruits || []).forEach(f => (f.sales || []).forEach(s => { if (inMonth(s.date)) sales += Number(s.amount) || 0; }));
        (data.eggLogs || []).forEach(l => { if (l.type === 'Sold' && inMonth(l.date)) sales += Number(l.revenue) || 0; });

        const total = linked + general + salaries + yearly;
        const topSpends = (data.expenses || [])
            .filter(e => inMonth(e.date))
            .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
            .slice(0, 3);
        return { linked, general, salaries, yearly, total, sales, topSpends };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, monthKey, modules.crops, modules.fruits]);

    // --- Animals by type ---
    const herds = useMemo(() => {
        const map = new Map();
        (data.batches || []).filter(b => b.status !== 'Completed' && b.status !== 'Archived').forEach(b => {
            const type = b.type === 'Chicken' ? 'Poultry' : b.type;
            if (!map.has(type)) map.set(type, { type, batches: [], alive: 0, sick: 0, total: 0, sold: 0, lost: 0, lostThisMonth: 0, soldThisMonth: 0, salesThisMonth: 0, invested: 0, lastSale: '', lastDeath: '' });
            const h = map.get(type);
            h.batches.push(b.name);
            h.invested += batchOwnCosts(b).totalInvested;
            (b.animals || []).forEach(a => {
                h.total += 1;
                if (a.status === 'Deceased') {
                    h.lost += 1;
                    if (inMonth(a.deceasedDate)) h.lostThisMonth += 1;
                    if ((a.deceasedDate || '') > h.lastDeath) h.lastDeath = a.deceasedDate;
                    return;
                }
                if (a.status === 'Sold') {
                    h.sold += 1;
                    if (inMonth(a.soldDate)) { h.soldThisMonth += 1; h.salesThisMonth += Number(a.soldPrice) || 0; }
                    if ((a.soldDate || '') > h.lastSale) h.lastSale = a.soldDate;
                    return;
                }
                h.alive += 1;
                if (a.status === 'Sick') h.sick += 1;
            });
        });
        const order = ['Sheep', 'Goat', 'Poultry', 'Cow'];
        const rank = (t) => (order.indexOf(t) === -1 ? order.length : order.indexOf(t));
        return Array.from(map.values()).sort((a, b) => rank(a.type) - rank(b.type));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.batches, monthKey]);

    const eggsInStock = useMemo(() => {
        const sum = (t) => (data.eggLogs || []).filter(l => l.type === t).reduce((s, l) => s + (Number(l.quantity) || 0), 0);
        return Math.max(0, sum('Collected') - sum('Hatched') - sum('Spoiled') - sum('Sold'));
    }, [data.eggLogs]);

    // --- Things that need attention ---
    const todo = useMemo(() => {
        const items = [];
        const today = new Date();
        (data.batches || []).forEach(batch => {
            if (batch.status === 'Completed' || batch.status === 'Archived') return;
            (settings?.scheduledMedications || []).forEach(med => {
                if (!med.name || med.name === 'New Medication') return;
                const days = parseInt(med.schedules?.[batch.type] || 0);
                if (!days) return;
                const rec = (batch.medical || []).filter(m => m.name === med.name || (med.name === 'Deworming' && m.type === 'De-worming'))
                    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
                const from = rec ? rec.date : (batch.startDate || batch.date);
                if (!from) return;
                const next = new Date(from);
                next.setDate(next.getDate() + days);
                const left = Math.ceil((next - today) / 86400000);
                if (left <= (med.notificationDays || 7)) {
                    items.push({ group: 'meds', key: `${batch.id}-${med.name}`, kind: left < 0 ? 'late' : 'soon', icon: left < 0 ? AlertTriangle : Clock, title: `${med.name} · ${batch.name}`, note: left < 0 ? `${-left} days late` : left === 0 ? 'due today' : `due in ${left} days`, to: '/livestock', state: { selectBatchId: batch.id } });
                }
            });
        });
        const undated = (data.batches || []).reduce((s, b) => s + (b.animals || []).filter(a => a.status === 'Deceased' && !a.deceasedDate).length, 0);
        const sick = (data.batches || []).filter(b => b.status !== 'Completed').reduce((s, b) => s + (b.animals || []).filter(a => a.status === 'Sick').length, 0);
        if (sick > 0) items.push({ group: 'sick', key: 'sick', kind: 'soon', icon: Stethoscope, title: `${sick} animal${sick === 1 ? '' : 's'} in the sick bay`, note: 'check treatment & record recoveries', to: '/livestock' });
        if (undated > 0) items.push({ group: 'dates', key: 'undated', kind: 'soon', icon: CalendarX, title: `${undated} deaths have no date`, note: 'tap to add the dates', to: '/livestock', state: { tab: 'deceased' } });
        (data.inventory || []).filter(i => Number(i.lowStockThreshold) > 0 && Number(i.quantity) <= Number(i.lowStockThreshold)).forEach(i => {
            items.push({ group: 'stock', key: `inv-${i.id}`, kind: 'soon', icon: PackageX, title: `${i.name} running low`, note: `${i.quantity} ${i.unit || ''} left`, to: '/inventory' });
        });
        return items.sort((a, b) => (a.kind === 'late' ? -1 : 0) - (b.kind === 'late' ? -1 : 0));
    }, [data.batches, data.inventory, settings]);

    // --- Recent activity: sales + deaths ---
    const activity = useMemo(() => {
        const events = new Map();
        (data.batches || []).forEach(b => (b.animals || []).forEach(a => {
            if (a.status === 'Sold' && a.soldDate) {
                const k = `s|${b.id}|${a.soldDate}`;
                const e = events.get(k) || { key: k, date: a.soldDate, kind: 'sale', batch: b, count: 0, amount: 0 };
                e.count += 1; e.amount += Number(a.soldPrice) || 0;
                events.set(k, e);
            } else if (a.status === 'Deceased' && a.deceasedDate) {
                const k = `d|${b.id}|${a.deceasedDate}|${a.deathReason}`;
                const e = events.get(k) || { key: k, date: a.deceasedDate, kind: 'death', batch: b, count: 0, reason: a.deathReason };
                e.count += 1;
                events.set(k, e);
            }
        }));
        return Array.from(events.values()).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    }, [data.batches]);

    const crops = useMemo(() => [
        ...(modules.crops ? (data.crops || []).filter(c => c.status === 'Growing').map(c => ({ ...c, kind: 'Vegetables' })) : []),
        ...(modules.fruits ? (data.fruits || []).filter(f => f.status === 'Growing').map(f => ({ ...f, kind: 'Fruits' })) : [])
    ], [data.crops, data.fruits, modules.crops, modules.fruits]);

    const firstName = (user?.displayName || '').split(' ')[0];
    const totalAlive = herds.reduce((s, h) => s + h.alive, 0);
    const actions = [
        { emoji: '💰', label: 'Sell', hint: 'animals or birds', onClick: () => openSell(), primary: true },
        { emoji: '💸', label: 'Add expense', hint: 'feed, medicine…', onClick: () => navigate('/expenses', { state: { openAdd: true } }) },
        { emoji: '🥚', label: 'Eggs', hint: `${eggsInStock} in stock`, onClick: () => setIsEggTrackerOpen(true) },
        { emoji: '🧮', label: 'Price check', hint: 'profit calculator', onClick: () => navigate('/calculator') }
    ];
    // Grid recipe for the "At a glance" row, picked by how many cards there are (month card + herds)
    const glanceCount = 1 + Math.max(1, herds.length);
    const glanceLayout = {
        2: 'md:grid-cols-2',
        3: 'md:grid-cols-2 xl:grid-cols-3 md:[&>*:first-child]:col-span-2 xl:[&>*:first-child]:col-span-1',
        4: 'md:grid-cols-2 xl:grid-cols-4',
        5: 'md:grid-cols-2 xl:grid-cols-3 md:[&>*:first-child]:col-span-2 xl:[&>*:first-child]:col-span-1 xl:[&>*:first-child]:row-span-2'
    }[Math.min(glanceCount, 5)];

    const parts = [
        [modules.crops || modules.fruits ? 'Batch & crop expenses' : 'Batch expenses', month.linked, 'bg-orange-400'],
        ['General expenses', month.general, 'bg-red-400'],
        ['Salaries', month.salaries, 'bg-sky-400'],
        ['Yearly bills ÷ 12', month.yearly, 'bg-violet-400']
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-5">
            {/* Greeting */}
            <div className="flex items-end justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    <h1 className="text-[1.75rem] sm:text-4xl text-forest leading-tight">Hi{firstName ? ` ${firstName}` : ''} 👋</h1>
                </div>
                <p className="text-sm font-bold text-gray-500 text-right">{totalAlive} animals<br className="sm:hidden" /> on the farm</p>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {actions.map(a => (
                    <motion.button
                        key={a.label}
                        whileTap={{ scale: 0.94 }}
                        whileHover={{ y: -2 }}
                        onClick={a.onClick}
                        className={`flex flex-col items-center sm:flex-row sm:items-center gap-1 sm:gap-3 rounded-3xl p-3 sm:p-4 text-center sm:text-left ring-1 shadow-sm ${a.primary ? 'bg-forest text-white ring-forest' : 'bg-white ring-gray-200'}`}
                    >
                        <span className={`grid place-items-center w-11 h-11 rounded-2xl text-2xl ${a.primary ? 'bg-white/15' : 'bg-straw'}`}>{a.emoji}</span>
                        <span className="min-w-0">
                            <span className={`block text-xs sm:text-base font-bold leading-tight ${a.primary ? '' : 'text-gray-900'}`}>{a.label}</span>
                            <span className={`hidden sm:block text-xs ${a.primary ? 'text-green-100' : 'text-gray-500'}`}>{a.hint}</span>
                        </span>
                    </motion.button>
                ))}
            </div>

            {/* At a glance: this month + one card per animal type. Columns follow the number
                of cards so every row is full — no empty holes. */}
            <section>
                <div className="flex items-center justify-between mb-2 px-1">
                    <h2 className="font-semibold text-gray-900 text-lg">At a glance</h2>
                    <button onClick={() => navigate('/livestock')} className="flex items-center gap-0.5 text-sm font-bold text-forest">All batches <ChevronRight className="w-4 h-4" /></button>
                </div>
                <div className={`grid grid-cols-1 gap-4 ${glanceLayout}`}>
                <Card className="h-full flex flex-col">
                    <CardHeader title={`${new Date().toLocaleDateString('en-IN', { month: 'long' })} so far`} action="Expenses" onAction={() => navigate('/expenses')} />
                    <div className="px-4 sm:px-5 pb-4 flex-1 flex flex-col">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-2xl bg-red-50 p-3">
                                <p className="text-[11px] font-bold uppercase text-red-700/70">Total expenses</p>
                                <p className="font-display text-2xl sm:text-3xl font-semibold text-red-600"><AnimatedNumber value={Math.round(month.total)} prefix="₹" /></p>
                            </div>
                            <div className="rounded-2xl bg-green-50 p-3">
                                <p className="text-[11px] font-bold uppercase text-green-700/70">Sales</p>
                                <p className="font-display text-2xl sm:text-3xl font-semibold text-green-700"><AnimatedNumber value={Math.round(month.sales)} prefix="₹" /></p>
                            </div>
                        </div>
                        <div className="mt-3 flex h-2.5 rounded-full overflow-hidden bg-gray-100">
                            {parts.map(([label, value, cls]) => value > 0 && (
                                <motion.span key={label} className={cls} initial={{ width: 0 }} animate={{ width: `${(value / (month.total || 1)) * 100}%` }} transition={{ type: 'spring', stiffness: 90, damping: 20 }} />
                            ))}
                        </div>
                        <ul className="mt-3 space-y-1.5">
                            {parts.map(([label, value, cls]) => (
                                <li key={label} className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2 text-gray-600"><span className={`w-2.5 h-2.5 rounded-full ${cls}`} />{label}</span>
                                    <span className="font-bold text-gray-900">{rupees(value)}</span>
                                </li>
                            ))}
                        </ul>
                        {herds.length >= 4 && month.topSpends.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-gray-100">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Biggest spends</p>
                                <ul className="space-y-2">
                                    {month.topSpends.map(e => (
                                        <li key={e.id} className="flex items-center gap-2.5">
                                            <span className="grid place-items-center w-8 h-8 rounded-xl bg-red-50 text-sm">🧾</span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-semibold text-gray-800 truncate">{e.description || e.category}</span>
                                                <span className="block text-[11px] text-gray-500">{e.category} · {formatDate(e.date, { day: 'numeric', month: 'short' })}</span>
                                            </span>
                                            <span className="text-sm font-bold text-red-600">{rupees(e.amount)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className={`mt-auto pt-3 flex items-center justify-between rounded-2xl px-3 py-2.5 ${month.sales - month.total >= 0 ? 'bg-sky-50 text-sky-800' : 'bg-amber-50 text-amber-900'}`}>
                            <span className="text-sm font-bold whitespace-nowrap">{month.sales - month.total >= 0 ? '📈 Net profit' : '📉 Net'}</span>
                            <span className="font-display text-lg font-semibold">{month.sales - month.total >= 0 ? '+' : '−'}{rupees(Math.abs(month.sales - month.total))}</span>
                        </div>
                    </div>
                </Card>


                    {herds.length === 0 ? (
                        <Card className="h-full">
                            <div className="h-full p-6 flex flex-col items-center justify-center text-center">
                                <span className="text-5xl animate-float">🐣</span>
                                <p className="mt-3 font-bold text-gray-900">No animals yet</p>
                                <p className="text-sm text-gray-500">Start a batch in Animals and it will show up here.</p>
                                <button onClick={() => navigate('/livestock')} className="mt-4 rounded-2xl bg-forest text-white px-4 py-2.5 text-sm font-bold">Go to Animals</button>
                            </div>
                        </Card>
                    ) : herds.map(h => (
                        <HerdCard key={h.type} herd={h} eggs={h.type === 'Poultry' ? eggsInStock : undefined} onOpen={() => navigate('/livestock')} />
                    ))}
                </div>
            </section>

            {/* To do, activity and crops — same idea: rows always filled */}
            <div className={`grid grid-cols-1 gap-4 ${crops.length > 0 ? 'md:grid-cols-2 xl:grid-cols-3 md:[&>*:last-child]:col-span-2 xl:[&>*:last-child]:col-span-1' : 'md:grid-cols-2'}`}>
                <Card className="h-full">
                    <CardHeader title="Needs attention" />
                    <ul className="px-3 pb-3 space-y-2">
                        {CHECKS.flatMap(check => {
                            const issues = todo.filter(t => t.group === check.group);
                            if (issues.length === 0) {
                                return [(
                                    <li key={check.group} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 bg-green-50/70 ring-1 ring-green-100">
                                        <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600" />
                                        <span className="text-sm font-semibold text-green-900">{check.ok}</span>
                                    </li>
                                )];
                            }
                            return issues.map(t => (
                                <li key={t.key}>
                                    <button
                                        onClick={() => navigate(t.to, t.state ? { state: { ...t.state, nonce: Date.now() } } : undefined)}
                                        className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left ring-1 ${t.kind === 'late' ? 'bg-red-50 ring-red-200' : 'bg-amber-50 ring-amber-200'}`}
                                    >
                                        <t.icon className={`w-5 h-5 shrink-0 ${t.kind === 'late' ? 'text-red-600' : 'text-amber-600'}`} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-bold text-gray-900 truncate">{t.title}</span>
                                            <span className="block text-xs text-gray-600">{t.note}</span>
                                        </span>
                                        <ArrowRight className="w-4 h-4 text-gray-400" />
                                    </button>
                                </li>
                            ));
                        })}
                    </ul>
                </Card>

                <Card className="h-full">
                    <CardHeader title="Recent activity" />
                    {activity.length === 0 ? (
                        <p className="px-5 pb-5 text-sm text-gray-500">Sales and losses will show up here.</p>
                    ) : (
                        <div className="divide-y divide-gray-100 pb-2">
                            {activity.map(e => (
                                <Row
                                    key={e.key}
                                    emoji={e.kind === 'sale' ? '💰' : reasonEmoji(e.reason)}
                                    title={e.kind === 'sale' ? `Sold ${e.count} · ${e.batch.name}` : `${e.count} lost · ${e.batch.name}`}
                                    subtitle={`${formatDate(e.date, { day: 'numeric', month: 'short' })} · ${relativeDay(e.date)}${e.kind === 'death' ? ` · ${e.reason || 'Unknown'}` : ''}`}
                                    right={e.kind === 'sale' ? `+${rupees(e.amount)}` : undefined}
                                    rightTone="text-green-700"
                                    onClick={() => navigate('/livestock', { state: { selectBatchId: e.batch.id, nonce: Date.now() } })}
                                />
                            ))}
                        </div>
                    )}
                </Card>

                {crops.length > 0 && (
                    <Card className="h-full">
                        <CardHeader title="Growing now" action="Crops" onAction={() => navigate(modules.crops ? '/vegetables' : '/fruits')} />
                        <div className="divide-y divide-gray-100 pb-2">
                            {crops.map(c => {
                                const revenue = (c.sales || []).reduce((s, x) => s + (Number(x.amount) || 0), 0);
                                return (
                                    <Row
                                        key={c.id}
                                        emoji={renderCropEmoji(c.name, c.kind, 'text-xl')}
                                        title={c.name}
                                        subtitle={c.plantedDate ? `Planted ${formatDate(c.plantedDate, { day: 'numeric', month: 'short' })}` : c.kind}
                                        right={revenue ? `+${rupees(revenue)}` : undefined}
                                        rightTone="text-green-700"
                                        onClick={() => navigate(c.kind === 'Vegetables' ? '/vegetables' : '/fruits', { state: c.kind === 'Vegetables' ? { selectCropId: c.id } : { selectFruitId: c.id } })}
                                    />
                                );
                            })}
                        </div>
                    </Card>
                )}
            </div>

            {isEggTrackerOpen && <EggTrackerPage onClose={() => setIsEggTrackerOpen(false)} />}
        </div>
    );
};

export default Dashboard;

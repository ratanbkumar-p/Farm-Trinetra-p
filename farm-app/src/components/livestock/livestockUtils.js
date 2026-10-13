export const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const isPoultryType = (type) => type === 'Poultry' || type === 'Chicken';

export const isAlive = (animal) => animal.status !== 'Sold' && animal.status !== 'Deceased';

export const DEATH_REASONS = [
    { id: 'Sickness', emoji: '🤒' },
    { id: 'Natural Causes', emoji: '🍂' },
    { id: 'Accident', emoji: '⚠️' },
    { id: 'Predator', emoji: '🐺' },
    { id: 'Heat Stress', emoji: '🌡️' },
    { id: 'Birth Complications', emoji: '🍼' },
    { id: 'Unknown', emoji: '❔' },
    { id: 'Other', emoji: '📝' }
];

export const reasonEmoji = (reason) => DEATH_REASONS.find(r => r.id === reason)?.emoji || '❔';

/** Numeric tail of an animal id (P1-CHJAN26-ABC-17 → 17) for "next N animals" picking */
export const animalSeq = (animal) => {
    const n = parseInt(String(animal.id).split('-').pop(), 10);
    return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
};

/** Parse a YYYY-MM-DD string as a local date (avoids the UTC off-by-one) */
export const parseISODate = (iso) => {
    if (!iso) return null;
    const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    if (!y || !m) return null;
    return new Date(y, m - 1, d || 1);
};

export const formatDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
    const d = parseISODate(iso);
    return d ? d.toLocaleDateString('en-IN', opts) : '';
};

export const formatMonth = (monthKey) => {
    const d = parseISODate(`${monthKey}-01`);
    return d ? d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : monthKey;
};

export const daysAgo = (iso) => {
    const d = parseISODate(iso);
    if (!d) return null;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Math.round((start - d) / 86400000);
};

export const relativeDay = (iso) => {
    const n = daysAgo(iso);
    if (n === null) return '';
    if (n === 0) return 'Today';
    if (n === 1) return 'Yesterday';
    if (n < 0) return `In ${-n} days`;
    if (n < 7) return `${n} days ago`;
    if (n < 60) return `${Math.round(n / 7)} wk ago`;
    return `${Math.round(n / 30)} mo ago`;
};

export const inPeriod = (iso, period) => {
    if (period === 'all') return true;
    const d = parseISODate(iso);
    if (!d) return false;
    const now = new Date();
    if (period === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    const months = period === '3m' ? 3 : period === '6m' ? 6 : 12;
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - months);
    return d >= cutoff;
};

export const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

/**
 * Collapse deceased animals into display records. Goats/sheep/cows are one record
 * per animal; poultry deaths in the same batch on the same day for the same reason
 * become one "12 birds" record.
 * Input animals need: id, batchId, batchName, batchType, deceasedDate, deathReason, deathNotes, trueCost.
 */
export const groupDeaths = (animals) => {
    const map = new Map();
    animals.forEach(a => {
        const poultry = isPoultryType(a.batchType);
        const date = a.deceasedDate || '';
        const reason = a.deathReason || 'Unknown';
        const key = poultry ? `${a.batchId}|${date}|${reason}` : `${a.batchId}|${a.id}`;
        if (!map.has(key)) {
            map.set(key, {
                key,
                batchId: a.batchId,
                batchName: a.batchName,
                batchType: a.batchType,
                batchColor: a.batchColor,
                poultry,
                ids: [],
                animals: [],
                date,
                reason,
                notes: a.deathNotes || '',
                loss: 0,
                sample: a
            });
        }
        const rec = map.get(key);
        rec.ids.push(a.id);
        rec.animals.push(a);
        rec.loss += Number(a.trueCost) || Number(a.purchaseCost) || 0;
        if (!rec.notes && a.deathNotes) rec.notes = a.deathNotes;
    });
    return Array.from(map.values())
        .map(r => ({
            ...r,
            count: r.ids.length,
            label: r.poultry ? `${r.ids.length} bird${r.ids.length === 1 ? '' : 's'}` : r.ids[0]
        }))
        .sort((x, y) => {
            if (!x.date && y.date) return -1; // undated first so they get fixed
            if (x.date && !y.date) return 1;
            return (y.date || '').localeCompare(x.date || '');
        });
};

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { getMonthsBetween, getCurrentMonthKey, wasEmployeeActiveInMonth } from './allocationUtils';

/*
 * Farm costing rules
 * ------------------
 * 1. A batch's OWN cost = what the animals cost + expenses linked to that batch.
 *    This is what Invested, Cost/animal, Break-even and Min. sell price use.
 * 2. SHARED farm costs = salaries + yearly bills (÷12) + general expenses that
 *    are not linked to any batch/crop/fruit. Each month that pool is split
 *    across the livestock batches alive that month, in proportion to the
 *    money tied up in each batch's animals (inventory value).
 *    Shared costs are shown on their own card and in the Profit Calculator —
 *    never silently mixed into the batch numbers.
 */

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const monthBounds = (monthKey) => {
    const [y, m] = monthKey.split('-').map(Number);
    return { start: ymd(new Date(y, m - 1, 1)), end: ymd(new Date(y, m, 0)) };
};

export const purchaseCostOf = (animal) => Number(animal.purchaseCost) || Number(animal.cost) || 0;

/** Animals on the farm during a month (arrived by month end, not gone before it started) */
const animalsPresentInMonth = (batch, monthKey) => {
    const { start, end } = monthBounds(monthKey);
    const batchStart = (batch.startDate || batch.date || batch.createdAt || '').slice(0, 10);
    return (batch.animals || []).filter(a => {
        const arrived = (a.boughtDate || batchStart || '').slice(0, 10);
        if (arrived && arrived > end) return false;
        if (a.status === 'Sold' && a.soldDate && a.soldDate < start) return false;
        if (a.status === 'Deceased' && a.deceasedDate && a.deceasedDate < start) return false;
        return true;
    });
};

/** Money tied up in a batch's animals during a month */
export const inventoryValueInMonth = (batch, monthKey) =>
    animalsPresentInMonth(batch, monthKey).reduce((sum, a) => sum + purchaseCostOf(a), 0);

/**
 * Weight used to share costs between animals: the purchase price, or — for animals
 * with no price (born on the farm, price never entered) — the average price of the
 * priced animals around them, so they still carry their fair share.
 */
const shareWeight = (animal, fallbackPrice) => purchaseCostOf(animal) || fallbackPrice || 1;
const averagePrice = (animals) => {
    const priced = animals.filter(a => purchaseCostOf(a) > 0);
    return priced.length ? priced.reduce((s, a) => s + purchaseCostOf(a), 0) / priced.length : 0;
};

/** The shared-cost pool that livestock carries for one month */
export const sharedPoolForMonth = (data, monthKey, modules = {}) => {
    const { end } = monthBounds(monthKey);
    const cropsOn = modules.crops !== false;
    const fruitsOn = modules.fruits !== false;

    let salaries = 0;
    // Active employees with no joining date on record are counted for every month
    (data.employees || []).filter(e => wasEmployeeActiveInMonth(e, monthKey) || (e.status === 'Active' && !e.employedSince && !e.createdAt)).forEach(emp => {
        const salary = Number(emp.salary) || 0;
        // Respect each employee's sector split; sectors that are switched off fall back to livestock
        const sectors = (emp.expenseAllocation?.length ? emp.expenseAllocation : ['Livestock'])
            .map(s => ((s === 'Vegetables' && !cropsOn) || (s === 'Fruits' && !fruitsOn) ? 'Livestock' : s));
        const livestockShare = sectors.filter(s => s === 'Livestock').length / sectors.length;
        salaries += salary * livestockShare;
    });

    let yearly = 0;
    (data.yearlyExpenses || []).forEach(exp => {
        const startsOn = (exp.startDate || '').slice(0, 10);
        if (startsOn && startsOn > end) return;
        yearly += Number(exp.monthlyAmount) || (Number(exp.amount) || 0) / 12;
    });

    let general = 0;
    (data.expenses || []).forEach(e => {
        if (e.batchId || e.cropId || e.fruitId) return;
        if ((e.date || '').slice(0, 7) !== monthKey) return;
        general += Number(e.amount) || 0;
    });

    return { salaries, yearly, general, total: salaries + yearly + general };
};

/** Split one month's pool across livestock batches by inventory value */
export const allocateSharedForMonth = (data, monthKey, modules) => {
    const pool = sharedPoolForMonth(data, monthKey, modules);
    const present = (data.batches || []).map(b => ({ batch: b, animals: animalsPresentInMonth(b, monthKey) })).filter(x => x.animals.length > 0);
    // Unpriced animals are valued like priced animals of the same kind (goat vs goat), else farm-wide
    const farmAverage = averagePrice(present.flatMap(x => x.animals));
    const largeAverage = averagePrice(present.filter(x => x.batch.type !== 'Poultry' && x.batch.type !== 'Chicken').flatMap(x => x.animals));
    const kind = (t) => (t === 'Chicken' ? 'Poultry' : t);
    const kindAverage = {};
    present.forEach(({ batch }) => {
        const k = kind(batch.type);
        if (kindAverage[k] === undefined) kindAverage[k] = averagePrice(present.filter(x => kind(x.batch.type) === k).flatMap(x => x.animals));
    });
    const values = present.map(({ batch, animals }) => ({
        batch,
        value: animals.reduce((s, a) => s + shareWeight(a, kindAverage[kind(batch.type)] || (kind(batch.type) === 'Poultry' ? farmAverage : largeAverage) || farmAverage), 0)
    }));
    const totalValue = values.reduce((s, x) => s + x.value, 0);
    const result = new Map();
    values.forEach(({ batch, value }) => {
        const percent = totalValue > 0 ? value / totalValue : 0;
        result.set(batch.id, { amount: pool.total * percent, percent, value });
    });
    return { pool, totalValue, byBatch: result };
};

/** Shared costs per batch since it started: { total, thisMonth, percentNow, months: [{month, amount, percent}] } */
export const computeSharedCosts = (data, modules) => {
    const batches = data.batches || [];
    const starts = batches
        .map(b => b.startDate || b.date || b.createdAt)
        .filter(Boolean)
        .map(d => String(d).slice(0, 10))
        .sort();
    const out = new Map(batches.map(b => [b.id, { total: 0, thisMonth: 0, percentNow: 0, months: [] }]));
    if (starts.length === 0) return { byBatch: out, poolThisMonth: sharedPoolForMonth(data, getCurrentMonthKey(), modules) };

    const current = getCurrentMonthKey();
    let poolThisMonth = null;
    getMonthsBetween(starts[0]).forEach(monthKey => {
        const { pool, byBatch } = allocateSharedForMonth(data, monthKey, modules);
        if (monthKey === current) poolThisMonth = pool;
        byBatch.forEach((share, batchId) => {
            const entry = out.get(batchId);
            if (!entry) return;
            entry.total += share.amount;
            entry.months.push({ month: monthKey, amount: share.amount, percent: share.percent });
            if (monthKey === current) {
                entry.thisMonth = share.amount;
                entry.percentNow = share.percent;
            }
        });
    });
    return { byBatch: out, poolThisMonth: poolThisMonth || sharedPoolForMonth(data, current, modules) };
};

/** Batch's own numbers (no shared costs) */
export const batchOwnCosts = (batch) => {
    const animals = batch?.animals || [];
    const totalAnimalCost = animals.reduce((s, a) => s + purchaseCostOf(a), 0);
    const batchExpenses = (batch?.expenses || []).reduce((s, e) => s + (Number(e.amount) || Number(e.cost) || 0), 0);
    return { animals, totalAnimalCost, batchExpenses, totalInvested: totalAnimalCost + batchExpenses };
};

/**
 * Cost of one animal, split into its parts. Batch expenses and shared costs are
 * spread across every animal the batch ever had, weighted by purchase price.
 */
export const animalCostBreakdown = (animal, batch, sharedTotal = 0) => {
    const { animals, batchExpenses } = batchOwnCosts(batch);
    const purchase = purchaseCostOf(animal);
    const fallback = averagePrice(animals);
    const totalWeight = animals.reduce((s, a) => s + shareWeight(a, fallback), 0);
    const weight = totalWeight > 0 ? shareWeight(animal, fallback) / totalWeight : 0;
    const batchShare = batchExpenses * weight;
    const sharedShare = sharedTotal * weight;
    return {
        purchase,
        batchShare,
        base: purchase + batchShare,
        sharedShare,
        full: purchase + batchShare + sharedShare
    };
};

/** React hook: memoised shared costs + helpers bound to the live data */
export const useCosting = () => {
    const { data } = useData();
    const { settings } = useSettings();
    const modules = settings?.modules;
    const shared = useMemo(() => computeSharedCosts(data, modules), [data, modules]);
    const margin = Number(settings?.marginPercentage) || 20;

    return useMemo(() => ({
        margin,
        poolThisMonth: shared.poolThisMonth,
        sharedFor: (batchId) => shared.byBatch.get(batchId) || { total: 0, thisMonth: 0, percentNow: 0, months: [] },
        costOf: (animal, batch) => animalCostBreakdown(animal, batch, shared.byBatch.get(batch?.id)?.total || 0)
    }), [shared, margin]);
};

// Monthly Allocation Calculation Utilities
// Calculates employee cost allocation to livestock batches (Goat, Sheep, Chicken only)

// Eligible batch types for allocation
export const ALLOCATION_ELIGIBLE_TYPES = ['Goat', 'Sheep', 'Chicken', 'Poultry'];

/**
 * Get total investment (purchase cost) for a batch
 */
export const getBatchInvestment = (batch) => {
    if (!batch?.animals || !Array.isArray(batch.animals)) return 0;
    return batch.animals.reduce((sum, animal) => {
        // Support multiple field names used historically
        const cost = Number(animal.purchaseCost) || Number(animal.cost) || Number(animal.boughtPrice) || 0;
        return sum + cost;
    }, 0);
};

/**
 * Check if a batch was active during a specific month
 * @param {Object} batch - The batch object
 * @param {string} monthKey - Month in YYYY-MM format
 */
export const wasBatchActiveInMonth = (batch, monthKey) => {
    if (!batch) return false;

    // Get batch start date
    const startDateStr = batch.startDate || batch.date || batch.createdAt;
    if (!startDateStr) return false;

    const startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime())) return false;

    const [year, month] = monthKey.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59); // Last day of month

    // Batch is active if it started before or during the month
    // and is not completed/archived before the month
    if (startDate > monthEnd) return false;

    // Check if batch is completed
    if (batch.status === 'Completed' || batch.status === 'Archived') {
        // If we have a completion date, check if it was before this month
        const completedDate = batch.completedAt ? new Date(batch.completedAt) : null;
        if (completedDate && completedDate < monthStart) return false;
    }

    return true;
};

/**
 * Check if an employee was active during a specific month
 * @param {Object} employee - The employee object
 * @param {string} monthKey - Month in YYYY-MM format
 */
export const wasEmployeeActiveInMonth = (employee, monthKey) => {
    if (!employee) return false;
    if (employee.status !== 'Active') return false;

    // Get employment start date
    const startDateStr = employee.employedSince || employee.createdAt;
    if (!startDateStr) return false;

    const startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime())) return false;

    const [year, month] = monthKey.split('-').map(Number);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    // Employee was active if they joined on or before the last day of the month
    return startDate <= monthEnd;
};

/**
 * Calculate prorated days for an employee in a month
 * @param {Object} employee - The employee object
 * @param {string} monthKey - Month in YYYY-MM format
 */
export const getEmployeeDaysInMonth = (employee, monthKey) => {
    const startDateStr = employee.employedSince || employee.createdAt;
    if (!startDateStr) return 0;

    const startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime())) return 0;

    const [year, month] = monthKey.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    // If employee started before this month, they get full month
    if (startDate < monthStart) return daysInMonth;

    // Otherwise, calculate days from start date to end of month
    const startDay = startDate.getDate();
    return Math.max(0, daysInMonth - startDay + 1);
};

/**
 * Calculate monthly allocation for all eligible batches
 * @param {Object} data - Data context data (batches, employees, yearlyExpenses)
 * @param {string} monthKey - Month in YYYY-MM format
 * @param {string} allocationMode - 'fullMonth' or 'prorated'
 * @returns {Array} Array of allocation objects per batch
 */
export const calculateMonthlyAllocations = (data, monthKey, allocationMode = 'fullMonth') => {
    const { batches, employees, yearlyExpenses = [] } = data;

    // Get eligible batches (Goat, Sheep, Chicken, Poultry that were active in this month)
    const eligibleBatches = batches.filter(b =>
        ALLOCATION_ELIGIBLE_TYPES.includes(b.type) &&
        wasBatchActiveInMonth(b, monthKey)
    );

    if (eligibleBatches.length === 0) return [];

    // Calculate total investment across eligible batches
    const batchInvestments = eligibleBatches.map(batch => ({
        batch,
        investment: getBatchInvestment(batch)
    }));

    const totalInvestment = batchInvestments.reduce((sum, bi) => sum + bi.investment, 0);
    if (totalInvestment === 0) return []; // Can't allocate without investment

    // Get active employees and their contribution for this month
    const activeEmployees = employees.filter(e => wasEmployeeActiveInMonth(e, monthKey));

    // Calculate total salary to allocate
    let totalSalaryToAllocate = 0;
    const employeeContributions = activeEmployees.map(emp => {
        const monthlySalary = Number(emp.salary) || 0;
        let contribution = monthlySalary;

        if (allocationMode === 'prorated') {
            const [year, month] = monthKey.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            const daysActive = getEmployeeDaysInMonth(emp, monthKey);
            contribution = (monthlySalary / daysInMonth) * daysActive;
        }

        totalSalaryToAllocate += contribution;

        return {
            id: emp.id,
            name: emp.name,
            monthlySalary,
            contribution: Math.round(contribution)
        };
    });

    // Calculate yearly expenses divided by 12 for monthly share
    const totalYearlyExpenses = yearlyExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    const monthlyExpenseShare = totalYearlyExpenses / 12;

    // Total pool to allocate = employee salaries + monthly share of yearly expenses
    const totalToAllocate = totalSalaryToAllocate + monthlyExpenseShare;

    if (totalToAllocate === 0) return [];

    // Allocate to each batch based on investment proportion
    const allocations = batchInvestments.map(({ batch, investment }) => {
        const proportion = investment / totalInvestment;
        const amount = Math.round(totalToAllocate * proportion);

        // Calculate per-employee share for this batch
        const employeeShares = employeeContributions.map(ec => ({
            id: ec.id,
            name: ec.name,
            share: Math.round(ec.contribution * proportion)
        }));

        return {
            batchId: batch.id,
            batchName: batch.name || batch.id,
            month: monthKey,
            amount,
            investment,
            proportion: Math.round(proportion * 100),
            employees: employeeShares,
            salaryComponent: Math.round(totalSalaryToAllocate * proportion),
            expenseComponent: Math.round(monthlyExpenseShare * proportion),
            calculatedAt: new Date().toISOString()
        };
    });

    return allocations;
};

/**
 * Get all months from a start date to now
 * @param {string} startDateStr - Start date string
 */
export const getMonthsBetween = (startDateStr, endDateStr = null) => {
    const start = new Date(startDateStr);
    const end = endDateStr ? new Date(endDateStr) : new Date();

    if (isNaN(start.getTime())) return [];

    const months = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);

    while (current <= end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        months.push(`${year}-${month}`);
        current.setMonth(current.getMonth() + 1);
    }

    return months;
};

/**
 * Get the current month key
 */
export const getCurrentMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Get the previous month key
 */
export const getPreviousMonthKey = () => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

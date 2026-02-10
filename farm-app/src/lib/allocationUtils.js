// Monthly Allocation Calculation Utilities
// Calculates employee cost allocation to livestock batches, fruits, and crops based on their assignment

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
 * Get total investment (seed/plant cost) for a Fruit
 */
export const getFruitInvestment = (fruit) => {
    return Number(fruit.seedCost) || 0;
};

/**
 * Get total investment (seed cost) for a Crop (Vegetable)
 */
export const getCropInvestment = (crop) => {
    return Number(crop.seedCost) || 0;
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
 * Check if a Fruit/Crop was active during a specific month
 */
export const wasCropActiveInMonth = (item, monthKey) => {
    if (!item) return false;
    const plantedDateStr = item.plantedDate || item.date || item.createdAt;
    if (!plantedDateStr) return false;

    const plantedDate = new Date(plantedDateStr);
    if (isNaN(plantedDate.getTime())) return false;

    const [year, month] = monthKey.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    if (plantedDate > monthEnd) return false;

    // If item is harvested/removed, check if it was active in this month
    if (item.status === 'Harvested' || item.status === 'Removed') {
        const endDate = item.harvestedDate || item.removedDate ? new Date(item.harvestedDate || item.removedDate) : null;
        if (endDate && endDate < monthStart) return false;
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
    // We consider 'Active' employees and employees who might have left but were active in this month
    // For simplicity, using current status check + employedSince check
    // Ideally should check exit date too

    if (employee.status !== 'Active') {
        // TODO: specific check for when they left
        // For now, only allocating active employees
        return false;
    }

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
 * Calculate monthly allocation for all eligible batches, fruits, and crops
 * @param {Object} data - Data context data (batches, crops, fruits, employees, yearlyExpenses)
 * @param {string} monthKey - Month in YYYY-MM format
 * @param {string} allocationMode - 'fullMonth' or 'prorated'
 * @returns {Array} Array of allocation objects per batch/fruit/crop
 */
export const calculateMonthlyAllocations = (data, monthKey, allocationMode = 'fullMonth') => {
    const { batches = [], crops = [], fruits = [], employees = [], yearlyExpenses = [] } = data;

    // 1. Identify Eligible Targets (Active in this month)
    const eligibleBatches = batches.filter(b =>
        ALLOCATION_ELIGIBLE_TYPES.includes(b.type) &&
        wasBatchActiveInMonth(b, monthKey)
    );

    const eligibleFruits = fruits.filter(f => wasCropActiveInMonth(f, monthKey));
    const eligibleVegetables = crops.filter(c => wasCropActiveInMonth(c, monthKey));

    // 2. Calculate Investment Pools
    const batchInvestments = eligibleBatches.map(batch => ({
        id: batch.id,
        type: 'Batch',
        name: batch.name || `Batch ${batch.id}`,
        investment: getBatchInvestment(batch),
        obj: batch
    }));
    const totalBatchInvestment = batchInvestments.reduce((sum, item) => sum + item.investment, 0);

    const fruitInvestments = eligibleFruits.map(fruit => ({
        id: fruit.id,
        type: 'Fruit',
        name: fruit.name,
        investment: getFruitInvestment(fruit),
        obj: fruit
    }));
    const totalFruitInvestment = fruitInvestments.reduce((sum, item) => sum + item.investment, 0);

    const vegInvestments = eligibleVegetables.map(crop => ({
        id: crop.id,
        type: 'Crop', // Represents Vegetables
        name: crop.name,
        investment: getCropInvestment(crop),
        obj: crop
    }));
    const totalVegInvestment = vegInvestments.reduce((sum, item) => sum + item.investment, 0);

    // 3. Process Employee Salaries
    const activeEmployees = employees.filter(e => wasEmployeeActiveInMonth(e, monthKey));

    let totalSalaryForLivestock = 0;
    let totalSalaryForFruits = 0;
    let totalSalaryForVegetables = 0;

    const allocations = [];

    activeEmployees.forEach(emp => {
        const monthlySalary = Number(emp.salary) || 0;
        let actualSalary = monthlySalary;

        if (allocationMode === 'prorated') {
            const [year, month] = monthKey.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            const daysActive = getEmployeeDaysInMonth(emp, monthKey);
            actualSalary = (monthlySalary / daysInMonth) * daysActive;
        }

        // Determine Sectors
        // Default to Livestock if no allocation specified
        const allocations = (emp.expenseAllocation && emp.expenseAllocation.length > 0)
            ? emp.expenseAllocation
            : ['Livestock'];

        const splitCount = allocations.length;
        const sharePerSector = actualSalary / splitCount;

        if (allocations.includes('Livestock')) {
            totalSalaryForLivestock += sharePerSector;
        }
        if (allocations.includes('Fruits')) {
            totalSalaryForFruits += sharePerSector;
        }
        if (allocations.includes('Vegetables')) {
            totalSalaryForVegetables += sharePerSector;
        }
    });

    // 4. Process Yearly Expenses (General OpEx)
    // NOTE: For now, we keep General OpEx allocated to Livestock to preserve historical logic
    // unless user requests it to be split too. Defaulting to Livestock Batches for stability.
    const totalYearlyExpenses = yearlyExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    const monthlyExpenseShare = totalYearlyExpenses / 12;

    // Add General OpEx to Livestock Pool
    const totalLivestockPool = totalSalaryForLivestock + monthlyExpenseShare;
    // Fruits and Veg only get Salary allocations for now
    const totalFruitPool = totalSalaryForFruits;
    const totalVegPool = totalSalaryForVegetables;

    // Helper to distribute pool to targets based on investment
    const distribute = (pool, targets, totalInvestment, salaryPool, expensePool) => {
        if (pool <= 0 || targets.length === 0 || totalInvestment <= 0) return;

        targets.forEach(target => {
            const proportion = target.investment / totalInvestment;
            const amount = Math.round(pool * proportion);

            allocations.push({
                targetId: target.id,
                targetType: target.type, // 'Batch', 'Fruit', 'Crop'
                batchId: target.type === 'Batch' ? target.id : undefined, // Legacy support
                batchName: target.name,
                month: monthKey,
                amount,
                investment: target.investment,
                proportion: Math.round(proportion * 100),
                salaryComponent: Math.round(salaryPool * proportion),
                expenseComponent: Math.round(expensePool * proportion),
                calculatedAt: new Date().toISOString()
            });
        });
    };

    // Execute Determinations
    distribute(totalLivestockPool, batchInvestments, totalBatchInvestment, totalSalaryForLivestock, monthlyExpenseShare);
    distribute(totalFruitPool, fruitInvestments, totalFruitInvestment, totalSalaryForFruits, 0);
    distribute(totalVegPool, vegInvestments, totalVegInvestment, totalSalaryForVegetables, 0);

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

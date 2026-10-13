/**
 * Sample farm used only in local development with `?qa_test=true&demo=1`.
 * Lets you click through every screen (including old death records with no
 * date) without touching Firestore. Writes stay in memory until reload.
 */
const iso = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const herd = (prefix, count, base) => Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    gender: i % 3 === 0 ? 'Male' : 'Female',
    weight: base.weight + (i % 5),
    purchaseCost: base.cost + (i % 4) * 500,
    status: 'Healthy',
    boughtDate: base.bought,
    age: base.age,
    category: base.category,
    weightHistory: [
        { date: base.bought, weight: base.weight + (i % 5) - 3 },
        { date: iso(30), weight: base.weight + (i % 5) - 1 },
        { date: iso(5), weight: base.weight + (i % 5) }
    ]
}));

export const buildDemoFarm = () => {
    // Goats: adults + kids, a couple sick, two sold, one dated death and one legacy death (no date)
    const goats = [
        ...herd('G1-GTJULF26-A', 6, { weight: 28, cost: 9000, bought: iso(95), age: '1 Year 6 Months', category: 'Adult' }),
        ...herd('G1-GTJULF26-K', 8, { weight: 12, cost: 4500, bought: iso(95), age: '5 Months', category: 'Kid' })
    ];
    goats[2].status = 'Sick';
    goats[9].status = 'Sick';
    Object.assign(goats[4], { status: 'Sold', soldPrice: 15500, soldDate: iso(20) });
    Object.assign(goats[5], { status: 'Sold', soldPrice: 14800, soldDate: iso(20) });
    Object.assign(goats[11], { status: 'Deceased', deceasedDate: iso(11), deathReason: 'Sickness', deathNotes: 'Bloating, vet called too late' });
    Object.assign(goats[13], { status: 'Deceased', deathReason: 'Sickness' }); // saved before dates existed

    const sheep = herd('S1-SHAUGF26-A', 8, { weight: 32, cost: 8000, bought: iso(70), age: '2 Years', category: 'Adult' });
    Object.assign(sheep[7], { status: 'Deceased', deceasedDate: iso(40), deathReason: 'Predator', deathNotes: 'Stray dogs at night' });

    const birds = Array.from({ length: 60 }, (_, i) => ({
        id: `P1-PLAUG26-KAD-${i + 1}`,
        gender: 'Both',
        weight: 1.4,
        purchaseCost: 120,
        status: 'Healthy',
        boughtDate: iso(60),
        age: '2 Months',
        category: 'Kid',
        weightHistory: [{ date: iso(60), weight: 0.3 }, { date: iso(25), weight: 0.9 }, { date: iso(3), weight: 1.4 }]
    }));
    birds.slice(0, 6).forEach(b => Object.assign(b, { status: 'Deceased', deathReason: 'Sickness' })); // legacy, no date
    birds.slice(6, 11).forEach(b => Object.assign(b, { status: 'Deceased', deceasedDate: iso(5), deathReason: 'Heat Stress' }));
    birds.slice(11, 21).forEach(b => Object.assign(b, { status: 'Sold', soldPrice: 420, soldDate: iso(8) }));
    birds.slice(21, 25).forEach(b => { b.status = 'Sick'; });

    const batches = [
        {
            id: 'Goat-1', shortId: 'G1', name: 'Diwali Goats', type: 'Goat', startDate: iso(95), status: 'Raising', color: '#F59E0B',
            animals: goats,
            expenses: [
                { id: 'DGX01', type: 'Feed', description: 'Green fodder', amount: 6500, date: iso(40) },
                { id: 'DGX02', type: 'Medicine', description: 'Dewormer', amount: 1200, date: iso(25) }
            ],
            medical: [
                { id: 'm1', date: iso(30), type: 'Vaccination', name: 'PPR', cost: 900, notes: 'Dr. Ramesh', animalIds: goats.slice(0, 10).map(a => a.id) }
            ],
            createdAt: new Date().toISOString()
        },
        {
            id: 'Sheep-1', shortId: 'S1', name: 'Monsoon Sheep', type: 'Sheep', startDate: iso(70), status: 'Raising', color: '#8B5CF6',
            animals: sheep, expenses: [{ id: 'DSX01', type: 'Feed', description: 'Concentrate', amount: 3200, date: iso(15) }], medical: [],
            createdAt: new Date().toISOString()
        },
        {
            id: 'Poultry-1', shortId: 'P1', name: 'Kadaknath Flock', type: 'Poultry', startDate: iso(60), status: 'Raising', color: '#10B981',
            animals: birds, expenses: [{ id: 'DPX01', type: 'Feed', description: 'Starter feed', amount: 4800, date: iso(30) }], medical: [],
            createdAt: new Date().toISOString()
        },
        {
            id: 'Cow-1', shortId: 'C1', name: 'Gir Cows', type: 'Cow', startDate: iso(150), status: 'Raising', color: '#0EA5E9',
            animals: herd('C1-CWMAYF26-A', 3, { weight: 320, cost: 55000, bought: iso(150), age: '3 Years', category: 'Adult' }),
            expenses: [{ id: 'DCX01', type: 'Feed', description: 'Green fodder & bran', amount: 9000, date: iso(20) }], medical: [],
            createdAt: new Date().toISOString()
        },
        {
            id: 'Goat-2', shortId: 'G2', name: 'Bakrid Goats 2026', type: 'Goat', startDate: iso(240), status: 'Completed', color: '#3B82F6',
            animals: herd('G2-GTFEBM26-A', 4, { weight: 30, cost: 8500, bought: iso(240), age: '1 Year', category: 'Adult' })
                .map((a, i) => ({ ...a, status: 'Sold', soldPrice: 16000 + i * 400, soldDate: iso(150) })),
            expenses: [], medical: [], createdAt: new Date().toISOString()
        }
    ];

    return {
        batches,
        expenses: [
            { id: 'DGX01', category: 'Feed', description: 'Green fodder', amount: 6500, date: iso(40), batchId: 'Goat-1' },
            { id: 'DGX02', category: 'Medicine', description: 'Dewormer', amount: 1200, date: iso(25), batchId: 'Goat-1' },
            { id: 'DSX01', category: 'Feed', description: 'Concentrate', amount: 3200, date: iso(15), batchId: 'Sheep-1' },
            { id: 'DPX01', category: 'Feed', description: 'Starter feed', amount: 4800, date: iso(30), batchId: 'Poultry-1' },
            { id: 'DCX01', category: 'Feed', description: 'Green fodder & bran', amount: 9000, date: iso(20), batchId: 'Cow-1' },
            { id: 'GEN01', category: 'Electricity', description: 'Farm power bill', amount: 2400, date: iso(3) },
            { id: 'GEN02', category: 'Transport', description: 'Tractor diesel', amount: 1800, date: iso(1) }
        ],
        yearlyExpenses: [{ id: 'YE1', name: 'Land lease', category: 'Lease', amount: 60000, monthlyAmount: 5000, startDate: iso(200) }],
        employees: [
            { id: 'EMP1', name: 'Raju', role: 'Herdsman', salary: 12000, status: 'Active', employedSince: iso(300), payments: [] },
            { id: 'EMP2', name: 'Lakshmi', role: 'Poultry care', salary: 10000, status: 'Active', employedSince: iso(120), payments: [] }
        ],
        crops: [
            { id: 'C1', name: 'Tomato', status: 'Growing', plantedDate: iso(50), seedCost: 3000, sales: [{ id: 'S1', date: iso(4), quantity: 120, amount: 4800 }], expenses: [] },
            { id: 'C2', name: 'Spinach', status: 'Growing', plantedDate: iso(20), seedCost: 800, sales: [], expenses: [] }
        ],
        fruits: [
            { id: 'F1', name: 'Mango', status: 'Growing', plantedDate: iso(400), seedCost: 15000, sales: [{ id: 'FS1', date: iso(100), quantity: 300, amount: 21000 }], expenses: [] }
        ],
        invoices: [],
        inventory: [
            { id: 'INV1', name: 'Ivermectin', category: 'Medicine', quantity: 2, unit: 'bottles', lowStockThreshold: 3 },
            { id: 'INV2', name: 'PPR vaccine', category: 'Vaccine', quantity: 10, unit: 'doses', lowStockThreshold: 5 }
        ],
        contacts: [{ id: 'CNT1', name: 'Dr. Ramesh', phone: '9876543210', location: 'Nirmal', type: 'Doctor' }],
        farmContacts: [
            { id: 'FC1', name: 'Suresh Yadav', phone: '9848012345', groupId: 'GRP1', rate: '₹500/day', notes: 'Comes Mon–Sat' },
            { id: 'FC2', name: 'Imran Traders', phone: '9988776655', groupId: 'GRP2', notes: 'Buys goats before festivals' },
            { id: 'FC3', name: 'Lakshmi Feeds', phone: '9123456780', groupId: 'GRP3', rate: '₹28/kg' }
        ],
        contactGroups: [
            { id: 'GRP1', name: 'Labour', emoji: '👷' },
            { id: 'GRP2', name: 'Buyers', emoji: '🤝' },
            { id: 'GRP3', name: 'Feed suppliers', emoji: '🌾' }
        ],
        eggLogs: [
            { id: 'EGG1', type: 'Collected', quantity: 140, date: iso(6) },
            { id: 'EGG2', type: 'Sold', quantity: 90, revenue: 1350, date: iso(2) }
        ]
    };
};

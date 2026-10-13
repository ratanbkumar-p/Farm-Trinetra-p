import {
    LayoutDashboard,
    PawPrint,
    Sprout,
    Apple,
    Wallet,
    Users,
    Package,
    FileText,
    Settings,
    Phone,
    Calculator
} from 'lucide-react';

/**
 * Single source of truth for every section of the app.
 * Used by the top navbar, the mobile tab bar + "More" sheet, Quick Jump,
 * the Farm Guide tour, page headers and dashboard shortcuts — so a newcomer
 * sees the same name, emoji, colour and one-line explanation everywhere.
 */
export const SECTIONS = [
    {
        id: 'dashboard',
        path: '/',
        label: 'Home',
        title: 'Farm Overview',
        emoji: '🏡',
        icon: LayoutDashboard,
        group: 'main',
        tone: 'green',
        blurb: 'Your whole farm at a glance — animals, crops, money and reminders.',
        tips: [
            'Cards update live as your team records work.',
            'Red reminders mean a vaccine or medicine is overdue.',
            'Tap any card to jump straight to that section.'
        ]
    },
    {
        id: 'livestock',
        path: '/livestock',
        label: 'Animals',
        title: 'Livestock',
        emoji: '🐐',
        icon: PawPrint,
        group: 'main',
        tone: 'amber',
        blurb: 'Batches of goats, sheep, poultry and cows — health, weight, sales and losses.',
        tips: [
            'Create a batch first, then add animals into it.',
            'Use “Record death” so the date and reason are saved for reports.',
            'Sold and Deceased tabs show history across every batch.'
        ]
    },
    {
        id: 'vegetables',
        path: '/vegetables',
        label: 'Crops',
        title: 'Agriculture',
        emoji: '🥬',
        icon: Sprout,
        group: 'main',
        module: 'crops',
        tone: 'green',
        blurb: 'Vegetable crops — planting, labour, pesticides and harvest sales.',
        tips: [
            'Add a crop when you plant it, then log labour and sprays as they happen.',
            'Record each harvest sale to see live profit per crop.'
        ]
    },
    {
        id: 'fruits',
        path: '/fruits',
        label: 'Fruits',
        title: 'Orchard',
        emoji: '🥭',
        icon: Apple,
        group: 'main',
        module: 'fruits',
        tone: 'red',
        blurb: 'Fruit trees and plants — care costs and harvest income.',
        tips: [
            'Each fruit keeps its own sales, labour and pesticide history.',
            'Mark a fruit as Harvested when the season is over.'
        ]
    },
    {
        id: 'expenses',
        path: '/expenses',
        label: 'Expenses',
        title: 'Expenses',
        emoji: '💸',
        icon: Wallet,
        group: 'money',
        tone: 'red',
        blurb: 'Every rupee spent — feed, medicine, transport, and yearly bills.',
        tips: [
            'Link an expense to a batch or crop so it counts in that profit.',
            'Yearly bills (lease, insurance) are split across 12 months automatically.'
        ]
    },
    {
        id: 'invoices',
        path: '/invoices',
        label: 'Invoices',
        title: 'Invoices',
        emoji: '🧾',
        icon: FileText,
        group: 'money',
        tone: 'blue',
        blurb: 'Create and download branded invoices for customers.',
        tips: ['Invoices download as PDFs you can share on WhatsApp.']
    },
    {
        id: 'calculator',
        path: '/calculator',
        label: 'Calculator',
        title: 'Profit Calculator',
        emoji: '🧮',
        icon: Calculator,
        group: 'money',
        tone: 'amber',
        blurb: 'Pick a batch and the animals you plan to sell — see every cost and the right price.',
        tips: [
            'Batch costs = what the animals cost + expenses added to that batch.',
            'Shared costs = salaries, rent and general bills, split by how much money each batch holds.',
            'The price ladder shows prices with and without shared costs at different margins.'
        ]
    },
    {
        id: 'employees',
        path: '/employees',
        label: 'Team',
        title: 'Employees',
        emoji: '🧑‍🌾',
        icon: Users,
        group: 'people',
        tone: 'blue',
        blurb: 'Your farm team — details, salaries and payments.',
        tips: ['Salaries are shared across active batches and crops as allocated costs.']
    },
    {
        id: 'inventory',
        path: '/inventory',
        label: 'Inventory',
        title: 'Vet Inventory',
        emoji: '💊',
        icon: Package,
        group: 'people',
        tone: 'violet',
        blurb: 'Medicines, vaccines and supplies in stock — with low-stock warnings.',
        tips: ['Load the starter kit to get common medicines in one tap.']
    },
    {
        id: 'contacts',
        path: '/contacts',
        label: 'Contacts',
        title: 'Contacts',
        emoji: '📞',
        icon: Phone,
        group: 'people',
        tone: 'blue',
        blurb: 'Farm people and vets in one place — tap to call or WhatsApp.',
        tips: [
            'Switch between Farm people and Vets with the buttons at the top.',
            'Create groups like “Buyers” or “Labour” to find people fast.',
            'The 📞 button is always in the top bar, on every page.'
        ]
    },
    {
        id: 'settings',
        path: '/settings',
        label: 'Settings',
        title: 'Settings',
        emoji: '⚙️',
        icon: Settings,
        group: 'system',
        tone: 'gray',
        blurb: 'Team access, medicine lists, margins and reminder schedules.',
        tips: ['Only the owner can invite people and change roles.']
    }
];

export const SECTION_GROUPS = [
    { id: 'main', label: 'Farm' },
    { id: 'money', label: 'Money' },
    { id: 'people', label: 'People & supplies' },
    { id: 'system', label: 'System' }
];

/** Colour recipes per tone, so every surface that shows a section looks consistent */
export const TONES = {
    green: { bg: 'bg-green-100', text: 'text-green-800', ring: 'ring-green-200', solid: 'bg-green-600', soft: 'from-green-50' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-800', ring: 'ring-amber-200', solid: 'bg-amber-500', soft: 'from-amber-50' },
    red: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-200', solid: 'bg-red-500', soft: 'from-red-50' },
    blue: { bg: 'bg-sky-100', text: 'text-sky-800', ring: 'ring-sky-200', solid: 'bg-sky-500', soft: 'from-sky-50' },
    violet: { bg: 'bg-violet-100', text: 'text-violet-800', ring: 'ring-violet-200', solid: 'bg-violet-500', soft: 'from-violet-50' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-800', ring: 'ring-teal-200', solid: 'bg-teal-500', soft: 'from-teal-50' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-700', ring: 'ring-gray-200', solid: 'bg-gray-600', soft: 'from-gray-50' }
};

export const getSection = (id) => SECTIONS.find(s => s.id === id);

/** Whether a section is switched on in Settings → Farm sections */
export const isSectionEnabled = (section, modules = {}) => !section?.module || modules[section.module] !== false;

export const getSectionForPath = (pathname) => {
    if (pathname === '/') return getSection('dashboard');
    return SECTIONS.find(s => s.path !== '/' && pathname.startsWith(s.path)) || null;
};

/** Sections that get a permanent slot in the mobile bottom bar (plus a "More" button) */
export const MOBILE_TABS = ['dashboard', 'livestock', 'contacts'];

/** Sections shown as pills in the desktop navbar; the rest live under "More" */
export const DESKTOP_PRIMARY = ['dashboard', 'livestock', 'vegetables', 'fruits', 'expenses'];

export const ANIMAL_EMOJI = {
    Goat: '🐐',
    Sheep: '🐑',
    Poultry: '🐔',
    Chicken: '🐔',
    Cow: '🐄'
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Search, Lightbulb } from 'lucide-react';
import Modal from '../ui/Modal';
import { useUI } from '../../context/UIContext';
import { TONES } from '../../lib/navigation';
import { useSections } from '../../lib/useSections';

const JOBS = [
    { emoji: '🐣', title: 'New animals arrived', steps: 'Animals → New batch → open it → Add animals' },
    { emoji: '🪦', title: 'An animal died', steps: 'Open the batch → Record death → pick the date & reason' },
    { emoji: '💰', title: 'Sold some animals', steps: 'Tap the 💰 Sell button → batch → animals → price & date' },
    { emoji: '🧮', title: 'What price should I ask?', steps: 'More → Profit Calculator → pick the batch & animals' },
    { emoji: '🌾', title: 'Spent money on feed', steps: 'Expenses → Add expense → link it to the batch' },
    { emoji: '💉', title: 'Gave a vaccine', steps: 'Open the batch → Medical → Add record' },
    { emoji: '🥚', title: 'Collected eggs', steps: 'Home → Egg tracker card → Log collection' }
];

const Hills = () => (
    <div className="relative h-40 rounded-3xl overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-straw">
        <motion.div
            className="absolute right-10 top-6 w-14 h-14 rounded-full bg-sun shadow-[0_0_60px_20px_rgba(255,194,60,0.55)]"
            animate={{ y: [6, 0, 6] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span className="absolute top-5 text-3xl animate-drift" style={{ animationDuration: '24s' }}>☁️</span>
        <span className="absolute top-12 text-2xl animate-drift" style={{ animationDuration: '34s', animationDelay: '-12s' }}>☁️</span>
        <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="absolute bottom-0 w-full h-24">
            <path d="M0 80 Q 80 30 170 70 T 400 60 V120 H0Z" fill="#82d896" />
            <path d="M0 100 Q 120 60 230 95 T 400 85 V120 H0Z" fill="#2ea44f" />
        </svg>
        <div className="absolute bottom-3 left-6 flex gap-3 text-3xl">
            <span className="animate-float">🐐</span>
            <span className="animate-float" style={{ animationDelay: '0.4s' }}>🐑</span>
            <span className="animate-float" style={{ animationDelay: '0.8s' }}>🐔</span>
        </div>
        <span className="absolute bottom-3 right-8 text-3xl origin-bottom animate-sway">🌻</span>
    </div>
);

/** First-run welcome tour; re-open any time from the ? button or profile menu */
const FarmGuide = () => {
    const { isGuideOpen, closeGuide, openQuickJump } = useUI();
    const sections = useSections();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1);

    const finish = () => {
        closeGuide();
        setStep(0);
    };

    const steps = [
        {
            title: 'Welcome to your farm 🌾',
            body: (
                <div className="space-y-4">
                    <Hills />
                    <p className="text-gray-600">
                        Trinetra Farms keeps every animal, crop, rupee and person in one place. This 30-second tour shows
                        you where things live — you can reopen it anytime from the <strong>?</strong> button.
                    </p>
                </div>
            )
        },
        {
            title: 'Your farm map 🗺️',
            body: (
                <div className="grid grid-cols-2 gap-2">
                    {sections.filter(s => s.id !== 'settings').map((s, i) => {
                        const tone = TONES[s.tone] || TONES.gray;
                        return (
                            <motion.button
                                key={s.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.035, type: 'spring', stiffness: 380, damping: 24 }}
                                onClick={() => { finish(); navigate(s.path); }}
                                className="flex gap-2.5 items-start text-left rounded-2xl p-2.5 ring-1 ring-gray-200 bg-white hover:ring-gray-300"
                            >
                                <span className={`shrink-0 grid place-items-center w-9 h-9 rounded-xl text-lg ${tone.bg}`}>{s.emoji}</span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-bold text-gray-900">{s.title}</span>
                                    <span className="block text-[11px] leading-snug text-gray-500 line-clamp-2">{s.blurb}</span>
                                </span>
                            </motion.button>
                        );
                    })}
                </div>
            )
        },
        {
            title: 'Everyday jobs ✅',
            body: (
                <ul className="space-y-2">
                    {JOBS.map((job, i) => (
                        <motion.li
                            key={job.title}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-3 rounded-2xl bg-gray-50 px-3 py-2.5"
                        >
                            <span className="text-2xl">{job.emoji}</span>
                            <span className="min-w-0">
                                <span className="block text-sm font-bold text-gray-900">{job.title}</span>
                                <span className="block text-xs text-gray-500">{job.steps}</span>
                            </span>
                        </motion.li>
                    ))}
                </ul>
            )
        },
        {
            title: 'Getting around 🧭',
            body: (
                <div className="space-y-3">
                    <div className="flex gap-3 rounded-2xl bg-gray-50 p-3">
                        <span className="text-2xl">📱</span>
                        <p className="text-sm text-gray-600"><strong>On your phone</strong>, the bar at the bottom has Home, Animals, a big <strong>💰 Sell</strong> button, Contacts and <strong>More</strong> for everything else.</p>
                    </div>
                    <div className="flex gap-3 rounded-2xl bg-gray-50 p-3">
                        <Search className="w-6 h-6 text-forest shrink-0" />
                        <p className="text-sm text-gray-600"><strong>Search</strong> (or press ⌘K) to jump straight to any batch, crop or page by typing its name.</p>
                    </div>
                    <div className="flex gap-3 rounded-2xl bg-gray-50 p-3">
                        <Lightbulb className="w-6 h-6 text-amber-500 shrink-0" />
                        <p className="text-sm text-gray-600">Every page has a <strong>“How this page works”</strong> button under its title with quick tips.</p>
                    </div>
                    <button
                        onClick={() => { finish(); openQuickJump(); }}
                        className="w-full rounded-2xl bg-forest text-white py-3 font-bold text-sm"
                    >
                        Try search now
                    </button>
                </div>
            )
        }
    ];

    const go = (delta) => {
        setDirection(delta);
        setStep(s => Math.min(steps.length - 1, Math.max(0, s + delta)));
    };

    const last = step === steps.length - 1;

    return (
        <Modal isOpen={isGuideOpen} onClose={finish} title={steps[step].title} subtitle={`Step ${step + 1} of ${steps.length}`} size="lg">
            <div className="min-h-[18rem] overflow-hidden">
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                    <motion.div
                        key={step}
                        custom={direction}
                        initial={{ opacity: 0, x: direction * 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: direction * -40 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    >
                        {steps[step].body}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
                <div className="flex gap-1.5">
                    {steps.map((_, i) => (
                        <motion.span
                            key={i}
                            animate={{ width: i === step ? 24 : 8, backgroundColor: i === step ? '#163d27' : '#d4ccbb' }}
                            className="h-2 rounded-full"
                        />
                    ))}
                </div>
                <div className="flex gap-2">
                    {step > 0 ? (
                        <button onClick={() => go(-1)} className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100">
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                    ) : (
                        <button onClick={finish} className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100">Skip</button>
                    )}
                    <button
                        onClick={() => (last ? finish() : go(1))}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-forest bg-sun shadow-[0_3px_0_#d48a06] hover:brightness-105"
                    >
                        {last ? 'Start farming' : 'Next'} {!last && <ArrowRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default FarmGuide;

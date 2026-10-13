import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CornerDownLeft } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useData } from '../../context/DataContext';
import { ANIMAL_EMOJI } from '../../lib/navigation';
import { useSections, useModules } from '../../lib/useSections';

const isLive = (a) => a.status !== 'Sold' && a.status !== 'Deceased';

/** ⌘K palette: jump to any section, batch, crop, fruit or team member by typing */
const QuickJump = () => {
    const { isQuickJumpOpen, closeQuickJump } = useUI();
    const { data } = useData();
    const sections = useSections();
    const modules = useModules();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [cursor, setCursor] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    const items = useMemo(() => {
        const list = [];
        sections.forEach(s => list.push({
            key: `section-${s.id}`, group: 'Go to', emoji: s.emoji, title: s.title, hint: s.blurb,
            search: `${s.title} ${s.label} ${s.blurb}`, to: s.path
        }));
        (data.batches || []).forEach(b => {
            const live = (b.animals || []).filter(isLive).length;
            const dead = (b.animals || []).filter(a => a.status === 'Deceased').length;
            list.push({
                key: `batch-${b.id}`, group: 'Livestock batches', emoji: ANIMAL_EMOJI[b.type] || '🐾',
                title: b.name, hint: `${b.type}${b.shortId ? ` · #${b.shortId}` : ''} · ${live} alive${dead ? ` · ${dead} lost` : ''}${b.status === 'Completed' ? ' · completed' : ''}`,
                search: `${b.name} ${b.type} ${b.shortId || ''} batch`, to: '/livestock', state: { selectBatchId: b.id }
            });
        });
        if (modules.crops) (data.crops || []).forEach(c => list.push({
            key: `crop-${c.id}`, group: 'Crops', emoji: '🥬', title: c.name, hint: `${c.status || 'Crop'}${c.plantedDate ? ` · planted ${c.plantedDate}` : ''}`,
            search: `${c.name} crop vegetable`, to: '/vegetables', state: { selectCropId: c.id }
        }));
        if (modules.fruits) (data.fruits || []).forEach(f => list.push({
            key: `fruit-${f.id}`, group: 'Fruits', emoji: '🥭', title: f.name, hint: f.status || 'Fruit',
            search: `${f.name} fruit orchard`, to: '/fruits', state: { selectFruitId: f.id }
        }));
        (data.employees || []).forEach(e => list.push({
            key: `emp-${e.id}`, group: 'Team', emoji: '🧑‍🌾', title: e.name || e.id, hint: e.role || e.status || 'Employee',
            search: `${e.name} ${e.role || ''} employee staff`, to: '/employees'
        }));
        (data.farmContacts || []).forEach(c => list.push({
            key: `fc-${c.id}`, group: 'Contacts', emoji: '📇', title: c.name, hint: c.phone || 'Farm contact',
            search: `${c.name} ${c.phone || ''} contact`, to: '/contacts'
        }));
        (data.contacts || []).forEach(c => list.push({
            key: `vet-${c.id}`, group: 'Contacts', emoji: '🩺', title: c.name, hint: `${c.type || 'Vet'} · ${c.phone || ''}`,
            search: `${c.name} ${c.phone || ''} vet doctor`, to: '/contacts?view=vets'
        }));
        return list;
    }, [sections, modules.crops, modules.fruits, data.batches, data.crops, data.fruits, data.employees, data.farmContacts, data.contacts]);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items.filter(i => i.group === 'Go to' || i.group === 'Livestock batches').slice(0, 18);
        const tokens = q.split(/\s+/);
        return items
            .filter(i => tokens.every(t => i.search.toLowerCase().includes(t)))
            .slice(0, 30);
    }, [items, query]);

    useEffect(() => {
        if (isQuickJumpOpen) {
            setQuery('');
            setCursor(0);
        }
    }, [isQuickJumpOpen]);

    useEffect(() => setCursor(0), [query]);

    useEffect(() => {
        listRef.current?.querySelector(`[data-index="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [cursor]);

    const choose = (item) => {
        if (!item) return;
        closeQuickJump();
        navigate(item.to, item.state ? { state: { ...item.state, nonce: Date.now() } } : undefined);
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setCursor(c => Math.min(results.length - 1, c + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setCursor(c => Math.max(0, c - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            choose(results[cursor]);
        } else if (e.key === 'Escape') {
            closeQuickJump();
        }
    };

    let lastGroup = null;

    return createPortal(
        <AnimatePresence>
            {isQuickJumpOpen && (
                <div className="fixed inset-0 z-[150]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeQuickJump}
                        className="absolute inset-0 bg-gray-900/45 backdrop-blur-[3px]"
                    />
                    <div className="absolute inset-0 flex justify-center items-start p-3 pt-safe-3 sm:pt-[12vh] pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.15 } }}
                            transition={{ type: 'spring', stiffness: 440, damping: 32 }}
                            className="pointer-events-auto w-full max-w-xl rounded-3xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden"
                            role="dialog"
                            aria-label="Quick jump"
                        >
                            <div className="flex items-center gap-3 px-4 border-b border-gray-100">
                                <Search className="w-5 h-5 text-gray-400" />
                                <input
                                    ref={inputRef}
                                    autoFocus
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    onKeyDown={onKeyDown}
                                    placeholder="Search batches, crops, sections…"
                                    className="flex-1 h-14 bg-transparent text-base outline-none focus-visible:shadow-none placeholder:text-gray-400"
                                    style={{ boxShadow: 'none' }}
                                />
                                <kbd className="hidden sm:block rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-bold text-gray-500">esc</kbd>
                            </div>
                            <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
                                {results.length === 0 && (
                                    <div className="py-12 text-center">
                                        <div className="text-4xl animate-wiggle inline-block">🔍</div>
                                        <p className="mt-2 text-sm text-gray-500">Nothing on the farm matches “{query}”.</p>
                                    </div>
                                )}
                                {results.map((item, index) => {
                                    const header = item.group !== lastGroup ? item.group : null;
                                    lastGroup = item.group;
                                    const active = index === cursor;
                                    return (
                                        <React.Fragment key={item.key}>
                                            {header && <p className="px-3 pt-3 pb-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-gray-400">{header}</p>}
                                            <button
                                                data-index={index}
                                                onMouseMove={() => setCursor(index)}
                                                onClick={() => choose(item)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left ${active ? 'bg-straw' : ''}`}
                                            >
                                                <span className="grid place-items-center w-9 h-9 rounded-xl bg-white ring-1 ring-gray-200 text-lg shrink-0">{item.emoji}</span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-bold text-gray-900 truncate">{item.title}</span>
                                                    <span className="block text-xs text-gray-500 truncate">{item.hint}</span>
                                                </span>
                                                {active && <CornerDownLeft className="w-4 h-4 text-gray-400 shrink-0" />}
                                            </button>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default QuickJump;

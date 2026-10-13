import React from 'react';
import { motion } from 'framer-motion';
import { Phone, MessageCircle, Pencil, Trash2, MapPin } from 'lucide-react';

const TONES = {
    blue: { band: 'from-sky-200 to-sky-50', avatar: 'bg-sky-500', chip: 'bg-sky-100 text-sky-800' },
    amber: { band: 'from-amber-200 to-amber-50', avatar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800' },
    green: { band: 'from-green-200 to-green-50', avatar: 'bg-green-600', chip: 'bg-green-100 text-green-800' },
    violet: { band: 'from-violet-200 to-violet-50', avatar: 'bg-violet-500', chip: 'bg-violet-100 text-violet-800' },
    rose: { band: 'from-rose-200 to-rose-50', avatar: 'bg-rose-500', chip: 'bg-rose-100 text-rose-800' }
};
const TONE_ORDER = ['green', 'blue', 'amber', 'violet', 'rose'];

/** Stable colour per name so the same person always looks the same */
export const toneForName = (name = '') => TONE_ORDER[[...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % TONE_ORDER.length];

const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

const whatsappLink = (phone = '') => {
    const digits = String(phone).replace(/\D/g, '');
    if (!digits) return null;
    return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
};

/** Playful contact card with one-tap Call and WhatsApp */
const ContactCard = ({ name, phone, emoji, tag, tone, location, details = [], notes, canEdit, onEdit, onDelete, index = 0 }) => {
    const t = TONES[tone] || TONES[toneForName(name)];
    const wa = whatsappLink(phone);
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: Math.min(index, 10) * 0.03, type: 'spring', stiffness: 320, damping: 26 }}
            whileHover={{ y: -3 }}
            className="relative rounded-3xl bg-white ring-1 ring-gray-200 shadow-sm hover:shadow-lg overflow-hidden flex flex-col"
        >
            <div className={`h-14 bg-gradient-to-br ${t.band}`} />
            {canEdit && (
                <div className="absolute top-2 right-2 flex gap-1">
                    <button onClick={onEdit} className="grid place-items-center w-8 h-8 rounded-full bg-white/80 text-gray-500 hover:text-forest" aria-label={`Edit ${name}`}>
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onDelete} className="grid place-items-center w-8 h-8 rounded-full bg-white/80 text-gray-500 hover:text-red-600" aria-label={`Delete ${name}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <div className="px-4 pb-4 -mt-8 flex-1 flex flex-col">
                <div className="relative w-16 h-16">
                    <div className={`w-16 h-16 rounded-2xl ${t.avatar} text-white grid place-items-center font-display text-2xl font-semibold ring-4 ring-white shadow-md`}>
                        {initials(name)}
                    </div>
                    {emoji && <span className="absolute -bottom-1 -right-2 grid place-items-center w-7 h-7 rounded-full bg-white shadow text-base">{emoji}</span>}
                </div>

                <h3 className="mt-2 font-semibold text-lg text-gray-900 leading-tight truncate">{name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {tag && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${t.chip}`}>{tag}</span>}
                    {details.filter(Boolean).map(d => <span key={d} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-600">{d}</span>)}
                </div>
                {location && <p className="mt-1.5 flex items-center gap-1 text-xs text-gray-500 truncate"><MapPin className="w-3 h-3 shrink-0" />{location}</p>}
                {notes && <p className="mt-1.5 text-xs text-gray-500 line-clamp-2">{notes}</p>}
                <p className="mt-2 text-sm font-bold tracking-wide text-gray-700">{phone}</p>

                <div className="mt-3 grid grid-cols-2 gap-2 pt-1">
                    <a href={`tel:${phone}`} className="flex items-center justify-center gap-1.5 rounded-2xl bg-green-600 text-white py-2.5 text-sm font-bold shadow-[0_3px_0_#14532d] active:translate-y-0.5">
                        <Phone className="w-4 h-4" /> Call
                    </a>
                    {wa ? (
                        <a href={wa} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-2xl bg-white ring-1 ring-green-200 text-green-700 py-2.5 text-sm font-bold">
                            <MessageCircle className="w-4 h-4" /> WhatsApp
                        </a>
                    ) : <span />}
                </div>
            </div>
        </motion.div>
    );
};

export default ContactCard;

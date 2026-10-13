import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { useMediaQuery } from '../../lib/useMediaQuery';

let openCount = 0;

const lockScroll = () => {
    openCount += 1;
    document.body.style.overflow = 'hidden';
};

const unlockScroll = () => {
    openCount = Math.max(0, openCount - 1);
    if (openCount === 0) document.body.style.overflow = '';
};

/**
 * App-wide dialog. Centered spring card on desktop, swipe-down bottom sheet on phones.
 * API is unchanged from the original ({ isOpen, onClose, title, children }) with optional
 * extras: `subtitle`, `emoji` and `size` ('md' | 'lg' | 'xl').
 */
const Modal = ({ isOpen, onClose, title, subtitle, emoji, size = 'md', children }) => {
    const isPhone = useMediaQuery('(max-width: 639px)');
    const dragControls = useDragControls();
    const titleId = useId();

    useEffect(() => {
        if (!isOpen) return;
        lockScroll();
        const onKey = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            unlockScroll();
        };
    }, [isOpen, onClose]);

    const width = size === 'xl' ? 'sm:max-w-3xl' : size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg';

    const panelMotion = isPhone
        ? {
            initial: { y: '100%' },
            animate: { y: 0 },
            exit: { y: '100%' },
            transition: { type: 'spring', stiffness: 380, damping: 36 }
        }
        : {
            initial: { opacity: 0, scale: 0.92, y: 24 },
            animate: { opacity: 1, scale: 1, y: 0 },
            exit: { opacity: 0, scale: 0.96, y: 12, transition: { duration: 0.16 } },
            transition: { type: 'spring', stiffness: 420, damping: 30 }
        };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[120]">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-gray-900/45 backdrop-blur-[3px]"
                    />

                    <div className="absolute inset-0 flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby={titleId}
                            {...panelMotion}
                            drag={isPhone ? 'y' : false}
                            dragControls={dragControls}
                            dragListener={false}
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0, bottom: 0.6 }}
                            onDragEnd={(_, info) => {
                                if (info.offset.y > 120 || info.velocity.y > 600) onClose?.();
                            }}
                            className={`pointer-events-auto relative w-full ${width} bg-white shadow-xl overflow-hidden flex flex-col
                                rounded-t-[1.75rem] sm:rounded-3xl max-h-[calc(100dvh-env(safe-area-inset-top,0px)-1rem)] sm:max-h-[88vh] ring-1 ring-black/5`}
                        >
                            {/* Decorative header wash */}
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-straw/70 to-transparent" />

                            {isPhone && (
                                <div
                                    onPointerDown={(e) => dragControls.start(e)}
                                    className="relative flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing touch-none"
                                >
                                    <span className="h-1.5 w-12 rounded-full bg-gray-300" />
                                </div>
                            )}

                            <div className="relative flex items-start justify-between gap-3 px-5 sm:px-6 pt-3 sm:pt-5 pb-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    {emoji && (
                                        <motion.span
                                            initial={{ scale: 0.3, rotate: -25 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.08 }}
                                            className="text-3xl leading-none select-none"
                                        >
                                            {emoji}
                                        </motion.span>
                                    )}
                                    <div className="min-w-0">
                                        <h3 id={titleId} className="text-xl font-semibold text-gray-900 leading-tight">{title}</h3>
                                        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="shrink-0 p-2 -mr-2 rounded-full bg-white/70 hover:bg-gray-100 text-gray-500 hover:text-gray-800"
                                    aria-label="Close"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="relative px-5 sm:px-6 pb-6 pt-1 overflow-y-auto overscroll-contain pb-safe">
                                {children}
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default Modal;

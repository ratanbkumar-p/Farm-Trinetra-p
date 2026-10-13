import React, { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';

const formatIN = (n, decimals) =>
    Number(n).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/**
 * Counts up to `value` when scrolled into view and glides between updates.
 * <AnimatedNumber value={12500} prefix="₹" />
 */
const AnimatedNumber = ({ value = 0, prefix = '', suffix = '', decimals = 0, duration = 0.9, className = '' }) => {
    const ref = useRef(null);
    const from = useRef(0);
    const inView = useInView(ref, { once: true, margin: '-40px' });
    const reduce = useReducedMotion();
    const target = Number(value) || 0;

    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        if (!inView || reduce) {
            node.textContent = `${prefix}${formatIN(target, decimals)}${suffix}`;
            from.current = target;
            return;
        }
        const controls = animate(from.current, target, {
            duration,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (v) => {
                node.textContent = `${prefix}${formatIN(v, decimals)}${suffix}`;
            }
        });
        from.current = target;
        return () => controls.stop();
    }, [target, inView, reduce, prefix, suffix, decimals, duration]);

    return <span ref={ref} className={className}>{`${prefix}${formatIN(reduce ? target : 0, decimals)}${suffix}`}</span>;
};

export default AnimatedNumber;

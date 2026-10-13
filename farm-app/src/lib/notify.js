/**
 * Tiny pub/sub toast API usable from anywhere (React or not).
 *   notify.success('Batch created')
 *   notify.error('Could not save')
 * The <Toaster /> component subscribes and renders them.
 */
const listeners = new Set();
let counter = 0;

const emit = (type, message, options = {}) => {
    const toast = {
        id: ++counter,
        type,
        message: String(message ?? ''),
        title: options.title,
        duration: options.duration ?? (type === 'error' ? 5200 : 3600)
    };
    listeners.forEach(fn => fn(toast));
    return toast.id;
};

export const notify = {
    success: (message, options) => emit('success', message, options),
    error: (message, options) => emit('error', message, options),
    info: (message, options) => emit('info', message, options),
    warn: (message, options) => emit('warn', message, options),
    subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    }
};

/** Guess a tone for legacy alert() strings so they still look right as toasts */
export const toneForMessage = (message) => {
    const text = String(message || '').toLowerCase();
    if (/(fail|error|invalid|cannot|can't|could not|unable|only \d+|please|not found|no .* (found|selected))/.test(text)) return 'warn';
    if (/(success|added|saved|complete|created|updated|loaded|calculated)/.test(text)) return 'success';
    return 'info';
};

/**
 * Route window.alert() through toasts. Every alert in the app is fire-and-forget
 * (code returns right after it), so a non-blocking toast is a drop-in upgrade.
 */
export const installAlertToasts = () => {
    if (typeof window === 'undefined' || window.__tfAlertPatched) return;
    window.__tfAlertPatched = true;
    window.alert = (message) => {
        const tone = toneForMessage(message);
        emit(tone, message);
    };
};

/** Little emoji confetti burst for happy moments (a sale, a new batch…) */
export const celebrate = (emojis = ['🎉', '✨', '🌾'], origin) => {
    if (typeof document === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const x = origin?.x ?? window.innerWidth / 2;
    const y = origin?.y ?? window.innerHeight * 0.6;
    for (let i = 0; i < 14; i++) {
        const el = document.createElement('span');
        el.className = 'tf-burst';
        el.textContent = emojis[i % emojis.length];
        const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
        const distance = 90 + Math.random() * 90;
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
        el.style.setProperty('--ty', `${Math.sin(angle) * distance - 60}px`);
        el.style.setProperty('--rot', `${(Math.random() - 0.5) * 120}deg`);
        el.style.animationDelay = `${Math.random() * 80}ms`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1400);
    }
};

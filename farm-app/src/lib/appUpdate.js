/* global __APP_VERSION__ */
/**
 * Keep installed PWAs on the latest deploy.
 * - On launch and whenever the app comes back to the foreground, compare the
 *   running build with /version.json (never cached) and reload if a newer one is live.
 * - If a lazy page chunk from an older deploy is gone (Firebase only serves the
 *   current release), reload instead of showing a broken screen.
 * index.html is served with `Cache-Control: no-cache`, so the reload always gets the new app.
 */
const RELOAD_GUARD = 'tf_update_reloaded_for';
const CHECK_EVERY_MS = 10 * 60 * 1000;

const reloadOnceFor = (version) => {
    try {
        if (sessionStorage.getItem(RELOAD_GUARD) === version) return; // avoid reload loops
        sessionStorage.setItem(RELOAD_GUARD, version);
    } catch {
        // storage blocked — still reload
    }
    window.location.reload();
};

const checkForUpdate = async () => {
    try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { version } = await res.json();
        if (version && version !== __APP_VERSION__) reloadOnceFor(version);
    } catch {
        // offline or blocked — try again next time
    }
};

export const installAppUpdates = () => {
    if (import.meta.env.DEV || typeof window === 'undefined') return;

    checkForUpdate();
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
    });
    window.addEventListener('focus', checkForUpdate);
    window.addEventListener('online', checkForUpdate);
    setInterval(checkForUpdate, CHECK_EVERY_MS);

    // A page chunk from an older deploy failed to load → fetch the new release
    window.addEventListener('vite:preloadError', (event) => {
        event.preventDefault();
        reloadOnceFor(`chunk-${Date.now()}`);
    });
};

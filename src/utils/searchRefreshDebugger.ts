/**
 * 🔍 PAGE REFRESH DEBUGGER
 * 
 * This utility helps identify what's causing page refreshes during search
 */

let searchDebugger: (() => void) | null = null;

export function initializeSearchDebugger() {
    if (searchDebugger) return; // Already initialized

    console.log('🔍 Search refresh debugger initialized');

    // Track page refreshes/reloads
    const trackRefresh = (reason: string) => {
        console.warn(`🚨 PAGE REFRESH DETECTED: ${reason}`);
        console.trace('Refresh stack trace');
    };

    // Track form submissions
    const originalSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function () {
        const hasSearchInput = this.querySelector('input[placeholder*="search" i], input[aria-label*="search" i]');
        if (hasSearchInput) {
            trackRefresh('Form submission with search input');
        }
        return originalSubmit.call(this);
    };

    // Track navigation changes
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
        if (lastUrl !== window.location.href) {
            trackRefresh(`URL changed from ${lastUrl} to ${window.location.href}`);
            lastUrl = window.location.href;
        }
    });

    observer.observe(document, { subtree: true, childList: true });

    // Track Enter key presses on search inputs
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const target = e.target as HTMLElement;
            const isSearchInput = target.tagName === 'INPUT' && (
                target.getAttribute('placeholder')?.toLowerCase().includes('search') ||
                target.getAttribute('aria-label')?.toLowerCase().includes('search')
            );

            if (isSearchInput) {
                console.log('🔍 Enter pressed on search input:', target);

                // Check if default was prevented
                setTimeout(() => {
                    if (!e.defaultPrevented) {
                        trackRefresh('Enter key on search input (default not prevented)');
                    }
                }, 0);
            }
        }
    }, true);

    // Track React component unmounts that might indicate refresh
    const originalError = console.error;
    console.error = function (...args) {
        const message = args[0];
        if (typeof message === 'string' && message.includes('unmount')) {
            trackRefresh('React component unmount detected');
        }
        return originalError.apply(this, args);
    };

    // Cleanup function
    searchDebugger = () => {
        observer.disconnect();
        HTMLFormElement.prototype.submit = originalSubmit;
        console.error = originalError;
        console.log('🔍 Search refresh debugger cleanup completed');
    };
}

export function cleanupSearchDebugger() {
    if (searchDebugger) {
        searchDebugger();
        searchDebugger = null;
    }
}

// Auto-initialize in development
if (import.meta.env.DEV) {
    initializeSearchDebugger();
}

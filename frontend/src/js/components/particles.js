/**
 * Talaen Hardware System - Particles Component
 * Floating background particles for visual appeal
 * Updated: no re-render churn, respects prefers-reduced-motion, pauses when hidden
 */

const ParticlesComponent = {
    _initialized: false,

    /**
     * Initialize particles (idempotent — safe to call multiple times).
     */
    init() {
        const container = document.getElementById('particles');
        if (!container) return;

        // ✅ Skip if already initialized (container has children)
        if (this._initialized && container.children.length > 0) return;

        // ✅ Respect user's motion preference
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            container.innerHTML = '';
            this._initialized = true;
            return;
        }

        // ✅ Fewer particles on small screens for less visual clutter
        const isSmallScreen = window.innerWidth < 768;
        const count = isSmallScreen ? 15 : 30;

        container.innerHTML = '';

        // ✅ Build the whole batch and append once (fewer layout recalcs than 30 appends)
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');

            const size = Math.random() * 6 + 2;
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            const delay = Math.random() * 20;
            const duration = 15 + Math.random() * 10;

            particle.style.cssText =
                'position:absolute;' +
                'width:' + size + 'px;' +
                'height:' + size + 'px;' +
                'left:' + left + '%;' +
                'top:' + top + '%;' +
                'background:rgba(196,154,43,0.2);' +
                'border-radius:50%;' +
                'pointer-events:none;' +
                'animation:float ' + duration + 's ' + delay + 's infinite ease-in-out;';

            fragment.appendChild(particle);
        }

        container.appendChild(fragment);
        this._initialized = true;

        // ✅ Ensure the CSS keyframes are present
        this.injectStyles();

        // ✅ Pause animations when the tab is hidden — saves battery and CPU
        this._installVisibilityHandler(container);
    },

    /**
     * Inject float animation keyframes if not already present.
     */
    injectStyles() {
        if (!document.getElementById('particle-styles')) {
            const style = document.createElement('style');
            style.id = 'particle-styles';
            style.textContent =
                '@keyframes float {' +
                '0%, 100% { transform: translateY(0) translateX(0); }' +
                '25% { transform: translateY(-100px) translateX(50px); }' +
                '50% { transform: translateY(50px) translateX(-50px); }' +
                '75% { transform: translateY(-50px) translateX(100px); }' +
                '}' +
                // ✅ Respect reduced motion at the CSS level too
                '@media (prefers-reduced-motion: reduce) {' +
                '  #particles > div { animation: none !important; }' +
                '}';
            document.head.appendChild(style);
        }
    },

    /**
     * Pause/resume particle animations when the tab visibility changes.
     * Installs only once.
     */
    _installVisibilityHandler(container) {
        if (this._visibilityHandlerInstalled) return;
        this._visibilityHandlerInstalled = true;

        document.addEventListener('visibilitychange', function() {
            var c = document.getElementById('particles');
            if (!c) return;
            c.style.animationPlayState = document.hidden ? 'paused' : 'running';
            // Apply to children (parents don't inherit animation-play-state to children)
            var kids = c.children;
            for (var i = 0; i < kids.length; i++) {
                kids[i].style.animationPlayState = document.hidden ? 'paused' : 'running';
            }
        });
    },

    /**
     * Manual cleanup (call if you ever need to remove particles).
     */
    destroy() {
        const container = document.getElementById('particles');
        if (container) container.innerHTML = '';
        this._initialized = false;
    }
};

// ✅ Auto-initialize on load (guard against double-init)
document.addEventListener('DOMContentLoaded', () => {
    ParticlesComponent.init();
});

// Make globally available
window.ParticlesComponent = ParticlesComponent;

// ============================================
// APP - Main Application Entry Point
// Updated: parallel bootstrap, no double-load, loading screen stays until ready
// ============================================

const App = {
    // ✅ Loading screen guard — shows a message if startup takes too long
    _loadingTimeout: null,

    init: async function() {
        var loadingScreen = document.getElementById('loading-screen');

        // ✅ Safety net: if init takes more than 20s, show a "still working" message
        this._loadingTimeout = setTimeout(function() {
            var ls = document.getElementById('loading-screen');
            if (ls) {
                var msg = ls.querySelector('.loading-message') || ls;
                // Only append if we haven't already
                if (!document.getElementById('loading-timeout-msg')) {
                    var p = document.createElement('p');
                    p.id = 'loading-timeout-msg';
                    p.style.cssText = 'color:#f59e0b;margin-top:1rem;font-size:0.9rem;';
                    p.textContent = 'Still loading… this is taking longer than usual.';
                    msg.appendChild(p);
                }
            }
        }, 20000);

        try {
            // ✅ Parallel bootstrap — the two big fetches fire together
            //    ProductService.refresh() forces a fresh network hit
            //    SaleService.getAll()  will hit its own cache or fetch fresh
            await Promise.all([
                ProductService.refresh(),
                SaleService.getAll()
            ]);

            // ✅ Router no longer needs to reload this data.
            //    AppRouter.init() → _loadInitialData() will see fresh caches
            //    and skip the network round-trip.
            await AppRouter.init();

            // ✅ Only hide the loading screen once everything is ready
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }

            console.log('✅ Application initialized successfully.');

        } catch (error) {
            console.error('Error initializing application:', error);

            // Clear the safety-net timer
            if (this._loadingTimeout) {
                clearTimeout(this._loadingTimeout);
                this._loadingTimeout = null;
            }

            // Hide the loading screen so the user can see the error
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }

            // Show a helpful error message
            var app = document.getElementById('app');
            if (app) {
                var msg = (error && error.message) ? error.message : 'Unknown error';
                var isAuthError = msg.indexOf('401') > -1 || msg.toLowerCase().indexOf('unauthorized') > -1;

                app.innerHTML =
                    '<div style="text-align:center;padding:3rem;color:#ef4444;">' +
                        '<i class="fas fa-exclamation-triangle" style="font-size:3rem;display:block;margin-bottom:1rem;"></i>' +
                        '<h3>' + (isAuthError ? 'Session Expired' : 'Error loading application') + '</h3>' +
                        '<p>' + (isAuthError
                            ? 'Your session has expired. Please log in again.'
                            : 'Please refresh the page or contact support.') + '</p>' +
                        '<button class="btn btn-primary" onclick="location.reload()" style="margin-top:1rem;">' +
                            '<i class="fas fa-redo"></i> Refresh' +
                        '</button>' +
                    '</div>';
            }

        } finally {
            // Clear the safety-net timer regardless of outcome
            if (this._loadingTimeout) {
                clearTimeout(this._loadingTimeout);
                this._loadingTimeout = null;
            }
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    App.init();
});

// Make globally available
window.App = App;

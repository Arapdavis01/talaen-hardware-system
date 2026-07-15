// ============================================
// APP - Main Application Entry Point
// ============================================

const App = {
    init: async function() {
        try {
            // Hide loading screen
            var loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
            
            // Load products and sales data with JWT
            await ProductService.refresh();
            await SaleService.getAll();
            
            // Initialize the router
            await AppRouter.init();
            
            console.log('Application initialized successfully.');
        } catch (error) {
            console.error('Error initializing application:', error);
            // Show error message to user
            var app = document.getElementById('app');
            if (app) {
                app.innerHTML = '<div style="text-align:center;padding:3rem;color:#ef4444;">' +
                    '<i class="fas fa-exclamation-triangle" style="font-size:3rem;display:block;margin-bottom:1rem;"></i>' +
                    '<h3>Error loading application</h3>' +
                    '<p>Please refresh the page or contact support.</p>' +
                    '<button class="btn btn-primary" onclick="location.reload()" style="margin-top:1rem;">Refresh</button>' +
                    '</div>';
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

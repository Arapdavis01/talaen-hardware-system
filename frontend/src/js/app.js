const App = {
    async init() {
        document.getElementById('loading-screen').style.display = 'none';
        // Load products from API before rendering
        await ProductService._fetchFromAPI();
        await SaleService.getAll();
        await AppRouter.init();
    }
};
document.addEventListener('DOMContentLoaded', function() { App.init(); });

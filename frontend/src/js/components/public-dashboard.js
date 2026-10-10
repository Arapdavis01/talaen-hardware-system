// ============================================
// PUBLIC DASHBOARD - No JWT Required (Public View)
// Updated: self-terminating auto-slide, HTML escaping, icon nav
// ============================================

const PublicDashboardComponent = {
    _slideIndex: 0,
    _slideInterval: null,
    _totalSlides: 1,
    _SLIDE_MS: 10000,

    // ✅ HTML escape helper
    _esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    render() {
        var self = this;
        var esc = this._esc;
        var products = (typeof ProductService !== 'undefined' && ProductService._cache) ? ProductService._cache : [];

        // Group products case-insensitive
        var grouped = {};
        products.forEach(function(p) {
            var key = (p.name || '').toUpperCase();
            if (!grouped[key]) grouped[key] = { displayName: p.name, variants: [] };
            grouped[key].variants.push(p);
        });

        var totalProducts = products.length;
        var totalStock = products.reduce(function(s, p) { return s + (p.stock || 0); }, 0);
        var categories = Object.keys(grouped).length;
        var keys = Object.keys(grouped).sort();

        var html = '';

        // Welcome Banner
        html += '<div class="welcome-banner" style="text-align:center;padding:3rem 2rem;cursor:pointer;" onclick="AppRouter.navigate(\'admin\')">';
        html += '<img src="../assets/talaen02.jpg" style="width:100px;height:100px;border-radius:20px;object-fit:cover;margin-bottom:1rem;box-shadow:0 8px 25px rgba(0,0,0,0.3);">';
        html += '<h1 style="font-size:2rem;margin-bottom:0.5rem;">Welcome to Talaen Investment Hardware</h1>';
        html += '<p style="font-size:1.2rem;opacity:0.9;margin-bottom:1.5rem;">Your Trusted Partner for Quality Hardware & Building Materials</p>';
        html += '<button class="btn btn-lg" style="background:white;color:var(--primary);font-size:1.1rem;padding:1rem 3rem;"><i class="fas fa-sign-in-alt"></i> Login to Start Selling</button>';
        html += '<p style="margin-top:1rem;font-size:0.85rem;opacity:0.8;"><i class="fas fa-user-shield"></i> Admin: admin / admin123 | <i class="fas fa-user"></i> Cashier: cashier / cashier123</p>';
        html += '</div>';

        // Stats Overview
        html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:2rem;">';
        html += '<div class="card" style="text-align:center;"><div class="card-body" style="padding:1.5rem;"><div style="font-size:2.5rem;color:var(--primary);">' + categories + '</div><div style="font-weight:600;color:var(--gray-600);">Categories</div></div></div>';
        html += '<div class="card" style="text-align:center;"><div class="card-body" style="padding:1.5rem;"><div style="font-size:2.5rem;color:var(--secondary);">' + totalProducts + '</div><div style="font-weight:600;color:var(--gray-600);">Products</div></div></div>';
        html += '<div class="card" style="text-align:center;"><div class="card-body" style="padding:1.5rem;"><div style="font-size:2.5rem;color:#10b981;">' + totalStock.toLocaleString() + '</div><div style="font-weight:600;color:var(--gray-600);">In Stock</div></div></div>';
        html += '</div>';

        // Available Products - Carousel
        html += '<h2 style="color:white;margin-bottom:1rem;text-align:center;"> Available Products</h2>';

        if (keys.length === 0) {
            html += '<div class="card"><div class="card-body" style="text-align:center;padding:3rem;"><i class="fas fa-box-open" style="font-size:4rem;color:var(--gray-400);"></i><p style="margin-top:1rem;color:var(--gray-500);">No products available yet.</p></div></div>';
        } else {
            var cards = [];
            for (var i = 0; i < keys.length; i++) {
                var group = grouped[keys[i]];
                var variants = group.variants;
                var totalCatStock = variants.reduce(function(s, p) { return s + (p.stock || 0); }, 0);
                var prices = variants.map(function(p) { return Number(p.price) || 0; }).sort(function(a, b) { return a - b; });
                var minPrice = prices[0] || 0;
                var maxPrice = prices[prices.length - 1] || 0;
                var priceRange = minPrice === maxPrice
                    ? 'KES ' + minPrice.toLocaleString()
                    : 'KES ' + minPrice.toLocaleString() + ' - ' + maxPrice.toLocaleString();

                var variantNames = variants.map(function(v) {
                    var brand = v.brand ? v.brand + ' ' : '';
                    var variant = v.variant || 'Standard';
                    return esc(brand + variant);
                }).join(', ');

                var cardHTML = '<div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:1px solid #e2e8f0;border-radius:1rem;padding:1rem;transition:all 0.2s;" onmouseover="this.style.transform=\'translateY(-3px)\';this.style.boxShadow=\'0 8px 25px rgba(0,0,0,0.1)\';this.style.borderColor=\'var(--primary)\';" onmouseout="this.style.transform=\'translateY(0)\';this.style.boxShadow=\'none\';this.style.borderColor=\'#e2e8f0\';">';
                cardHTML += '<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">';
                cardHTML += '<div>';
                cardHTML += '<div style="font-weight:700;font-size:0.95rem;color:#1e293b;">' + esc(group.displayName) + '</div>';
                cardHTML += '<div style="font-size:0.7rem;color:#64748b;">' + variants.length + ' variant' + (variants.length > 1 ? 's' : '') + '</div>';
                cardHTML += '</div></div>';
                cardHTML += '<div style="margin-bottom:0.4rem;font-size:0.8rem;"><span style="font-weight:600;color:var(--secondary);">' + priceRange + '</span></div>';
                cardHTML += '<div style="margin-bottom:0.4rem;font-size:0.75rem;color:#334155;line-height:1.3;">' + variantNames + '</div>';
                cardHTML += '<div style="margin-top:0.5rem;"><div style="display:flex;justify-content:space-between;font-size:0.7rem;color:#64748b;margin-bottom:0.2rem;"><span> Stock</span><span><strong>' + totalCatStock + '</strong> ' + esc(variants[0].unit || 'pcs') + '</span></div>';
                cardHTML += '<div style="background:#e2e8f0;border-radius:1rem;height:5px;overflow:hidden;"><div style="background:linear-gradient(90deg,#10b981,#059669);height:100%;width:100%;border-radius:1rem;"></div></div></div>';
                cardHTML += '</div>';

                cards.push(cardHTML);
            }

            var cardsPerSlide = 4;
            var totalSlides = Math.ceil(cards.length / cardsPerSlide);
            this._totalSlides = totalSlides;

            html += '<div class="card" style="overflow:hidden;position:relative;">';
            html += '<div class="card-body" style="padding:1.5rem;">';
            html += '<div id="productSlides" style="display:flex;transition:transform 0.5s ease-in-out;transform:translateX(-' + (this._slideIndex * 100) + '%);">';

            for (var s = 0; s < totalSlides; s++) {
                html += '<div class="product-slide" style="min-width:100%;display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;">';
                for (var c = s * cardsPerSlide; c < Math.min((s + 1) * cardsPerSlide, cards.length); c++) {
                    html += cards[c];
                }
                // Fill empty slots
                var filled = Math.min((s + 1) * cardsPerSlide, cards.length) - s * cardsPerSlide;
                for (var e = filled; e < cardsPerSlide; e++) {
                    html += '<div></div>';
                }
                html += '</div>';
            }

            html += '</div>';

            // Navigation
            if (totalSlides > 1) {
                html += '<div style="display:flex;justify-content:center;gap:0.5rem;margin-top:1rem;">';
                for (var d = 0; d < totalSlides; d++) {
                    html += '<button class="slide-dot" data-slide="' + d + '" style="width:10px;height:10px;border-radius:50%;border:none;background:' + (d === this._slideIndex ? 'var(--primary)' : '#cbd5e1') + ';cursor:pointer;padding:0;" onclick="PublicDashboardComponent._goToSlide(' + d + ')"></button>';
                }
                html += '</div>';

                html += '<button onclick="PublicDashboardComponent._prevSlide()" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.5);color:white;border:none;border-radius:50%;width:36px;height:36px;cursor:pointer;font-size:1rem;z-index:2;"><i class="fas fa-chevron-left"></i></button>';
                html += '<button onclick="PublicDashboardComponent._nextSlide()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.5);color:white;border:none;border-radius:50%;width:36px;height:36px;cursor:pointer;font-size:1rem;z-index:2;"><i class="fas fa-chevron-right"></i></button>';
            }

            html += '</div></div>';

            // Start auto-slide after DOM renders
            setTimeout(function() {
                self._startAutoSlide();
            }, 500);
        }

        // Login CTA
        html += '<div style="text-align:center;margin-top:2rem;margin-bottom:3rem;"><div class="card"><div class="card-body" style="padding:2rem;"><h3 style="color:var(--primary);margin-bottom:1rem;"><i class="fas fa-lock"></i> Ready to Start?</h3><p style="color:var(--gray-500);margin-bottom:1.5rem;">Login to access the full system, manage products, and make sales.</p><button class="btn btn-primary btn-lg" onclick="AppRouter.navigate(\'admin\')" style="padding:1rem 3rem;font-size:1.1rem;"><i class="fas fa-sign-in-alt"></i> System Login</button></div></div></div>';

        return html;
    },

    // ============================================
    // AUTO-SLIDE (self-terminating)
    // ============================================
    _startAutoSlide() {
        this._stopAutoSlide();
        if (this._totalSlides <= 1) return;

        var self = this;
        this._slideInterval = setInterval(function() {
            // ✅ Self-terminate if the carousel is no longer in the DOM
            var slides = document.getElementById('productSlides');
            if (!slides) {
                self._stopAutoSlide();
                return;
            }
            self._nextSlide();
        }, this._SLIDE_MS);
    },

    _stopAutoSlide() {
        if (this._slideInterval) {
            clearInterval(this._slideInterval);
            this._slideInterval = null;
        }
    },

    // ============================================
    // NAVIGATION
    // ============================================
    _goToSlide(index) {
        this._slideIndex = index;
        var slides = document.getElementById('productSlides');
        if (slides) {
            slides.style.transform = 'translateX(-' + (index * 100) + '%)';
        }
        this._updateDots(index);
        // Restart the timer so a manual click gives the user a full window before auto-advance
        this._startAutoSlide();
    },

    _nextSlide() {
        var slides = document.getElementById('productSlides');
        if (!slides) return;
        this._slideIndex = (this._slideIndex + 1) % this._totalSlides;
        slides.style.transform = 'translateX(-' + (this._slideIndex * 100) + '%)';
        this._updateDots(this._slideIndex);
    },

    _prevSlide() {
        var slides = document.getElementById('productSlides');
        if (!slides) return;
        this._slideIndex = (this._slideIndex - 1 + this._totalSlides) % this._totalSlides;
        slides.style.transform = 'translateX(-' + (this._slideIndex * 100) + '%)';
        this._updateDots(this._slideIndex);
    },

    _updateDots(activeIndex) {
        document.querySelectorAll('.slide-dot').forEach(function(dot, i) {
            dot.style.background = i === activeIndex ? 'var(--primary)' : '#cbd5e1';
        });
    }
};

// Make globally available
window.PublicDashboardComponent = PublicDashboardComponent;

/**
 * Talaen Hardware System - Particles Component
 * Creates floating background particles for visual appeal
 */

const ParticlesComponent = {
    /**
     * Initialize particles
     */
    init() {
        const container = document.getElementById('particles');
        if (!container) return;

        // Clear existing particles
        container.innerHTML = '';

        // Create particles
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            
            // Random size
            const size = Math.random() * 6 + 2;
            
            // Random position
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            
            // Random animation
            const delay = Math.random() * 20;
            const duration = 15 + Math.random() * 10;
            
            // Styles
            particle.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${left}%;
                top: ${top}%;
                background: rgba(196, 154, 43, 0.2);
                border-radius: 50%;
                pointer-events: none;
                animation: float ${duration}s ${delay}s infinite ease-in-out;
            `;
            
            container.appendChild(particle);
        }
    },

    /**
     * Add float animation keyframes if not already present
     */
    injectStyles() {
        if (!document.getElementById('particle-styles')) {
            const style = document.createElement('style');
            style.id = 'particle-styles';
            style.textContent = `
                @keyframes float {
                    0%, 100% { transform: translateY(0) translateX(0); }
                    25% { transform: translateY(-100px) translateX(50px); }
                    50% { transform: translateY(50px) translateX(-50px); }
                    75% { transform: translateY(-50px) translateX(100px); }
                }
            `;
            document.head.appendChild(style);
        }
    }
};

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', () => {
    ParticlesComponent.injectStyles();
    ParticlesComponent.init();
});
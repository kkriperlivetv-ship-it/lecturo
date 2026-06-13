/**
 * RippleGrid final version - тонкая тёмно-синяя сетка с равномерной анимацией
 */
class RippleGrid {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            gridColor: '#1a0c80',
            rippleIntensity: 0.05,
            gridSize: 10,
            gridThickness: 1,
            fadeDistance: 0,
            vignetteStrength: 0,
            glowIntensity: 0,
            opacity: 0.9,
            mouseInteraction: true,
            mouseInteractionRadius: 1.5,
            ...options
        };

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.time = 0;
        this.mouse = { x: 0.5, y: 0.5 };
        this.targetMouse = { x: 0.5, y: 0.5 };
        this.mouseInfluence = 0;
        this.animationId = null;

        this.setupCanvas();
        this.bindEvents();
        this.animate();
    }

    setupCanvas() {
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '-1';
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const dpr = Math.min(window.devicePixelRatio, 2);
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
        this.ctx.scale(dpr, dpr);
    }

    bindEvents() {
        if (this.options.mouseInteraction) {
            this.container.addEventListener('mousemove', (e) => {
                const rect = this.container.getBoundingClientRect();
                this.targetMouse.x = (e.clientX - rect.left) / rect.width;
                this.targetMouse.y = 1 - (e.clientY - rect.top) / rect.height;
            });
            this.container.addEventListener('mouseenter', () => {
                this.mouseInfluence = 1;
            });
            this.container.addEventListener('mouseleave', () => {
                this.mouseInfluence = 0;
            });
        }
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : [0.1, 0.05, 0.5];
    }

    draw() {
        const { ctx } = this;
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        const {
            gridColor,
            rippleIntensity,
            gridSize,
            gridThickness,
            fadeDistance,
            vignetteStrength,
            opacity,
            mouseInteractionRadius
        } = this.options;

        ctx.clearRect(0, 0, width, height);

        // Smooth mouse movement
        this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.1;
        this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.1;
        this.mouseInfluence += (this.options.mouseInteraction ? 1 : 0 - this.mouseInfluence) * 0.05;

        const centerX = width / 2;
        const centerY = height / 2;
        const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

        // Draw grid lines
        const cellSize = gridSize * 10;
        const cols = Math.ceil(width / cellSize) + 1;
        const rows = Math.ceil(height / cellSize) + 1;

        // Ripple animation - разные фазы для горизонтальных и вертикальных линий
        const rippleHorizontal = Math.sin(this.time) * rippleIntensity * 30;
        const rippleVertical = Math.cos(this.time * 0.7) * rippleIntensity * 30;

        // Color
        const color = this.hexToRgb(gridColor);
        const strokeColor = `rgba(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255}, ${opacity})`;

        ctx.lineWidth = gridThickness;
        ctx.strokeStyle = strokeColor;

        // Horizontal lines - двигаются по вертикали
        for (let r = 0; r <= rows; r++) {
            const baseY = r * cellSize;
            const y = baseY + rippleVertical;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Vertical lines - двигаются по горизонтали
        for (let c = 0; c <= cols; c++) {
            const baseX = c * cellSize;
            const x = baseX + rippleHorizontal;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Mouse influence (optional)
        if (this.mouseInfluence > 0) {
            const mouseX = this.mouse.x * width;
            const mouseY = this.mouse.y * height;
            const influence = this.mouseInfluence * 0.5;
            // Draw a subtle ripple around mouse
            ctx.beginPath();
            ctx.arc(mouseX, mouseY, mouseInteractionRadius * 20, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255}, ${influence * 0.5})`;
            ctx.lineWidth = gridThickness * 2;
            ctx.stroke();
        }
    }

    animate() {
        this.time += 0.016;
        if (Math.floor(this.time * 10) % 60 === 0) {
            console.log('RippleGrid animating, time:', this.time.toFixed(2));
        }
        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', () => this.resize());
        this.container.removeChild(this.canvas);
    }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    const elements = document.querySelectorAll('[data-ripple-grid]');
    elements.forEach(el => {
        const options = {
            gridColor: el.getAttribute('data-grid-color') || '#1a0c80',
            rippleIntensity: parseFloat(el.getAttribute('data-ripple-intensity')) || 0.05,
            gridSize: parseFloat(el.getAttribute('data-grid-size')) || 10,
            gridThickness: parseFloat(el.getAttribute('data-grid-thickness')) || 1,
            fadeDistance: parseFloat(el.getAttribute('data-fade-distance')) || 0,
            vignetteStrength: parseFloat(el.getAttribute('data-vignette-strength')) || 0,
            glowIntensity: parseFloat(el.getAttribute('data-glow-intensity')) || 0,
            opacity: parseFloat(el.getAttribute('data-opacity')) || 0.9,
            mouseInteraction: el.getAttribute('data-mouse-interaction') !== 'false',
            mouseInteractionRadius: parseFloat(el.getAttribute('data-mouse-interaction-radius')) || 1.5,
        };
        new RippleGrid(el, options);
    });
});

window.RippleGrid = RippleGrid;
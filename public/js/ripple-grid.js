/**
 * RippleGrid vanilla JS implementation
 * Simplified version of React Bits RippleGrid using Canvas 2D
 * Updated: сетка вместо крестиков, равномерная анимация
 */
class RippleGrid {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableRainbow: false,
            gridColor: '#1a0c80',
            rippleIntensity: 0.05,
            gridSize: 10,
            gridThickness: 1,
            fadeDistance: 0,
            vignetteStrength: 1,
            glowIntensity: 0,
            opacity: 0.9,
            gridRotation: 0,
            mouseInteraction: true,
            mouseInteractionRadius: 1.5,
            ...options
        };

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);
        console.log('RippleGrid initialized', this.container, this.options.gridColor);

        this.time = 0;
        this.mouse = { x: 0.5, y: 0.5 };
        this.targetMouse = { x: 0.5, y: 0.5 };
        this.mouseInfluence = 0;
        this.animationId = null;

        this.setupCanvas();
        this.bindEvents();
        console.log('Calling animate');
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
        ] : [0.1, 0.05, 0.5]; // fallback тёмно-синий
    }

    draw() {
        const { ctx } = this;
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        const {
            enableRainbow,
            gridColor,
            rippleIntensity,
            gridSize,
            gridThickness,
            fadeDistance,
            vignetteStrength,
            glowIntensity,
            opacity,
            gridRotation,
            mouseInteractionRadius
        } = this.options;

        // Debug logging
        if (!this._drawCount) {
            this._drawCount = 0;
        }
        this._drawCount++;
        if (this._drawCount <= 5) {
            console.log(`RippleGrid draw #${this._drawCount}:`, { width, height, gridSize, gridThickness, gridColor });
        }

        ctx.clearRect(0, 0, width, height);

        // TEST: Простая видимая сетка
        const cellSize = gridSize * 10;
        const cols = Math.ceil(width / cellSize);
        const rows = Math.ceil(height / cellSize);

        // Яркий цвет для теста
        const testColor = [255, 0, 0]; // Красный
        ctx.lineWidth = gridThickness;
        ctx.strokeStyle = `rgb(${testColor[0]}, ${testColor[1]}, ${testColor[2]})`;

        // Горизонтальные линии
        for (let r = 0; r <= rows; r++) {
            const y = r * cellSize;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Вертикальные линии
        for (let c = 0; c <= cols; c++) {
            const x = c * cellSize;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        console.log(`TEST GRID: cols=${cols}, rows=${rows}, cellSize=${cellSize}`);
    }

    hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [r, g, b];
    }

    animate() {
        this.time += 0.016; // ~60fps
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

// Auto-initialize elements with data-ripple-grid attribute
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded, looking for ripple-grid elements');
    const elements = document.querySelectorAll('[data-ripple-grid]');
    console.log('Found', elements.length, 'elements');
    if (elements.length === 0) {
        console.error('No ripple-grid elements found! Check HTML for data-ripple-grid attribute.');
    }
    elements.forEach((el, idx) => {
        console.log(`Element ${idx}:`, el.id || el.className, el.getBoundingClientRect());
        const options = {
            enableRainbow: el.getAttribute('data-enable-rainbow') === 'true',
            gridColor: el.getAttribute('data-grid-color') || '#1a0c80',
            rippleIntensity: parseFloat(el.getAttribute('data-ripple-intensity')) || 0.1,
            gridSize: parseFloat(el.getAttribute('data-grid-size')) || 8,
            gridThickness: parseFloat(el.getAttribute('data-grid-thickness')) || 2,
            fadeDistance: parseFloat(el.getAttribute('data-fade-distance')) || 0,
            vignetteStrength: parseFloat(el.getAttribute('data-vignette-strength')) || 0.5,
            glowIntensity: parseFloat(el.getAttribute('data-glow-intensity')) || 0,
            opacity: parseFloat(el.getAttribute('data-opacity')) || 1,
            gridRotation: parseFloat(el.getAttribute('data-grid-rotation')) || 0,
            mouseInteraction: el.getAttribute('data-mouse-interaction') !== 'false',
            mouseInteractionRadius: parseFloat(el.getAttribute('data-mouse-interaction-radius')) || 1.5,
        };
        console.log('Creating RippleGrid with options', options);
        try {
            new RippleGrid(el, options);
            console.log('RippleGrid created successfully');
        } catch (err) {
            console.error('Failed to create RippleGrid:', err);
        }
    });
});

window.RippleGrid = RippleGrid;
/**
 * DotField - адаптация React компонента из React Bits для vanilla JavaScript
 * Интерактивное поле точек с эффектом свечения и взаимодействием с курсором
 */
console.log('DotField script loading...');
class DotField {
    constructor(container, options = {}) {
        console.log('DotField constructor called for', container);
        this.container = container;
        this.options = {
            dotRadius: 1.5,
            dotSpacing: 14,
            cursorRadius: 500,
            cursorForce: 0.1,
            bulgeOnly: true,
            bulgeStrength: 67,
            glowRadius: 160,
            sparkle: false,
            waveAmplitude: 0,
            gradientFrom: 'rgba(168, 85, 247, 0.35)',
            gradientTo: 'rgba(180, 151, 207, 0.25)',
            glowColor: '#120F17',
            ...options
        };

        this.canvas = document.createElement('canvas');
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.glowId = `dot-field-glow-${Math.random().toString(36).slice(2, 9)}`;

        this.dots = [];
        this.mouse = { x: -9999, y: -9999, prevX: -9999, prevY: -9999, speed: 0 };
        this.size = { w: 0, h: 0, offsetX: 0, offsetY: 0 };
        this.glowOpacity = 0;
        this.engagement = 0;
        this.frameCount = 0;
        this.rafId = null;
        this.speedInterval = null;
        this.resizeTimer = null;

        this.init();
    }

    init() {
        // Создаем структуру DOM
        const wrapper = document.createElement('div');
        wrapper.className = 'dot-field-container';
        wrapper.style.position = 'absolute';
        wrapper.style.inset = '0';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.zIndex = '-1';
        wrapper.style.pointerEvents = 'none';

        // Настройка canvas
        this.canvas.style.position = 'absolute';
        this.canvas.style.inset = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';

        // Настройка SVG
        this.svg.setAttribute('style', 'position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;');
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const radialGradient = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
        radialGradient.setAttribute('id', this.glowId);
        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', this.options.glowColor);
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', 'transparent');
        radialGradient.appendChild(stop1);
        radialGradient.appendChild(stop2);
        defs.appendChild(radialGradient);
        this.svg.appendChild(defs);

        this.glow.setAttribute('cx', '-9999');
        this.glow.setAttribute('cy', '-9999');
        this.glow.setAttribute('r', this.options.glowRadius);
        this.glow.setAttribute('fill', `url(#${this.glowId})`);
        this.glow.style.opacity = '0';
        this.glow.style.willChange = 'opacity';
        this.svg.appendChild(this.glow);

        wrapper.appendChild(this.canvas);
        wrapper.appendChild(this.svg);
        this.container.appendChild(wrapper);
        this.wrapper = wrapper;

        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);

        this.setupEvents();
        this.resize();
        this.animate();
    }

    setupEvents() {
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e), { passive: true });
        this.speedInterval = setInterval(() => this.updateMouseSpeed(), 20);
    }

    handleResize() {
        clearTimeout(this.resizeTimer);
        this.resizeTimer = setTimeout(() => this.resize(), 100);
    }

    resize() {
        const rect = this.wrapper.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        this.canvas.width = w * this.dpr;
        this.canvas.height = h * this.dpr;
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        this.size = {
            w,
            h,
            offsetX: rect.left + window.scrollX,
            offsetY: rect.top + window.scrollY,
        };

        this.buildDots(w, h);
    }

    buildDots(w, h) {
        const step = this.options.dotRadius + this.options.dotSpacing;
        const cols = Math.floor(w / step);
        const rows = Math.floor(h / step);
        const padX = (w % step) / 2;
        const padY = (h % step) / 2;
        const dots = new Array(rows * cols);
        let idx = 0;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const ax = padX + col * step + step / 2;
                const ay = padY + row * step + step / 2;
                dots[idx++] = { ax, ay, sx: ax, sy: ay, vx: 0, vy: 0, x: ax, y: ay };
            }
        }
        this.dots = dots;
    }

    handleMouseMove(e) {
        this.mouse.x = e.pageX - this.size.offsetX;
        this.mouse.y = e.pageY - this.size.offsetY;
    }

    updateMouseSpeed() {
        const dx = this.mouse.prevX - this.mouse.x;
        const dy = this.mouse.prevY - this.mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.mouse.speed += (dist - this.mouse.speed) * 0.5;
        if (this.mouse.speed < 0.001) this.mouse.speed = 0;
        this.mouse.prevX = this.mouse.x;
        this.mouse.prevY = this.mouse.y;
    }

    animate() {
        this.frameCount++;
        const dots = this.dots;
        const m = this.mouse;
        const { w, h } = this.size;
        const p = this.options;
        const len = dots.length;
        const t = this.frameCount * 0.02;

        const targetEngagement = Math.min(m.speed / 5, 1);
        this.engagement += (targetEngagement - this.engagement) * 0.06;
        if (this.engagement < 0.001) this.engagement = 0;
        const eng = this.engagement;

        this.glowOpacity += (eng - this.glowOpacity) * 0.08;

        if (this.glow) {
            this.glow.setAttribute('cx', m.x);
            this.glow.setAttribute('cy', m.y);
            this.glow.style.opacity = this.glowOpacity;
        }

        this.ctx.clearRect(0, 0, w, h);

        const grad = this.ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, p.gradientFrom);
        grad.addColorStop(1, p.gradientTo);
        this.ctx.fillStyle = grad;

        const cr = p.cursorRadius;
        const crSq = cr * cr;
        const rad = p.dotRadius / 2;
        const isBulge = p.bulgeOnly;

        this.ctx.beginPath();

        for (let i = 0; i < len; i++) {
            const d = dots[i];
            const dx = m.x - d.ax;
            const dy = m.y - d.ay;
            const distSq = dx * dx + dy * dy;

            if (distSq < crSq && eng > 0.01) {
                const dist = Math.sqrt(distSq);
                if (isBulge) {
                    const t = 1 - dist / cr;
                    const push = t * t * p.bulgeStrength * eng;
                    const angle = Math.atan2(dy, dx);
                    d.sx += (d.ax - Math.cos(angle) * push - d.sx) * 0.15;
                    d.sy += (d.ay - Math.sin(angle) * push - d.sy) * 0.15;
                } else {
                    const angle = Math.atan2(dy, dx);
                    const move = (500 / dist) * (m.speed * p.cursorForce);
                    d.vx += Math.cos(angle) * -move;
                    d.vy += Math.sin(angle) * -move;
                }
            } else if (isBulge) {
                d.sx += (d.ax - d.sx) * 0.1;
                d.sy += (d.ay - d.sy) * 0.1;
            }

            if (!isBulge) {
                d.vx *= 0.9;
                d.vy *= 0.9;
                d.x = d.ax + d.vx;
                d.y = d.ay + d.vy;
                d.sx += (d.x - d.sx) * 0.1;
                d.sy += (d.y - d.sy) * 0.1;
            }

            let drawX = d.sx;
            let drawY = d.sy;
            if (p.waveAmplitude > 0) {
                drawY += Math.sin(d.ax * 0.03 + t) * p.waveAmplitude;
                drawX += Math.cos(d.ay * 0.03 + t * 0.7) * p.waveAmplitude * 0.5;
            }

            if (p.sparkle) {
                const hash = ((i * 2654435761) ^ (this.frameCount >> 3)) >>> 0;
                if ((hash % 100) < 3) {
                    this.ctx.moveTo(drawX + rad * 1.8, drawY);
                    this.ctx.arc(drawX, drawY, rad * 1.8, 0, Math.PI * 2);
                } else {
                    this.ctx.moveTo(drawX + rad, drawY);
                    this.ctx.arc(drawX, drawY, rad, 0, Math.PI * 2);
                }
            } else {
                this.ctx.moveTo(drawX + rad, drawY);
                this.ctx.arc(drawX, drawY, rad, 0, Math.PI * 2);
            }
        }

        this.ctx.fill();

        this.rafId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        cancelAnimationFrame(this.rafId);
        clearInterval(this.speedInterval);
        clearTimeout(this.resizeTimer);
        window.removeEventListener('resize', () => this.handleResize());
        window.removeEventListener('mousemove', (e) => this.handleMouseMove(e));
        if (this.wrapper && this.wrapper.parentNode) {
            this.wrapper.parentNode.removeChild(this.wrapper);
        }
    }

    updateOptions(newOptions) {
        Object.assign(this.options, newOptions);
        this.buildDots(this.size.w, this.size.h);
    }
}

// Автоматическая инициализация для элементов с data-dot-field
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded: looking for [data-dot-field]');
    const elements = document.querySelectorAll('[data-dot-field]');
    console.log(`Found ${elements.length} elements`);
    elements.forEach(el => {
        console.log('Initializing DotField on', el);
        const options = {};
        if (el.dataset.dotRadius) options.dotRadius = parseFloat(el.dataset.dotRadius);
        if (el.dataset.dotSpacing) options.dotSpacing = parseFloat(el.dataset.dotSpacing);
        if (el.dataset.bulgeStrength) options.bulgeStrength = parseFloat(el.dataset.bulgeStrength);
        if (el.dataset.glowRadius) options.glowRadius = parseFloat(el.dataset.glowRadius);
        if (el.dataset.sparkle) options.sparkle = el.dataset.sparkle === 'true';
        if (el.dataset.waveAmplitude) options.waveAmplitude = parseFloat(el.dataset.waveAmplitude);
        if (el.dataset.gradientFrom) options.gradientFrom = el.dataset.gradientFrom;
        if (el.dataset.gradientTo) options.gradientTo = el.dataset.gradientTo;
        if (el.dataset.glowColor) options.glowColor = el.dataset.glowColor;

        new DotField(el, options);
    });
});
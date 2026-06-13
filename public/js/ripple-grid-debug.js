/**
 * Debug version of RippleGrid
 */
class RippleGridDebug {
    constructor(container, options = {}) {
        alert('RippleGridDebug constructor called');
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);
        console.log('RippleGridDebug initialized', container);

        this.setupCanvas();
        this.drawTest();
        this.animate();
    }

    setupCanvas() {
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '-1';
        this.canvas.style.border = '5px solid red';
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

    drawTest() {
        const { ctx } = this;
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        console.log('Drawing test', width, height);
        
        // Clear with semi-transparent blue
        ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
        ctx.fillRect(0, 0, width, height);
        
        // Draw big red X
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, height);
        ctx.moveTo(width, 0);
        ctx.lineTo(0, height);
        ctx.stroke();
        
        // Draw text
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.fillText('RippleGrid Debug', 50, 50);
    }

    animate() {
        console.log('animate called');
        this.drawTest();
        requestAnimationFrame(() => this.animate());
    }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - debug');
    const elements = document.querySelectorAll('[data-ripple-grid]');
    console.log('Found elements:', elements.length);
    elements.forEach(el => {
        new RippleGridDebug(el);
    });
});
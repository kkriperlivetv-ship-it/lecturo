/**
 * RippleGrid WebGL implementation using OGL
 * Based on React Bits RippleGrid component
 */
class RippleGridWebGL {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            gridColor: '#4A6FFF',
            rippleIntensity: 0.05,
            gridSize: 8,
            gridThickness: 5, // тонкие линии
            fadeDistance: 1.8,
            vignetteStrength: 1.2,
            glowIntensity: 0.2,
            opacity: 0.9,
            mouseInteraction: true,
            mouseInteractionRadius: 1.5,
            enableRainbow: false,
            ...options
        };

        this.time = 0;
        this.mouse = { x: 0.5, y: 0.5 };
        this.targetMouse = { x: 0.5, y: 0.5 };
        this.mouseInfluence = 0;

        this.canvas = document.createElement('canvas');
        this.container.appendChild(this.canvas);

        this.gl = null;
        this.program = null;
        this.vertexBuffer = null;
        this.indexBuffer = null;
        this.uniforms = {};

        this.initWebGL();
        this.bindEvents();
        this.animate();
    }

    async initWebGL() {
        // Инициализация OGL
        const { Renderer, Geometry, Program, Mesh } = await import('ogl');

        this.gl = this.canvas.getContext('webgl', {
            alpha: true,
            antialias: true,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false
        });

        if (!this.gl) {
            console.error('WebGL not supported');
            return;
        }

        this.renderer = new Renderer({
            canvas: this.canvas,
            width: this.canvas.width,
            height: this.canvas.height,
            dpr: window.devicePixelRatio,
            alpha: true
        });
        this.gl = this.renderer.gl;
        this.gl.clearColor(0, 0, 0, 0);

        // Вершинный шейдер
        const vert = `
            attribute vec2 position;
            uniform float time;
            uniform vec2 mouse;
            uniform float mouseInfluence;
            uniform float gridSize;
            uniform float rippleIntensity;
            uniform float fadeDistance;
            uniform float vignetteStrength;
            uniform float opacity;
            uniform vec2 resolution;
            varying float vAlpha;
            varying vec3 vColor;

            void main() {
                // Сетка
                vec2 pos = position * gridSize;
                float dist = length(pos);
                float ripple = sin(3.14159 * (time - dist / 100.0)) * rippleIntensity * 10.0;

                // Влияние мыши
                float mouseRipple = 0.0;
                if (mouseInfluence > 0.0) {
                    vec2 mousePos = mouse * resolution;
                    vec2 gridPos = pos * 10.0; // масштаб
                    float mouseDist = distance(gridPos, mousePos);
                    float influence = mouseInfluence * exp(-mouseDist * mouseDist / (1500.0));
                    mouseRipple = sin(3.14159 * (time * 2.0 - mouseDist / 50.0)) * influence * rippleIntensity * 5.0;
                }

                vec2 offset = pos * (ripple + mouseRipple) / 100.0;
                vec2 finalPos = pos + offset;

                // Преобразование в координаты клипа
                vec2 normalized = finalPos / resolution * 2.0 - 1.0;
                gl_Position = vec4(normalized, 0.0, 1.0);

                // Затухание и виньетка
                float maxDist = length(resolution) / 2.0;
                float fade = exp(-2.0 * pow(dist / maxDist, fadeDistance));
                float vignette = 1.0 - pow(dist / maxDist, vignetteStrength);
                vAlpha = fade * vignette * opacity;

                // Цвет
                vColor = vec3(0.29, 0.44, 1.0); // #4A6FFF в RGB
            }
        `;

        // Фрагментный шейдер
        const frag = `
            precision highp float;
            varying float vAlpha;
            varying vec3 vColor;
            uniform float glowIntensity;

            void main() {
                vec3 glow = vColor * glowIntensity;
                gl_FragColor = vec4(vColor + glow, vAlpha);
            }
        `;

        // Создание геометрии сетки
        const gridCells = 30;
        const vertices = [];
        const indices = [];
        let idx = 0;

        for (let i = -gridCells; i <= gridCells; i++) {
            for (let j = -gridCells; j <= gridCells; j++) {
                vertices.push(i, j);
                if (i < gridCells && j < gridCells) {
                    indices.push(idx, idx + 1, idx + gridCells * 2 + 1);
                    indices.push(idx + gridCells * 2 + 1, idx + 1, idx + gridCells * 2 + 2);
                }
                idx++;
            }
        }

        this.geometry = new Geometry(this.gl, {
            position: { size: 2, data: new Float32Array(vertices) }
        });
        this.geometry.setIndex(new Uint16Array(indices));

        this.program = new Program(this.gl, {
            vertex: vert,
            fragment: frag,
            uniforms: {
                time: { value: 0 },
                mouse: { value: [0.5, 0.5] },
                mouseInfluence: { value: 0 },
                gridSize: { value: this.options.gridSize },
                rippleIntensity: { value: this.options.rippleIntensity },
                fadeDistance: { value: this.options.fadeDistance },
                vignetteStrength: { value: this.options.vignetteStrength },
                opacity: { value: this.options.opacity },
                glowIntensity: { value: this.options.glowIntensity },
                resolution: { value: [this.canvas.width, this.canvas.height] }
            }
        });

        this.mesh = new Mesh(this.gl, { geometry: this.geometry, program: this.program });
        this.resize();
    }

    resize() {
        if (!this.renderer) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.renderer.setSize(width, height);
        if (this.program) {
            this.program.uniforms.resolution.value = [width, height];
        }
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());
        if (this.options.mouseInteraction) {
            this.container.addEventListener('mousemove', (e) => {
                const rect = this.container.getBoundingClientRect();
                this.targetMouse.x = (e.clientX - rect.left) / rect.width;
                this.targetMouse.y = (e.clientY - rect.top) / rect.height;
            });
            this.container.addEventListener('mouseenter', () => {
                this.mouseInfluence = 1;
            });
            this.container.addEventListener('mouseleave', () => {
                this.mouseInfluence = 0;
            });
        }
    }

    animate() {
        if (!this.renderer) return;
        const animateFrame = () => {
            this.time += 0.016; // ~60 FPS
            if (this.program) {
                this.program.uniforms.time.value = this.time;
                this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.1;
                this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.1;
                this.program.uniforms.mouse.value = [this.mouse.x, this.mouse.y];
                this.program.uniforms.mouseInfluence.value = this.mouseInfluence;
                this.renderer.render({ scene: this.mesh });
            }
            requestAnimationFrame(animateFrame);
        };
        requestAnimationFrame(animateFrame);
    }

    destroy() {
        window.removeEventListener('resize', this.resize);
        if (this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        // TODO: освободить WebGL ресурсы
    }
}

// Автоматическая инициализация всех элементов с data-ripple-grid
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-ripple-grid]').forEach(el => {
        const options = {
            gridColor: el.dataset.gridColor || '#4A6FFF',
            rippleIntensity: parseFloat(el.dataset.rippleIntensity) || 0.05,
            gridSize: parseInt(el.dataset.gridSize) || 8,
            gridThickness: parseInt(el.dataset.gridThickness) || 5,
            fadeDistance: parseFloat(el.dataset.fadeDistance) || 1.8,
            vignetteStrength: parseFloat(el.dataset.vignetteStrength) || 1.2,
            glowIntensity: parseFloat(el.dataset.glowIntensity) || 0.2,
            opacity: parseFloat(el.dataset.opacity) || 0.9,
            mouseInteraction: el.dataset.mouseInteraction !== 'false',
            mouseInteractionRadius: parseFloat(el.dataset.mouseInteractionRadius) || 1.5,
            enableRainbow: el.dataset.enableRainbow === 'true'
        };
        new RippleGridWebGL(el, options);
    });
});
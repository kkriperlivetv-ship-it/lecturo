/**
 * RippleGrid from React Bits - адаптирован для vanilla JavaScript
 * Использует OGL для WebGL-рендеринга
 */
class RippleGridReactBits {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            enableRainbow: false,
            gridColor: '#1a0c80',
            rippleIntensity: 0.07,
            gridSize: 10.0,
            gridThickness: 18.0,
            fadeDistance: 1.2,
            vignetteStrength: 1.4,
            glowIntensity: 0.3,
            opacity: 0.8,
            gridRotation: 0,
            mouseInteraction: true,
            mouseInteractionRadius: 0.7,
            ...options
        };

        this.mousePosition = { x: 0.5, y: 0.5 };
        this.targetMouse = { x: 0.5, y: 0.5 };
        this.mouseInfluence = 0;
        this.uniforms = null;
        this.renderer = null;
        this.gl = null;
        this.mesh = null;
        this.animationId = null;

        this.init();
    }

    async init() {
        if (!this.container) return;

        // Динамический импорт OGL (уже установлен)
        const { Renderer, Program, Triangle, Mesh } = await import('ogl');

        this.renderer = new Renderer({
            dpr: Math.min(window.devicePixelRatio, 2),
            alpha: true
        });
        this.gl = this.renderer.gl;
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.canvas.style.width = '100%';
        this.gl.canvas.style.height = '100%';
        this.gl.canvas.style.position = 'absolute';
        this.gl.canvas.style.top = '0';
        this.gl.canvas.style.left = '0';
        this.gl.canvas.style.zIndex = '-1';
        this.container.appendChild(this.gl.canvas);

        const vert = `
attribute vec2 position;
varying vec2 vUv;
void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
}`;

        const frag = `precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform bool enableRainbow;
uniform vec3 gridColor;
uniform float rippleIntensity;
uniform float gridSize;
uniform float gridThickness;
uniform float fadeDistance;
uniform float vignetteStrength;
uniform float glowIntensity;
uniform float opacity;
uniform float gridRotation;
uniform bool mouseInteraction;
uniform vec2 mousePosition;
uniform float mouseInfluence;
uniform float mouseInteractionRadius;
varying vec2 vUv;

float pi = 3.141592;

mat2 rotate(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    if (gridRotation != 0.0) {
        uv = rotate(gridRotation * pi / 180.0) * uv;
    }

    float dist = length(uv);
    float func = sin(pi * (iTime - dist));
    vec2 rippleUv = uv + uv * func * rippleIntensity;

    if (mouseInteraction && mouseInfluence > 0.0) {
        vec2 mouseUv = (mousePosition * 2.0 - 1.0);
        mouseUv.x *= iResolution.x / iResolution.y;
        float mouseDist = length(uv - mouseUv);
        
        float influence = mouseInfluence * exp(-mouseDist * mouseDist / (mouseInteractionRadius * mouseInteractionRadius));
        
        float mouseWave = sin(pi * (iTime * 2.0 - mouseDist * 3.0)) * influence;
        rippleUv += normalize(uv - mouseUv) * mouseWave * rippleIntensity * 0.3;
    }

    vec2 a = sin(gridSize * 0.5 * pi * rippleUv - pi / 2.0);
    vec2 b = abs(a);

    float aaWidth = 0.5;
    vec2 smoothB = vec2(
        smoothstep(0.0, aaWidth, b.x),
        smoothstep(0.0, aaWidth, b.y)
    );

    vec3 color = vec3(0.0);
    color += exp(-gridThickness * smoothB.x * (0.8 + 0.5 * sin(pi * iTime)));
    color += exp(-gridThickness * smoothB.y);
    color += 0.5 * exp(-(gridThickness / 4.0) * sin(smoothB.x));
    color += 0.5 * exp(-(gridThickness / 3.0) * smoothB.y);

    if (glowIntensity > 0.0) {
        color += glowIntensity * exp(-gridThickness * 0.5 * smoothB.x);
        color += glowIntensity * exp(-gridThickness * 0.5 * smoothB.y);
    }

    float ddd = exp(-2.0 * clamp(pow(dist, fadeDistance), 0.0, 1.0));
    
    vec2 vignetteCoords = vUv - 0.5;
    float vignetteDistance = length(vignetteCoords);
    float vignette = 1.0 - pow(vignetteDistance * 2.0, vignetteStrength);
    vignette = clamp(vignette, 0.0, 1.0);
    
    vec3 t;
    if (enableRainbow) {
        t = vec3(
            uv.x * 0.5 + 0.5 * sin(iTime),
            uv.y * 0.5 + 0.5 * cos(iTime),
            pow(cos(iTime), 4.0)
        ) + 0.5;
    } else {
        t = gridColor;
    }

    float finalFade = ddd * vignette;
    float alpha = length(color) * finalFade * opacity;
    gl_FragColor = vec4(color * t * finalFade * opacity, alpha);
}`;

        const hexToRgb = hex => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result
                ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255]
                : [1, 1, 1];
        };

        this.uniforms = {
            iTime: { value: 0 },
            iResolution: { value: [1, 1] },
            enableRainbow: { value: this.options.enableRainbow },
            gridColor: { value: hexToRgb(this.options.gridColor) },
            rippleIntensity: { value: this.options.rippleIntensity },
            gridSize: { value: this.options.gridSize },
            gridThickness: { value: this.options.gridThickness },
            fadeDistance: { value: this.options.fadeDistance },
            vignetteStrength: { value: this.options.vignetteStrength },
            glowIntensity: { value: this.options.glowIntensity },
            opacity: { value: this.options.opacity },
            gridRotation: { value: this.options.gridRotation },
            mouseInteraction: { value: this.options.mouseInteraction },
            mousePosition: { value: [0.5, 0.5] },
            mouseInfluence: { value: 0 },
            mouseInteractionRadius: { value: this.options.mouseInteractionRadius }
        };

        const geometry = new Triangle(this.gl);
        const program = new Program(this.gl, { vertex: vert, fragment: frag, uniforms: this.uniforms });
        this.mesh = new Mesh(this.gl, { geometry, program });

        this.resize();
        window.addEventListener('resize', () => this.resize());

        if (this.options.mouseInteraction) {
            this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
            this.container.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
            this.container.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        }

        this.animate();
    }

    resize() {
        const { clientWidth: w, clientHeight: h } = this.container;
        this.renderer.setSize(w, h);
        this.uniforms.iResolution.value = [w, h];
    }

    handleMouseMove(e) {
        if (!this.options.mouseInteraction) return;
        const rect = this.container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = 1.0 - (e.clientY - rect.top) / rect.height; // Flip Y coordinate
        this.targetMouse = { x, y };
    }

    handleMouseEnter() {
        if (!this.options.mouseInteraction) return;
        this.mouseInfluence = 1.0;
    }

    handleMouseLeave() {
        if (!this.options.mouseInteraction) return;
        this.mouseInfluence = 0.0;
    }

    animate = (t) => {
        if (!this.uniforms) return;

        this.uniforms.iTime.value = t * 0.001;

        const lerpFactor = 0.1;
        this.mousePosition.x += (this.targetMouse.x - this.mousePosition.x) * lerpFactor;
        this.mousePosition.y += (this.targetMouse.y - this.mousePosition.y) * lerpFactor;

        const currentInfluence = this.uniforms.mouseInfluence.value;
        const targetInfluence = this.mouseInfluence;
        this.uniforms.mouseInfluence.value += (targetInfluence - currentInfluence) * 0.05;

        this.uniforms.mousePosition.value = [this.mousePosition.x, this.mousePosition.y];

        this.renderer.render({ scene: this.mesh });
        this.animationId = requestAnimationFrame(this.animate);
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', () => this.resize());
        if (this.options.mouseInteraction && this.container) {
            this.container.removeEventListener('mousemove', this.handleMouseMove);
            this.container.removeEventListener('mouseenter', this.handleMouseEnter);
            this.container.removeEventListener('mouseleave', this.handleMouseLeave);
        }
        this.gl.getExtension('WEBGL_lose_context')?.loseContext();
        if (this.gl.canvas && this.container.contains(this.gl.canvas)) {
            this.container.removeChild(this.gl.canvas);
        }
    }
}

// Автоматическая инициализация всех элементов с data-ripple-grid-react
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-ripple-grid-react]').forEach(el => {
        const options = {
            enableRainbow: el.getAttribute('data-enable-rainbow') === 'true',
            gridColor: el.getAttribute('data-grid-color') || '#1a0c80',
            rippleIntensity: parseFloat(el.getAttribute('data-ripple-intensity')) || 0.07,
            gridSize: parseFloat(el.getAttribute('data-grid-size')) || 10.0,
            gridThickness: parseFloat(el.getAttribute('data-grid-thickness')) || 18.0,
            fadeDistance: parseFloat(el.getAttribute('data-fade-distance')) || 1.2,
            vignetteStrength: parseFloat(el.getAttribute('data-vignette-strength')) || 1.4,
            glowIntensity: parseFloat(el.getAttribute('data-glow-intensity')) || 0.3,
            opacity: parseFloat(el.getAttribute('data-opacity')) || 0.8,
            gridRotation: parseFloat(el.getAttribute('data-grid-rotation')) || 0,
            mouseInteraction: el.getAttribute('data-mouse-interaction') !== 'false',
            mouseInteractionRadius: parseFloat(el.getAttribute('data-mouse-interaction-radius')) || 0.7,
        };
        new RippleGridReactBits(el, options);
    });
});

window.RippleGridReactBits = RippleGridReactBits;
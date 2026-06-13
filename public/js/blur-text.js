/**
 * BlurText vanilla JS implementation
 * Inspired by React Bits BlurText component
 */
class BlurText {
    constructor(element, options = {}) {
        this.element = element;
        this.text = options.text || element.textContent.trim();
        this.delay = options.delay || 200;
        this.animateBy = options.animateBy || 'words'; // 'words' or 'letters'
        this.direction = options.direction || 'top'; // 'top' or 'bottom'
        this.threshold = options.threshold || 0.1;
        this.rootMargin = options.rootMargin || '0px';
        this.stepDuration = options.stepDuration || 0.35; // seconds
        this.onAnimationComplete = options.onAnimationComplete;

        this.elements = [];
        this.inView = false;
        this.animationCompleted = false;

        this.init();
    }

    init() {
        // Clear element content
        this.element.textContent = '';
        this.element.style.display = 'flex';
        this.element.style.flexWrap = 'wrap';

        // Split text into segments
        const segments = this.animateBy === 'words' ? this.text.split(' ') : this.text.split('');

        segments.forEach((segment, index) => {
            const span = document.createElement('span');
            span.className = 'blur-text-segment';
            span.textContent = segment === ' ' ? '\u00A0' : segment;
            span.style.display = 'inline-block';
            span.style.willChange = 'transform, filter, opacity';
            span.style.opacity = '0';
            span.style.filter = 'blur(10px)';
            span.style.transform = this.direction === 'top' ? 'translateY(-50px)' : 'translateY(50px)';
            span.style.transition = `all ${this.stepDuration}s ease`;

            this.element.appendChild(span);
            this.elements.push(span);

            // Add space after word if needed
            if (this.animateBy === 'words' && index < segments.length - 1) {
                const space = document.createTextNode('\u00A0');
                this.element.appendChild(space);
            }
        });

        // Observe intersection
        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !this.inView) {
                        this.inView = true;
                        this.animate();
                        this.observer.unobserve(this.element);
                    }
                });
            },
            { threshold: this.threshold, rootMargin: this.rootMargin }
        );
        this.observer.observe(this.element);
    }

    animate() {
        this.elements.forEach((span, index) => {
            setTimeout(() => {
                span.style.opacity = '1';
                span.style.filter = 'blur(0px)';
                span.style.transform = 'translateY(0)';

                // Call completion callback on last element
                if (index === this.elements.length - 1) {
                    setTimeout(() => {
                        if (this.onAnimationComplete) {
                            this.onAnimationComplete();
                        }
                        this.animationCompleted = true;
                    }, this.stepDuration * 1000);
                }
            }, index * this.delay);
        });
    }

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// Auto-initialize elements with data-blur-text attribute
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-blur-text]').forEach(el => {
        const options = {
            text: el.getAttribute('data-text') || undefined,
            delay: parseInt(el.getAttribute('data-delay')) || 200,
            animateBy: el.getAttribute('data-animate-by') || 'words',
            direction: el.getAttribute('data-direction') || 'top',
            threshold: parseFloat(el.getAttribute('data-threshold')) || 0.1,
            rootMargin: el.getAttribute('data-root-margin') || '0px',
            stepDuration: parseFloat(el.getAttribute('data-step-duration')) || 0.35,
        };
        new BlurText(el, options);
    });
});

// Export for manual usage
window.BlurText = BlurText;
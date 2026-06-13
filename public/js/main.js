document.addEventListener('DOMContentLoaded', function() {
    // Duration inputs
    document.querySelectorAll('input[name="duration"]').forEach(input => {
        input.addEventListener('change', updateTotalTime);
    });

    // Search in catalog
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            document.querySelectorAll('.course-card').forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                const genre = card.querySelector('.course-genre').textContent.toLowerCase();
                card.style.display = (title.includes(searchTerm) || genre.includes(searchTerm)) ? 'block' : 'none';
            });
        });
    }

    // Card animations
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('animate-in');
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.animate-on-scroll, .course-card, .feature-card').forEach(el => cardObserver.observe(el));

    // Flash messages → toast
    document.querySelectorAll('.alert-success, .alert-danger, .alert-warning, .alert-info').forEach(alert => {
        let message = alert.textContent.trim().replace(/×/g, '').trim();
        if (!message) { alert.style.display = 'none'; return; }
        let type = 'info';
        if (alert.classList.contains('alert-success')) type = 'success';
        else if (alert.classList.contains('alert-danger')) type = 'error';
        else if (alert.classList.contains('alert-warning')) type = 'warning';
        showToast(message, type);
        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transition = 'opacity 0.5s';
            setTimeout(() => { alert.style.display = 'none'; }, 500);
        }, 500);
    });

    // URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('success')) showToast(urlParams.get('success'), 'success');
    if (urlParams.has('error')) showToast(urlParams.get('error'), 'error');

    if (window.location.hash === '#test') {
        setTimeout(() => showToast('Система уведомлений работает!', 'success'), 1000);
    }

    // Initial help notification update
    updateHelpNotificationCount();

    // Initial moderation badge update
    updateModerationBadge();
});

// Periodic updates
setInterval(updateHelpNotificationCount, 30000);
setInterval(updateModerationBadge, 60000);

// Stats counter animation
const introSection = document.querySelector('.intro-section');
if (introSection) {
    new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                document.querySelectorAll('.stat-number').forEach(counter => {
                    const target = parseInt(counter.getAttribute('data-count'));
                    if (!isNaN(target)) animateCounter(counter, target);
                });
            }
        });
    }, { threshold: 0.3 }).observe(introSection);
}

function animateCounter(element, target, duration) {
    duration = duration || 2000;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(start);
        }
    }, 16);
}

function updateTotalTime() {
    let totalTime = 0;
    document.querySelectorAll('input[name="duration"]').forEach(input => {
        totalTime += parseInt(input.value) || 0;
    });
    const el = document.getElementById('totalTime');
    if (el) el.value = totalTime;
}

function setHelpNotificationCount(count) {
    const notification = document.getElementById('helpNotification');
    if (!notification) return;
    if (count > 0) {
        notification.textContent = count;
        notification.style.display = 'block';
    } else {
        notification.style.display = 'none';
    }
}

async function updateHelpNotificationCount() {
    try {
        const response = await fetch('/api/help/unread-count', { headers: { 'Accept': 'application/json' } });
        if (!response.ok) { setHelpNotificationCount(0); return; }
        const data = await response.json();
        setHelpNotificationCount(Number.isFinite(data.count) ? data.count : 0);
    } catch (e) {
        setHelpNotificationCount(0);
    }
}

async function updateModerationBadge() {
    const badge = document.getElementById('moderationBadge');
    if (!badge) return;
    try {
        const response = await fetch('/moderation/api/pending-count', { headers: { 'Accept': 'application/json' } });
        if (!response.ok) return;
        const data = await response.json();
        const count = data.count || 0;
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    } catch (e) {
        // silently ignore
    }
}

function showNotification(message, type) {
    showToast(message, type || 'info');
}

function showToast(message, type, title) {
    type = type || 'info';
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
        document.body.appendChild(toastContainer);
    }

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const titles = { success: 'Успех', error: 'Ошибка', warning: 'Внимание', info: 'Информация' };

    const toast = document.createElement('div');
    toast.className = 'notification-toast ' + type;
    toast.innerHTML =
        '<div class="notification-toast-icon">' + (icons[type] || 'ℹ️') + '</div>' +
        '<div class="notification-toast-content">' +
            '<div class="notification-toast-title">' + (title || titles[type] || 'Информация') + '</div>' +
            '<div class="notification-toast-message">' + message + '</div>' +
        '</div>' +
        '<button class="notification-toast-close">&times;</button>';

    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    toast.querySelector('.notification-toast-close').addEventListener('click', () => closeToast(toast));
    toast._autoCloseTimer = setTimeout(() => closeToast(toast), type === 'error' ? 8000 : 5000);
}

function closeToast(toast) {
    if (toast._autoCloseTimer) clearTimeout(toast._autoCloseTimer);
    toast.classList.remove('show');
    toast.classList.add('hiding');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 500);
}

// Animation CSS
(function() {
    const s = document.createElement('style');
    s.textContent = [
        '.notification{position:fixed;top:20px;right:20px;padding:1rem 1.5rem;border-radius:8px;color:white;z-index:1000;',
        'transform:translateX(150%);transition:transform 0.3s ease;display:flex;align-items:center;',
        'justify-content:space-between;min-width:300px;max-width:400px;}',
        '.notification.show{transform:translateX(0);}',
        '.notification-success{background-color:#2ED573;border-left:4px solid #1ABC9C;}',
        '.notification-error{background-color:#FF4757;border-left:4px solid #E84118;}',
        '.notification-close{background:none;border:none;color:white;font-size:1.5rem;cursor:pointer;margin-left:1rem;}',
        '.animate-in{animation:fadeInUp 0.5s ease forwards;}',
        '@keyframes fadeInUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}'
    ].join('');
    document.head.appendChild(s);
})();

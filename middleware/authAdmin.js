const { Op } = require('sequelize');
const { User, Subscription } = require('../models');

const DEFAULT_SUBSCRIPTION_FEATURES = {
    videoSearch: false,
    webinarArchive: false,
    pdfTemplates: false
};

const SYNC_INTERVAL_MS = 2 * 60 * 1000; // re-sync at most once every 2 minutes

async function syncSessionUser(sessionUser, { force = false } = {}) {
    const now = Date.now();
    if (!force && sessionUser._syncedAt && (now - sessionUser._syncedAt) < SYNC_INTERVAL_MS) {
        return sessionUser;
    }

    const user = await User.findByPk(sessionUser.id);
    if (!user) {
        return null;
    }

    const activeSubscription = await Subscription.findOne({
        where: {
            userId: user.id,
            status: 'active',
            endDate: { [Op.gt]: new Date() }
        },
        order: [['endDate', 'DESC'], ['createdAt', 'DESC']]
    });

    const hasActiveSubscription = !!activeSubscription;
    const subscriptionExpiresAt = activeSubscription?.endDate || null;

    let parsedFeatures = hasActiveSubscription ? activeSubscription.features : null;
    if (typeof parsedFeatures === 'string') {
        try { parsedFeatures = JSON.parse(parsedFeatures); } catch (e) { parsedFeatures = null; }
    }
    const ALL_FEATURES = { videoSearch: true, webinarArchive: true, pdfTemplates: true };
    const subscriptionFeatures = hasActiveSubscription
        ? (parsedFeatures || ALL_FEATURES)
        : DEFAULT_SUBSCRIPTION_FEATURES;

    let storedFeatures = user.subscriptionFeatures;
    if (typeof storedFeatures === 'string') {
        try {
            storedFeatures = JSON.parse(storedFeatures);
        } catch (e) {
            storedFeatures = DEFAULT_SUBSCRIPTION_FEATURES;
        }
    }

    if (
        user.hasActiveSubscription !== hasActiveSubscription ||
        String(user.subscriptionExpiresAt || '') !== String(subscriptionExpiresAt || '') ||
        JSON.stringify(storedFeatures || DEFAULT_SUBSCRIPTION_FEATURES) !== JSON.stringify(subscriptionFeatures)
    ) {
        await user.update({
            hasActiveSubscription,
            subscriptionExpiresAt,
            subscriptionFeatures
        });
    }

    return {
        ...sessionUser,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        twoFactorEnabled: user.twoFactorEnabled,
        hasActiveSubscription,
        subscriptionExpiresAt,
        subscriptionFeatures,
        _syncedAt: now
    };
}

// Middleware для проверки, что пользователь аутентифицирован
async function requireAuth(req, res, next) {
    if (!req.session.user) {
        req.flash('error', 'Требуется авторизация');
        return res.redirect('/auth/login');
    }

    try {
        const syncedUser = await syncSessionUser(req.session.user);
        if (!syncedUser) {
            req.session.destroy(() => {});
            req.flash('error', 'Пользователь не найден');
            return res.redirect('/auth/login');
        }

        req.session.user = syncedUser;
        req.user = syncedUser;
        next();
    } catch (error) {
        console.error('Ошибка синхронизации сессии пользователя:', error);
        res.status(500).send('Ошибка сервера');
    }
}

// Middleware для проверки, что пользователь является администратором или владельцем
function requireAdmin(req, res, next) {
    if (!req.session.user) {
        req.flash('error', 'Требуется авторизация');
        return res.redirect('/auth/login');
    }
    
    if (req.session.user.role !== 'admin' && req.session.user.role !== 'owner') {
        req.flash('error', 'Недостаточно прав. Требуется роль администратора или владельца');
        return res.redirect('/');
    }
    
    next();
}

const LOG_SKIP_PREFIXES = ['/admin', '/api/help/unread-count', '/api/video-search'];
const LOG_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

function logAction(req, res, next) {
    next();

    if (!req.session.user) return;
    if (!LOG_METHODS.has(req.method)) return;
    if (LOG_SKIP_PREFIXES.some(p => req.path.startsWith(p))) return;

    const { Log } = require('../models');
    Log.create({
        userId: req.session.user.id,
        action: `${req.method} ${req.path}`,
        details: JSON.stringify({ params: req.params, query: req.query }),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
    }).catch(err => console.error('Ошибка при логировании:', err.message));
}

// Псевдоним для обратной совместимости
const isAuthenticated = requireAuth;

module.exports = {
    requireAuth,
    requireAdmin,
    logAction,
    isAuthenticated,
    syncSessionUser
}

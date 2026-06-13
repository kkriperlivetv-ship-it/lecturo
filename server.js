require('dotenv').config();

const express = require('express');
const http = require('http');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const { WebSocketServer } = require('ws');
const { sequelize } = require('./config/database');
const { DataTypes } = require('sequelize');
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const indexRoutes = require('./routes/index');
const adminRoutes = require('./routes/admin');
const moderationRoutes = require('./routes/moderation');
const debugRoutes = require('./routes/debug');
const subscriptionRoutes = require('./routes/subscription');
const videoSearchRoutes = require('./routes/video-search');
const premiumContentRoutes = require('./routes/premium-content');
const premiumRoutes = require('./routes/premium');
const { logAction } = require('./middleware/authAdmin');
const Payment = require('./models/Payment');
const Ticket = require('./models/Ticket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

const helpSockets = new Set();

function sendJson(socket, payload) {
    if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(payload));
    }
}

function broadcastHelp(payload, filter) {
    for (const socket of helpSockets) {
        if (socket.readyState !== socket.OPEN) {
            continue;
        }

        if (!filter || filter(socket)) {
            socket.send(JSON.stringify(payload));
        }
    }
}

async function getHelpCountForSessionUser(user) {
    if (!user || !user.id) {
        return 0;
    }

    const isSupportUser = user.role === 'admin' || user.role === 'owner';

    if (isSupportUser) {
        return Ticket.count({
            where: {
                status: ['waiting', 'in_progress']
            }
        });
    }

    return Ticket.count({
        where: {
            userId: user.id,
            status: ['waiting', 'in_progress']
        }
    });
}

async function broadcastHelpBadgeUpdate(targetUserId) {
    if (targetUserId) {
        const sockets = Array.from(helpSockets).filter(socket => String(socket.userId) === String(targetUserId));
        for (const socket of sockets) {
            const count = await getHelpCountForSessionUser({ id: socket.userId, role: socket.userRole });
            sendJson(socket, { type: 'HELP_BADGE_UPDATE', count });
        }
        return;
    }

    const supportSockets = Array.from(helpSockets).filter(socket => socket.isSupportUser);
    for (const socket of supportSockets) {
        const count = await getHelpCountForSessionUser({ id: socket.userId, role: socket.userRole });
        sendJson(socket, { type: 'HELP_BADGE_UPDATE', count });
    }
}

app.locals.helpRealtime = {
    emitTicketCreated(ticket) {
        broadcastHelp({ type: 'TICKET_CREATED', ticket });
        void broadcastHelpBadgeUpdate();
    },
    emitTicketAccepted(ticket) {
        broadcastHelp({ type: 'TICKET_ACCEPTED', ticket });
        void broadcastHelpBadgeUpdate();
        void broadcastHelpBadgeUpdate(ticket.userId);
    },
    emitTicketClosed(ticket) {
        broadcastHelp({ type: 'TICKET_CLOSED', ticket });
        void broadcastHelpBadgeUpdate();
        void broadcastHelpBadgeUpdate(ticket.userId);
    },
    emitTicketMessage(message, ticket) {
        broadcastHelp({ type: 'TICKET_MESSAGE_CREATED', message, ticket }, socket => socket.ticketId === message.ticketId);
        void broadcastHelpBadgeUpdate();
        void broadcastHelpBadgeUpdate(ticket.userId);
    }
};

async function ensureCoursesModerationColumns() {
    try {
        const qi = sequelize.getQueryInterface();
        const desc = await qi.describeTable('Courses');
        if (!desc.moderationStatus) {
            await qi.addColumn('Courses', 'moderationStatus', {
                type: DataTypes.STRING(20),
                allowNull: false,
                defaultValue: 'approved'
            });
        }
        if (!desc.moderationComment) {
            await qi.addColumn('Courses', 'moderationComment', {
                type: DataTypes.TEXT,
                allowNull: true
            });
        }
    } catch (err) {
        console.error('Ошибка миграции Courses:', err.message);
    }
}

async function ensureWebinarsLessonIdColumn() {
    try {
        const qi = sequelize.getQueryInterface();
        const desc = await qi.describeTable('Webinars');
        if (!desc.lessonId) {
            await qi.addColumn('Webinars', 'lessonId', {
                type: DataTypes.INTEGER,
                allowNull: true
            });
        }
    } catch (err) {
        console.error('Ошибка миграции Webinars:', err.message);
    }
}

async function ensureUserTwoFactorColumns() {
    try {
        const qi = sequelize.getQueryInterface();
        const desc = await qi.describeTable('Users');
        if (!desc.twoFactorEnabled) {
            await qi.addColumn('Users', 'twoFactorEnabled', {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            });
        }
        if (!desc.twoFactorSecret) {
            await qi.addColumn('Users', 'twoFactorSecret', {
                type: DataTypes.STRING,
                allowNull: true
            });
        }
        if (!desc.twoFactorTempSecret) {
            await qi.addColumn('Users', 'twoFactorTempSecret', {
                type: DataTypes.STRING,
                allowNull: true
            });
        }
    } catch (err) {
        console.error('Ошибка миграции Users:', err.message);
    }
}

// Настройка шаблонизатора EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');
// Отключение кэширования шаблонов в development
app.set('view cache', false);

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Сессии — PostgreSQL на проде, in-memory локально
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'online-courses-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 дней
};
if (process.env.DATABASE_URL) {
    const pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    const store = new pgSession({
        pool: pgPool,
        tableName: 'session',
        createTableIfMissing: true
    });
    store.on('error', (err) => {
        console.error('Session store error (non-fatal):', err.message);
    });
    sessionConfig.store = store;
}
app.use(session(sessionConfig));

// Flash сообщения
app.use(flash());

// Middleware для передачи user и flash сообщений в шаблоны
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    const successFlash = req.flash('success');
    const errorFlash = req.flash('error');
    res.locals.messages = {
        success: successFlash.length > 0 ? successFlash[0] : null,
        error: errorFlash.length > 0 ? errorFlash[0] : null
    };
    next();
});

// Middleware для логирования действий пользователей
app.use(logAction);

// Маршруты
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/courses', courseRoutes);
app.use('/admin', adminRoutes);
app.use('/moderation', moderationRoutes);
app.use('/debug', debugRoutes);
app.use('/api', subscriptionRoutes);
app.use('/api/video-search', videoSearchRoutes);
app.use('/api/premium-content', premiumContentRoutes);
app.use('/premium', premiumRoutes);

const wss = new WebSocketServer({ server });

wss.on('connection', (socket, req) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const userId = requestUrl.searchParams.get('userId');
    const userRole = requestUrl.searchParams.get('role') || 'user';

    socket.userId = userId;
    socket.userRole = userRole;
    socket.isSupportUser = userRole === 'admin' || userRole === 'owner';
    socket.ticketId = null;
    helpSockets.add(socket);

    socket.on('message', async (rawMessage) => {
        try {
            const data = JSON.parse(String(rawMessage));

            if (data.type === 'JOIN_TICKET') {
                socket.ticketId = data.ticketId || null;
                return;
            }

            if (data.type === 'LEAVE_TICKET') {
                if (socket.ticketId === data.ticketId) {
                    socket.ticketId = null;
                }
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });

    socket.on('close', () => {
        helpSockets.delete(socket);
    });

    void getHelpCountForSessionUser({ id: socket.userId, role: socket.userRole })
        .then(count => sendJson(socket, { type: 'HELP_BADGE_UPDATE', count }))
        .catch(error => console.error('Failed to send initial help count:', error));
});

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Обработка 404
app.use((req, res) => {
    res.status(404).render('404', { title: 'Страница не найдена' });
});

// Глобальный error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    if (res.headersSent) return;
    if (req.xhr || (req.headers.accept || '').includes('application/json')) {
        return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
    }
    res.status(500).send('Ошибка сервера');
});

// Запускаем сервер сразу — чтобы Render принял порт и статика отдавалась мгновенно
server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});

async function ensureOwnerAccount() {
    try {
        const { User } = require('./models');
        const ownerEmail = process.env.OWNER_EMAIL || 'marathon868@gmail.com';
        const ownerPassword = process.env.OWNER_PASSWORD || 'Kedamo1551';
        const existing = await User.findOne({ where: { email: ownerEmail } });
        if (!existing) {
            await User.create({
                username: 'owner',
                email: ownerEmail,
                password: ownerPassword,
                role: 'owner',
                isProtected: true
            });
            console.log('Аккаунт владельца создан:', ownerEmail);
        } else if (existing.role !== 'owner') {
            await existing.update({ role: 'owner', isProtected: true });
            console.log('Аккаунт владельца обновлён:', ownerEmail);
        }
    } catch (err) {
        console.error('Ошибка создания владельца:', err.message);
    }
}

// Синхронизация базы данных в фоне (не блокирует порт)
sequelize.sync({ force: false }).then(async () => {
    await ensureCoursesModerationColumns();
    await ensureWebinarsLessonIdColumn();
    await ensureUserTwoFactorColumns();
    await ensureOwnerAccount();
    console.log('База данных синхронизирована');
}).catch(err => {
    console.error('Ошибка синхронизации БД:', err);
});

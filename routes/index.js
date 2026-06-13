const express = require('express');
const { Course, User, Lesson, Payment, Ticket, TicketMessage } = require('../models');
const { Sequelize } = require('sequelize');
const router = express.Router();

function isSupportUser(user) {
    return user && (user.role === 'admin' || user.role === 'owner');
}

function getHelpRealtime(req) {
    return req.app.locals.helpRealtime;
}

router.get('/', async (req, res) => {
    try {
        const approvedFilter = { moderationStatus: 'approved' };
        const [courses, usersCount, lessonsCount, coursesCount] = await Promise.all([
            Course.findAll({
                where: approvedFilter,
                order: [['createdAt', 'DESC']],
                limit: 10
            }),
            User.count(),
            Lesson.count(),
            Course.count({ where: approvedFilter })
        ]);
        console.log('Stats:', { courses: coursesCount, users: usersCount, lessons: lessonsCount });
        res.render('index', {
            title: 'Главная',
            courses,
            stats: {
                courses: coursesCount,
                users: usersCount,
                lessons: lessonsCount
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

router.get('/about', (req, res) => {
    res.render('about', { title: 'О проекте' });
});

router.get('/help', async (req, res) => {
    try {
        let userTickets = [];
        let activeTicketId = null;
        let activeTicket = null;
        let ticketMessages = [];
        const supportUser = isSupportUser(req.session.user);
        
        if (req.session.user?.id) {
            const where = supportUser
                ? {}
                : { userId: req.session.user.id };

            userTickets = await Ticket.findAll({
                where,
                order: [['status', 'ASC'], ['updatedAt', 'DESC'], ['createdAt', 'DESC']]
            });

            activeTicketId = req.query.ticketId || (userTickets[0] && userTickets[0].id) || null;

            if (activeTicketId) {
                activeTicket = userTickets.find(ticket => ticket.id === activeTicketId) || null;

                if (!activeTicket) {
                    activeTicket = await Ticket.findOne({
                        where: supportUser
                            ? { id: activeTicketId }
                            : { id: activeTicketId, userId: req.session.user.id }
                    });
                }

                if (activeTicket) {
                    ticketMessages = await TicketMessage.findAll({
                        where: { ticketId: activeTicket.id },
                        order: [['createdAt', 'ASC']]
                    });
                }
            }
        }
        
        res.render('tickets', {
            title: 'Помощь',
            userTickets,
            currentUserId: req.session.user?.id || null,
            activeTicket,
            activeTicketId,
            ticketMessages,
            admin: supportUser,
            isSupportUser: supportUser
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

router.post('/help', async (req, res) => {
    try {
        const { topic, description } = req.body;
        
        if (!req.session.user?.id) {
            return res.redirect('/auth/login');
        }
        
        // Create new ticket
        const ticket = await Ticket.create({
            userId: req.session.user.id,
            userName: req.session.user.name || req.session.user.username || 'Пользователь',
            subject: topic,
            description: description,
            status: 'waiting'
        });

        getHelpRealtime(req)?.emitTicketCreated(ticket.toJSON());
        
        req.flash('success', 'Ваше обращение успешно отправлено! Номер обращения: #' + ticket.id);
        res.redirect('/help');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Ошибка при отправке обращения. Пожалуйста, попробуйте позже.');
        res.redirect('/help');
    }
});

// Accept ticket route (Admin only)
router.post('/help/:id/accept', async (req, res) => {
    try {
        if (!req.session.user?.id || !isSupportUser(req.session.user)) {
            return res.status(403).json({ success: false, error: 'Доступ запрещен' });
        }
        
        const ticketId = req.params.id;
        const ticket = await Ticket.findByPk(ticketId);
        
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Обращение не найдено' });
        }
        
        if (ticket.status !== 'waiting') {
            return res.status(400).json({ success: false, error: 'Обращение не в состоянии ожидания' });
        }
        
        // Update ticket status
        await ticket.update({
            status: 'in_progress',
            acceptedAt: new Date()
        });

        getHelpRealtime(req)?.emitTicketAccepted(ticket.toJSON());
        
        res.json({ success: true, ticket });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Close ticket route (Admin only)
router.post('/help/:id/close', async (req, res) => {
    try {
        if (!req.session.user?.id || !isSupportUser(req.session.user)) {
            return res.status(403).json({ success: false, error: 'Доступ запрещен' });
        }
        
        const ticketId = req.params.id;
        const ticket = await Ticket.findByPk(ticketId);
        
        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Обращение не найдено' });
        }
        
        if (ticket.status === 'closed') {
            return res.status(400).json({ success: false, error: 'Обращение уже закрыто' });
        }
        
        // Update ticket status
        await ticket.update({
            status: 'closed',
            closedAt: new Date()
        });

        getHelpRealtime(req)?.emitTicketClosed(ticket.toJSON());
        
        res.json({ success: true, ticket });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

router.get('/api/help/tickets/:id/messages', async (req, res) => {
    try {
        if (!req.session.user?.id) {
            return res.status(401).json({ success: false, error: 'Требуется авторизация' });
        }

        const supportUser = isSupportUser(req.session.user);
        const ticket = await Ticket.findOne({
            where: supportUser
                ? { id: req.params.id }
                : { id: req.params.id, userId: req.session.user.id }
        });

        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Обращение не найдено' });
        }

        const messages = await TicketMessage.findAll({
            where: { ticketId: ticket.id },
            order: [['createdAt', 'ASC']]
        });

        res.json({ success: true, ticket, messages });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

router.post('/api/help/tickets/:id/messages', async (req, res) => {
    try {
        if (!req.session.user?.id) {
            return res.status(401).json({ success: false, error: 'Требуется авторизация' });
        }

        const text = String(req.body.text || '').trim();
        if (!text) {
            return res.status(400).json({ success: false, error: 'Сообщение не может быть пустым' });
        }

        const supportUser = isSupportUser(req.session.user);
        const ticket = await Ticket.findOne({
            where: supportUser
                ? { id: req.params.id }
                : { id: req.params.id, userId: req.session.user.id }
        });

        if (!ticket) {
            return res.status(404).json({ success: false, error: 'Обращение не найдено' });
        }

        if (ticket.status !== 'in_progress') {
            return res.status(400).json({ success: false, error: 'Чат доступен только для обращений в работе' });
        }

        const message = await TicketMessage.create({
            ticketId: ticket.id,
            authorId: req.session.user.id,
            authorName: req.session.user.name || req.session.user.username || 'Пользователь',
            text
        });

        getHelpRealtime(req)?.emitTicketMessage(message.toJSON(), ticket.toJSON());

        res.json({ success: true, message, ticket });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Ошибка сервера' });
    }
});

// Get unread count for help notifications
router.get('/api/help/unread-count', async (req, res) => {
    try {
        if (!req.session.user?.id) {
            return res.json({ count: 0 });
        }

        // For admin: count of waiting tickets
        // For regular user: count of their tickets that are not closed
        let count = 0;
        const whereConditions = {};
        
        if (isSupportUser(req.session.user)) {
            whereConditions.status = {
                [Sequelize.Op.in]: ['waiting', 'in_progress']
            };
        } else {
            whereConditions.userId = req.session.user.id;
            whereConditions.status = {
                [Sequelize.Op.not]: 'closed'
            };
        }
        
        // Exclude specific ticket if provided (e.g., when viewing that ticket)
        if (req.query.excludeTicketId) {
            const ticketId = parseInt(req.query.excludeTicketId);
            if (!isNaN(ticketId)) {
                whereConditions.id = {
                    [Sequelize.Op.ne]: ticketId
                };
            }
        }

        count = await Ticket.count({
            where: whereConditions
        });

        res.json({ count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ count: 0 });
    }
});

// Удаление тикета (только owner)
router.post('/help/:id/delete', async (req, res) => {
    try {
        if (!req.session.user?.id || req.session.user.role !== 'owner') {
            return res.status(403).json({ success: false, error: 'Доступ запрещен' });
        }

        const ticket = await Ticket.findByPk(req.params.id);
        if (!ticket) {
            req.flash('error', 'Заявка не найдена');
            return res.redirect('/help');
        }

        await TicketMessage.destroy({ where: { ticketId: ticket.id } });
        await ticket.destroy();

        req.flash('success', 'Заявка удалена');
        res.redirect('/help');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Ошибка при удалении заявки');
        res.redirect('/help');
    }
});

module.exports = router;

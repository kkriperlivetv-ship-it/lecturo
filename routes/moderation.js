const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/authAdmin');
const { Course, User, Log } = require('../models');

router.get('/', requireAdmin, async (req, res) => {
    try {
        const pendingCourses = await Course.findAll({
            where: { moderationStatus: 'pending' },
            include: [{ model: User, attributes: ['id', 'username', 'email'] }],
            order: [['createdAt', 'DESC']]
        });
        res.render('moderation', {
            title: 'Модерация курсов',
            pendingCourses,
            admin: true
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

router.get('/api/pending-count', requireAdmin, async (req, res) => {
    try {
        const count = await Course.count({ where: { moderationStatus: 'pending' } });
        res.json({ count });
    } catch (error) {
        res.json({ count: 0 });
    }
});

router.post('/:id/approve', requireAdmin, async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);
        if (!course) {
            req.flash('error', 'Курс не найден');
            return res.redirect('/moderation');
        }
        await course.update({ moderationStatus: 'approved', moderationComment: null });
        await Log.create({
            userId: req.session.user.id,
            action: 'APPROVE_COURSE',
            details: JSON.stringify({ courseId: course.id, courseTitle: course.title, by: req.session.user.username }),
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        req.flash('success', `Курс «${course.title}» одобрен и опубликован`);
        res.redirect('/moderation');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Ошибка при одобрении курса');
        res.redirect('/moderation');
    }
});

router.post('/:id/reject', requireAdmin, async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);
        if (!course) {
            req.flash('error', 'Курс не найден');
            return res.redirect('/moderation');
        }
        const comment = (req.body.comment || '').trim() || null;
        await course.update({ moderationStatus: 'rejected', moderationComment: comment });
        await Log.create({
            userId: req.session.user.id,
            action: 'REJECT_COURSE',
            details: JSON.stringify({ courseId: course.id, courseTitle: course.title, comment, by: req.session.user.username }),
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        req.flash('success', `Курс «${course.title}» отклонён`);
        res.redirect('/moderation');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Ошибка при отклонении курса');
        res.redirect('/moderation');
    }
});

module.exports = router;

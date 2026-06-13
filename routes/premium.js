const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/authAdmin');
const { Webinar, PdfMaterial, Course } = require('../models');
const { Op } = require('sequelize');

function parseFeatures(raw) {
    if (!raw) return {};
    if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch (e) { return {}; }
    }
    return raw;
}

function formatDuration(minutes) {
    if (!minutes) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} мин`;
    return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
}

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
}

// GET /premium/video-search
router.get('/video-search', requireAuth, (req, res) => {
    const user = req.user;
    const features = parseFeatures(user.subscriptionFeatures);
    res.render('premium/video-search', {
        title: 'Поиск по видео',
        hasAccess: !!(user.hasActiveSubscription && features.videoSearch)
    });
});

// GET /premium/webinars
router.get('/webinars', requireAuth, async (req, res) => {
    const user = req.user;
    const features = parseFeatures(user.subscriptionFeatures);
    const hasAccess = !!(user.hasActiveSubscription && features.webinarArchive);

    if (!hasAccess) {
        return res.render('premium/webinars', {
            title: 'Архив вебинаров',
            hasAccess,
            webinars: [], categories: [], currentCategory: 'all',
            total: 0, page: 1, totalPages: 1, formatDuration
        });
    }

    try {
        const { category = 'all', page = '1' } = req.query;
        const limit = 12;
        const offset = (parseInt(page) - 1) * limit;
        const where = { isActive: true };
        if (category !== 'all') where.category = category;

        const [webinars, total, catRows] = await Promise.all([
            Webinar.findAll({ where, order: [['date', 'DESC']], limit, offset }),
            Webinar.count({ where }),
            Webinar.findAll({
                attributes: ['category'],
                where: { isActive: true, category: { [Op.not]: null } },
                group: ['category'], raw: true
            })
        ]);

        res.render('premium/webinars', {
            title: 'Архив вебинаров', hasAccess, webinars,
            categories: catRows.map(r => r.category).filter(Boolean),
            currentCategory: category, total,
            page: parseInt(page), totalPages: Math.ceil(total / limit), formatDuration
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Ошибка сервера');
    }
});

// GET /premium/pdfs
router.get('/pdfs', requireAuth, async (req, res) => {
    const user = req.user;
    const features = parseFeatures(user.subscriptionFeatures);
    const hasAccess = !!(user.hasActiveSubscription && features.pdfTemplates);

    if (!hasAccess) {
        return res.render('premium/pdfs', {
            title: 'Шаблоны и чек-листы', hasAccess,
            materials: [], categories: [], courses: [],
            currentCategory: 'all', currentCourse: 'all', total: 0, formatFileSize
        });
    }

    try {
        const { category = 'all', courseId = 'all' } = req.query;
        const where = { isActive: true };
        if (category !== 'all') where.category = category;
        if (courseId !== 'all') where.courseId = parseInt(courseId);

        const [materials, total, catRows, courseIdRows] = await Promise.all([
            PdfMaterial.findAll({
                where,
                include: [{ model: Course, attributes: ['id', 'title'] }],
                order: [['createdAt', 'DESC']]
            }),
            PdfMaterial.count({ where }),
            PdfMaterial.findAll({
                attributes: ['category'],
                where: { isActive: true, category: { [Op.not]: null } },
                group: ['category'], raw: true
            }),
            PdfMaterial.findAll({
                attributes: ['courseId'],
                where: { isActive: true, courseId: { [Op.not]: null } },
                group: ['courseId'], raw: true
            })
        ]);

        const courseIds = courseIdRows.map(r => r.courseId).filter(Boolean);
        const courses = courseIds.length
            ? await Course.findAll({ where: { id: courseIds }, attributes: ['id', 'title'] })
            : [];

        res.render('premium/pdfs', {
            title: 'Шаблоны и чек-листы', hasAccess, materials, total,
            categories: catRows.map(r => r.category).filter(Boolean),
            courses,
            currentCategory: category, currentCourse: courseId, formatFileSize
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Ошибка сервера');
    }
});

// GET /premium/pdfs/:id/download
router.get('/pdfs/:id/download', requireAuth, async (req, res) => {
    const user = req.user;
    const features = parseFeatures(user.subscriptionFeatures);
    if (!user.hasActiveSubscription || !features.pdfTemplates) {
        req.flash('error', 'Для скачивания необходима Premium подписка');
        return res.redirect('/premium/pdfs');
    }

    try {
        const material = await PdfMaterial.findByPk(req.params.id);
        if (!material || !material.isActive) {
            req.flash('error', 'Материал не найден');
            return res.redirect('/premium/pdfs');
        }

        await material.increment('downloads');

        const filePath = path.join(__dirname, '..', 'public', material.fileUrl);
        if (fs.existsSync(filePath)) {
            return res.download(filePath, material.fileName);
        }

        req.flash('error', 'Файл временно недоступен');
        res.redirect('/premium/pdfs');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Ошибка при скачивании');
        res.redirect('/premium/pdfs');
    }
});

module.exports = router;

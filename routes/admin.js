const express = require('express');
const path = require('path');
const router = express.Router();
const { requireAdmin } = require('../middleware/authAdmin');
const { User, Course, Log, Lesson, Webinar, PdfMaterial } = require('../models');
const { uploadPdf } = require('../middleware/upload');
const { sequelize } = require('../config/database');

// Главная страница админ-панели
router.get('/', requireAdmin, async (req, res) => {
    try {
        const usersCount = await User.count();
        const coursesCount = await Course.count();
        const logsCount = await Log.count();
        
        res.render('admin/index', {
            title: 'Админ-панель',
            usersCount,
            coursesCount,
            logsCount,
            admin: true
        });
    } catch (error) {
        console.error('Ошибка при загрузке админ-панели:', error);
        req.flash('error', 'Ошибка при загрузке админ-панели');
        res.redirect('/');
    }
});

// Просмотр всех пользователей
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const users = await User.findAll({
            order: [['createdAt', 'DESC']]
        });
        
        res.render('admin/users', {
            title: 'Управление пользователями',
            users,
            admin: true
        });
    } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
        req.flash('error', 'Ошибка при загрузке пользователей');
        res.redirect('/admin');
    }
});

// Просмотр всех курсов с возможностью удаления
router.get('/courses', requireAdmin, async (req, res) => {
    try {
        const courses = await Course.findAll({
            include: [{
                model: User,
                attributes: ['id', 'username', 'email']
            }],
            order: [['createdAt', 'DESC']]
        });
        
        res.render('admin/courses', {
            title: 'Управление курсами',
            courses,
            admin: true
        });
    } catch (error) {
        console.error('Ошибка при загрузке курсов:', error);
        req.flash('error', 'Ошибка при загрузке курсов');
        res.redirect('/admin');
    }
});

// Удаление курса (админ может удалить любой курс)
router.post('/courses/:id/delete', requireAdmin, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const courseId = req.params.id;
        const course = await Course.findByPk(courseId, { transaction });
        
        if (!course) {
            await transaction.rollback();
            req.flash('error', 'Курс не найден');
            return res.redirect('/admin/courses');
        }
        
        // Удаляем вебинары, привязанные к урокам этого курса
        const lessonIds = (await Lesson.findAll({ where: { courseId }, attributes: ['id'], transaction })).map(l => l.id);
        if (lessonIds.length > 0) {
            await Webinar.destroy({ where: { lessonId: lessonIds }, transaction });
        }

        // Удаляем связанные уроки вручную (каскадное удаление может не сработать)
        await Lesson.destroy({
            where: { courseId: courseId },
            transaction
        });
        
        // Удаляем курс
        await course.destroy({ transaction });
        
        // Логируем действие
        await Log.create({
            userId: req.session.user.id,
            action: `DELETE_COURSE`,
            details: JSON.stringify({
                courseId: courseId,
                courseTitle: course.title,
                deletedBy: req.session.user.username
            }),
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        }, { transaction });
        
        await transaction.commit();
        
        req.flash('success', `Курс "${course.title}" успешно удален`);
        res.redirect('/admin/courses');
    } catch (error) {
        await transaction.rollback();
        console.error('Ошибка при удалении курса:', error);
        req.flash('error', `Ошибка при удалении курса: ${error.message}`);
        res.redirect('/admin/courses');
    }
});

// Просмотр логов пользователей
router.get('/logs', requireAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;
        
        const { count, rows: logs } = await Log.findAndCountAll({
            include: [{
                model: User,
                attributes: ['id', 'username', 'email']
            }],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });
        
        const totalPages = Math.ceil(count / limit);
        
        res.render('admin/logs', {
            title: 'Логи пользователей',
            logs,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            admin: true
        });
    } catch (error) {
        console.error('Ошибка при загрузке логов:', error);
        req.flash('error', 'Ошибка при загрузке логов');
        res.redirect('/admin');
    }
});

// Изменение роли пользователя
router.post('/users/:id/role', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { role } = req.body;
        
        if (!['user', 'admin', 'owner'].includes(role)) {
            req.flash('error', 'Некорректная роль');
            return res.redirect('/admin/users');
        }
        
        const user = await User.findByPk(userId);
        
        if (!user) {
            req.flash('error', 'Пользователь не найден');
            return res.redirect('/admin/users');
        }
        
        // Запрещаем изменение роли защищённого пользователя
        if (user.isProtected) {
            req.flash('error', 'Нельзя изменить роль защищённого пользователя');
            return res.redirect('/admin/users');
        }
        
        // Не позволяем изменить роль самого себя (текущего админа)
        if (user.id === req.session.user.id) {
            req.flash('error', 'Нельзя изменить свою собственную роль');
            return res.redirect('/admin/users');
        }
        
        user.role = role;
        await user.save();
        
        // Логируем действие
        await Log.create({
            userId: req.session.user.id,
            action: `CHANGE_USER_ROLE`,
            details: JSON.stringify({
                targetUserId: userId,
                targetUsername: user.username,
                newRole: role,
                changedBy: req.session.user.username
            }),
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        req.flash('success', `Роль пользователя ${user.username} изменена на ${role}`);
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Ошибка при изменении роли пользователя:', error);
        req.flash('error', 'Ошибка при изменении роли пользователя');
        res.redirect('/admin/users');
    }
});

// GET /admin/premium — Premium content management
router.get('/premium', requireAdmin, async (req, res) => {
    try {
        const [webinars, pdfs, courses] = await Promise.all([
            Webinar.findAll({ order: [['date', 'DESC']] }),
            PdfMaterial.findAll({
                include: [{ model: Course, attributes: ['id', 'title'] }],
                order: [['createdAt', 'DESC']]
            }),
            Course.findAll({ attributes: ['id', 'title'], order: [['title', 'ASC']] })
        ]);

        res.render('admin/premium-content', {
            title: 'Управление Premium-контентом',
            webinars,
            pdfs,
            courses,
            admin: true
        });
    } catch (err) {
        console.error(err);
        req.flash('error', 'Ошибка загрузки premium-контента');
        res.redirect('/admin');
    }
});

// POST /admin/premium/webinars — Add webinar
router.post('/premium/webinars', requireAdmin, async (req, res) => {
    try {
        const { title, description, date, duration, videoUrl, thumbnailUrl, category, speaker } = req.body;

        if (!title || !date || !videoUrl) {
            req.flash('error', 'Заполните обязательные поля: название, дата, ссылка на видео');
            return res.redirect('/admin/premium');
        }

        await Webinar.create({
            title: title.trim(),
            description: description?.trim() || null,
            date: new Date(date),
            duration: duration ? parseInt(duration) : null,
            videoUrl: videoUrl.trim(),
            thumbnailUrl: thumbnailUrl?.trim() || null,
            category: category?.trim() || null,
            speaker: speaker?.trim() || null,
            accessLevel: 'premium',
            isActive: true
        });

        req.flash('success', 'Вебинар добавлен');
        res.redirect('/admin/premium');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Ошибка при добавлении вебинара: ' + err.message);
        res.redirect('/admin/premium');
    }
});

// POST /admin/premium/webinars/:id/delete — Delete webinar
router.post('/premium/webinars/:id/delete', requireAdmin, async (req, res) => {
    try {
        const webinar = await Webinar.findByPk(req.params.id);
        if (!webinar) {
            req.flash('error', 'Вебинар не найден');
            return res.redirect('/admin/premium');
        }
        await webinar.destroy();
        req.flash('success', 'Вебинар удалён');
        res.redirect('/admin/premium');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Ошибка при удалении вебинара');
        res.redirect('/admin/premium');
    }
});

// POST /admin/premium/pdfs — Add PDF material
router.post('/premium/pdfs', requireAdmin, uploadPdf.single('pdfFile'), async (req, res) => {
    try {
        const { title, description, category, module: moduleName, courseId } = req.body;

        if (!title || !req.file) {
            req.flash('error', 'Заполните название и загрузите PDF файл');
            return res.redirect('/admin/premium');
        }

        const fileUrl = '/uploads/pdfs/' + req.file.filename;

        await PdfMaterial.create({
            title: title.trim(),
            description: description?.trim() || null,
            fileName: req.file.originalname,
            fileUrl,
            fileSize: req.file.size,
            courseId: courseId ? parseInt(courseId) : null,
            module: moduleName?.trim() || null,
            category: category?.trim() || null,
            accessLevel: 'premium',
            isActive: true
        });

        req.flash('success', 'PDF материал добавлен');
        res.redirect('/admin/premium');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Ошибка при добавлении PDF: ' + err.message);
        res.redirect('/admin/premium');
    }
});

// POST /admin/premium/pdfs/:id/delete — Delete PDF material
router.post('/premium/pdfs/:id/delete', requireAdmin, async (req, res) => {
    try {
        const mat = await PdfMaterial.findByPk(req.params.id);
        if (!mat) {
            req.flash('error', 'Материал не найден');
            return res.redirect('/admin/premium');
        }

        // Remove file from disk if it exists
        const filePath = path.join(__dirname, '..', 'public', mat.fileUrl);
        const fs = require('fs');
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await mat.destroy();
        req.flash('success', 'PDF материал удалён');
        res.redirect('/admin/premium');
    } catch (err) {
        console.error(err);
        req.flash('error', 'Ошибка при удалении PDF');
        res.redirect('/admin/premium');
    }
});

module.exports = router;
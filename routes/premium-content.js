const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Webinar, PdfMaterial, Course } = require('../models');
const { isAuthenticated } = require('../middleware/authAdmin');

// Получить список вебинаров (только для premium пользователей)
router.get('/webinars', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const { category, limit = 20, page = 1 } = req.query;
        
        // Проверяем подписку
        const user = await User.findByPk(userId);
        if (!user.hasActiveSubscription || !user.subscriptionFeatures?.webinarArchive) {
            return res.status(403).json({ 
                success: false, 
                message: 'Для доступа к архиву вебинаров необходима Premium подписка' 
            });
        }
        
        const whereClause = { isActive: true };
        
        // Фильтр по категории
        if (category && category !== 'all') {
            whereClause.category = category;
        }
        
        // Получаем общее количество
        const total = await Webinar.count({ where: whereClause });
        
        // Получаем вебинары с пагинацией
        const webinars = await Webinar.findAll({
            where: whereClause,
            order: [['date', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });
        
        // Получаем уникальные категории
        const categories = await Webinar.findAll({
            attributes: ['category'],
            where: { category: { [Op.not]: null }, isActive: true },
            group: ['category']
        });
        
        res.json({
            success: true,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            categories: categories.map(c => c.category).filter(Boolean),
            webinars: webinars.map(webinar => ({
                id: webinar.id,
                title: webinar.title,
                description: webinar.description,
                date: webinar.date,
                duration: webinar.duration,
                videoUrl: webinar.videoUrl,
                thumbnailUrl: webinar.thumbnailUrl,
                category: webinar.category,
                speaker: webinar.speaker,
                views: webinar.views,
                accessLevel: webinar.accessLevel
            }))
        });
    } catch (error) {
        console.error('Ошибка при получении списка вебинаров:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Получить детали вебинара
router.get('/webinars/:id', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        // Проверяем подписку
        const user = await User.findByPk(userId);
        if (!user.hasActiveSubscription || !user.subscriptionFeatures?.webinarArchive) {
            return res.status(403).json({ 
                success: false, 
                message: 'Для доступа к архиву вебинаров необходима Premium подписка' 
            });
        }
        
        const webinar = await Webinar.findByPk(id);
        
        if (!webinar) {
            return res.status(404).json({ 
                success: false, 
                message: 'Вебинар не найден' 
            });
        }
        
        // Увеличиваем счетчик просмотров
        await webinar.update({ views: webinar.views + 1 });
        
        res.json({
            success: true,
            webinar: {
                id: webinar.id,
                title: webinar.title,
                description: webinar.description,
                date: webinar.date,
                duration: webinar.duration,
                videoUrl: webinar.videoUrl,
                thumbnailUrl: webinar.thumbnailUrl,
                category: webinar.category,
                speaker: webinar.speaker,
                views: webinar.views + 1, // Уже увеличенное значение
                accessLevel: webinar.accessLevel,
                createdAt: webinar.createdAt
            }
        });
    } catch (error) {
        console.error('Ошибка при получении деталей вебинара:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Получить список PDF материалов
router.get('/pdf-materials', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId, category, limit = 20, page = 1 } = req.query;
        
        // Проверяем подписку
        const user = await User.findByPk(userId);
        if (!user.hasActiveSubscription || !user.subscriptionFeatures?.pdfTemplates) {
            return res.status(403).json({ 
                success: false, 
                message: 'Для доступа к PDF материалам необходима Premium подписка' 
            });
        }
        
        const whereClause = { isActive: true };
        
        // Фильтр по курсу
        if (courseId && courseId !== 'all') {
            whereClause.courseId = courseId;
        }
        
        // Фильтр по категории
        if (category && category !== 'all') {
            whereClause.category = category;
        }
        
        // Получаем общее количество
        const total = await PdfMaterial.count({ where: whereClause });
        
        // Получаем материалы с пагинацией
        const materials = await PdfMaterial.findAll({
            where: whereClause,
            include: [{
                model: Course,
                attributes: ['id', 'title']
            }],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit)
        });
        
        // Получаем уникальные категории
        const categories = await PdfMaterial.findAll({
            attributes: ['category'],
            where: { category: { [Op.not]: null }, isActive: true },
            group: ['category']
        });
        
        // Получаем список курсов для фильтрации
        const courses = await Course.findAll({
            attributes: ['id', 'title'],
            where: { id: { [Op.in]: materials.map(m => m.courseId).filter(Boolean) } }
        });
        
        res.json({
            success: true,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
            categories: categories.map(c => c.category).filter(Boolean),
            courses,
            materials: materials.map(material => ({
                id: material.id,
                title: material.title,
                description: material.description,
                fileName: material.fileName,
                fileUrl: material.fileUrl,
                fileSize: material.fileSize,
                courseId: material.courseId,
                courseTitle: material.Course?.title,
                module: material.module,
                category: material.category,
                downloads: material.downloads,
                accessLevel: material.accessLevel,
                createdAt: material.createdAt
            }))
        });
    } catch (error) {
        console.error('Ошибка при получении списка PDF материалов:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Скачать PDF материал
router.get('/pdf-materials/:id/download', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        
        // Проверяем подписку
        const user = await User.findByPk(userId);
        if (!user.hasActiveSubscription || !user.subscriptionFeatures?.pdfTemplates) {
            return res.status(403).json({ 
                success: false, 
                message: 'Для доступа к PDF материалам необходима Premium подписка' 
            });
        }
        
        const material = await PdfMaterial.findByPk(id, {
            include: [{
                model: Course,
                attributes: ['id', 'title']
            }]
        });
        
        if (!material) {
            return res.status(404).json({ 
                success: false, 
                message: 'Материал не найден' 
            });
        }
        
        // Увеличиваем счетчик скачиваний
        await material.update({ downloads: material.downloads + 1 });
        
        // Логируем скачивание
        console.log(`Пользователь ${userId} скачал PDF материал: ${material.title}`);
        
        // В реальном приложении здесь был бы redirect или отдача файла
        // Для демонстрации возвращаем информацию о файле
        res.json({
            success: true,
            message: 'Скачивание начато',
            material: {
                id: material.id,
                title: material.title,
                fileName: material.fileName,
                fileUrl: material.fileUrl,
                fileSize: material.fileSize,
                courseTitle: material.Course?.title,
                downloads: material.downloads + 1
            },
            downloadUrl: material.fileUrl // В реальном приложении это может быть signed URL
        });
    } catch (error) {
        console.error('Ошибка при скачивании PDF материала:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Получить статистику premium контента
router.get('/stats', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Проверяем подписку
        const user = await User.findByPk(userId);
        if (!user.hasActiveSubscription) {
            return res.status(403).json({ 
                success: false, 
                message: 'Для доступа к статистике необходима Premium подписка' 
            });
        }
        
        const totalWebinars = await Webinar.count({ where: { isActive: true } });
        const totalPdfMaterials = await PdfMaterial.count({ where: { isActive: true } });
        const totalWebinarHours = await Webinar.sum('duration', { where: { isActive: true } }) || 0;
        
        res.json({
            success: true,
            stats: {
                totalWebinars,
                totalPdfMaterials,
                totalWebinarHours: Math.round(totalWebinarHours / 60), // Переводим минуты в часы
                subscriptionActive: user.hasActiveSubscription,
                subscriptionExpiresAt: user.subscriptionExpiresAt,
                subscriptionFeatures: user.subscriptionFeatures
            }
        });
    } catch (error) {
        console.error('Ошибка при получении статистики:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

module.exports = router;
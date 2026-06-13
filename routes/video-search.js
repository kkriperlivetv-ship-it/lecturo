const express = require('express');
const router = express.Router();
const { User, Lesson, VideoTranscription, Course } = require('../models');
const { isAuthenticated } = require('../middleware/authAdmin');

// Поиск по видео (только для пользователей с подпиской)
router.post('/search', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const { query, courseId, limit = 10 } = req.body;
        
        if (!query || query.trim().length < 2) {
            return res.status(400).json({ 
                success: false, 
                message: 'Поисковый запрос должен содержать минимум 2 символа' 
            });
        }
        
        // Проверяем, есть ли у пользователя подписка с доступом к поиску по видео
        const user = await User.findByPk(userId);
        if (!user.hasActiveSubscription || !user.subscriptionFeatures?.videoSearch) {
            return res.status(403).json({ 
                success: false, 
                message: 'Для доступа к продвинутому поиску по видео необходима Premium подписка' 
            });
        }
        
        // Поиск по транскрипциям видео
        const whereClause = {};
        if (courseId) {
            // Если указан курс, ищем только уроки этого курса
            const lessons = await Lesson.findAll({
                where: { courseId },
                attributes: ['id']
            });
            const lessonIds = lessons.map(lesson => lesson.id);
            whereClause.lessonId = lessonIds;
        }
        
        const transcriptions = await VideoTranscription.findAll({
            where: {
                ...whereClause,
                status: 'completed'
            },
            include: [{
                model: Lesson,
                include: [{
                    model: Course,
                    attributes: ['id', 'title', 'description']
                }]
            }],
            limit: parseInt(limit)
        });
        
        const results = [];
        const searchQuery = query.toLowerCase().trim();
        
        for (const transcription of transcriptions) {
            const searchResults = transcription.searchWords(searchQuery);
            
            if (searchResults.length > 0) {
                // Форматируем результаты
                const formattedResults = searchResults.map(result => ({
                    text: result.text,
                    startTime: result.startTime,
                    endTime: result.endTime,
                    confidence: result.confidence,
                    formattedTime: formatTime(result.startTime)
                }));
                
                results.push({
                    lessonId: transcription.lessonId,
                    lessonTitle: transcription.Lesson?.title || 'Урок',
                    courseId: transcription.Lesson?.Course?.id,
                    courseTitle: transcription.Lesson?.Course?.title || 'Курс',
                    videoUrl: transcription.videoUrl,
                    matches: formattedResults,
                    totalMatches: searchResults.length
                });
            }
        }
        
        // Сортируем по количеству совпадений
        results.sort((a, b) => b.totalMatches - a.totalMatches);
        
        res.json({
            success: true,
            query,
            totalResults: results.length,
            results: results.slice(0, limit)
        });
    } catch (error) {
        console.error('Ошибка при поиске по видео:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Получить транскрипцию для конкретного урока
router.get('/transcription/:lessonId', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const { lessonId } = req.params;
        
        // Проверяем подписку
        const user = await User.findByPk(userId);
        if (!user.hasActiveSubscription || !user.subscriptionFeatures?.videoSearch) {
            return res.status(403).json({ 
                success: false, 
                message: 'Для доступа к транскрибации видео необходима Premium подписка' 
            });
        }
        
        const transcription = await VideoTranscription.findOne({
            where: { lessonId },
            include: [{
                model: Lesson,
                include: [{
                    model: Course,
                    attributes: ['id', 'title']
                }]
            }]
        });
        
        if (!transcription) {
            return res.status(404).json({ 
                success: false, 
                message: 'Транскрибация для этого урока не найдена' 
            });
        }
        
        res.json({
            success: true,
            transcription: {
                id: transcription.id,
                lessonId: transcription.lessonId,
                lessonTitle: transcription.Lesson?.title,
                courseTitle: transcription.Lesson?.Course?.title,
                duration: transcription.duration,
                language: transcription.language,
                processedAt: transcription.processedAt,
                status: transcription.status,
                hasTranscription: !!transcription.transcription
            }
        });
    } catch (error) {
        console.error('Ошибка при получении транскрипции:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Демо-транскрипция (для тестирования)
router.get('/demo-transcription/:lessonId', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const { lessonId } = req.params;
        
        // Проверяем подписку
        const user = await User.findByPk(userId);
        if (!user.hasActiveSubscription || !user.subscriptionFeatures?.videoSearch) {
            return res.status(403).json({ 
                success: false, 
                message: 'Для доступа к транскрибации видео необходима Premium подписка' 
            });
        }
        
        // Создаем демо-транскрипцию, если ее нет
        let transcription = await VideoTranscription.findOne({
            where: { lessonId }
        });
        
        if (!transcription) {
            // Создаем демо-транскрипцию
            const demoTranscription = [
                {
                    text: "Добро пожаловать на наш курс по программированию.",
                    startTime: 0,
                    endTime: 5,
                    confidence: 0.95
                },
                {
                    text: "Сегодня мы будем изучать основы JavaScript.",
                    startTime: 5,
                    endTime: 10,
                    confidence: 0.92
                },
                {
                    text: "JavaScript - это язык программирования для веб-разработки.",
                    startTime: 10,
                    endTime: 15,
                    confidence: 0.94
                },
                {
                    text: "Он позволяет создавать интерактивные веб-страницы.",
                    startTime: 15,
                    endTime: 20,
                    confidence: 0.91
                },
                {
                    text: "Давайте начнем с переменных и типов данных.",
                    startTime: 20,
                    endTime: 25,
                    confidence: 0.93
                }
            ];
            
            transcription = await VideoTranscription.create({
                lessonId,
                videoUrl: `/uploads/videos/lesson-${lessonId}.mp4`,
                transcription: JSON.stringify(demoTranscription),
                duration: 300,
                language: 'ru',
                processedAt: new Date(),
                status: 'completed'
            });
            
            // Создаем индекс слов
            transcription.createWordIndex();
            await transcription.save();
        }
        
        res.json({
            success: true,
            transcription: JSON.parse(transcription.transcription)
        });
    } catch (error) {
        console.error('Ошибка при получении демо-транскрипции:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Вспомогательная функция для форматирования времени
function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

module.exports = router;
const express = require('express');
const { Course, Lesson, UserCourseProgress, Webinar, User } = require('../models');
const { requireAuth, requireAdmin } = require('../middleware/authAdmin');
const upload = require('../middleware/upload');
const router = express.Router();

// Каталог курсов
router.get('/', async (req, res) => {
    try {
        const courses = await Course.findAll({
            where: { moderationStatus: 'approved' },
            order: [['createdAt', 'DESC']]
        });
        res.render('courses/catalog', { title: 'Каталог курсов', courses });
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

// Страница создания курса
router.get('/create', requireAuth, (req, res) => {
    res.render('courses/create', { title: 'Создать курс', error: null });
});

// Обработка создания курса
router.post('/create', requireAuth, async (req, res) => {
    try {
        const { title, genre, description, totalTime } = req.body;
        const course = await Course.create({
            title,
            genre,
            description,
            totalTime: parseInt(totalTime) || 0,
            userId: req.session.user.id
        });
        res.redirect(`/courses/${course.id}`);
    } catch (error) {
        console.error(error);
        res.render('courses/create', { title: 'Создать курс', error: 'Ошибка при создании курса' });
    }
});

// Страница курса
router.get('/:id', async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id, {
            include: [{ model: Lesson, order: [['order', 'ASC']] }]
        });
        if (!course) {
            return res.status(404).render('404', { title: 'Курс не найден' });
        }

        let userProgress = null;
        if (req.session.user) {
            console.log('GET /courses/:id - пользователь:', req.session.user.id, 'курс:', course.id);
            userProgress = await UserCourseProgress.findOne({
                where: {
                    userId: req.session.user.id,
                    courseId: course.id
                }
            });
            if (userProgress) {
                console.log('Найден userProgress:', userProgress.id, 'completedLessons:', userProgress.completedLessons, 'progress:', userProgress.progress);
            } else {
                console.log('userProgress не найден');
            }
        } else {
            console.log('GET /courses/:id - пользователь не авторизован');
        }

        res.render('courses/detail', {
            title: course.title,
            course,
            userProgress,
            user: req.session.user || null
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

// Начать курс (добавить запись о прогрессе)
router.post('/:id/start', requireAuth, async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);
        if (!course) {
            return res.status(404).send('Курс не найден');
        }

        const [progress, created] = await UserCourseProgress.findOrCreate({
            where: {
                userId: req.session.user.id,
                courseId: course.id
            },
            defaults: {
                status: 'in_progress',
                progress: 0,
                lastAccessedAt: new Date()
            }
        });

        if (!created) {
            // Если запись уже существует, обновляем статус на in_progress, если он not_started
            if (progress.status === 'not_started') {
                await progress.update({
                    status: 'in_progress',
                    lastAccessedAt: new Date()
                });
            }
        }

        res.redirect(`/courses/${course.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

// Завершить курс
router.post('/:id/complete', requireAuth, async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);
        if (!course) {
            return res.status(404).send('Курс не найден');
        }

        const progress = await UserCourseProgress.findOne({
            where: {
                userId: req.session.user.id,
                courseId: course.id
            }
        });

        if (!progress) {
            // Если записи нет, создаем с завершенным статусом
            await UserCourseProgress.create({
                userId: req.session.user.id,
                courseId: course.id,
                status: 'completed',
                progress: 100,
                completedAt: new Date(),
                lastAccessedAt: new Date()
            });
        } else {
            await progress.update({
                status: 'completed',
                progress: 100,
                completedAt: new Date(),
                lastAccessedAt: new Date()
            });
        }

        res.redirect(`/courses/${course.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

// Завершить курс (только создатель) - установить статус курса как завершенный
router.post('/:id/finish', requireAuth, async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);
        if (!course) {
            return res.status(404).send('Курс не найден');
        }

        // Проверяем, является ли пользователь создателем курса
        if (course.userId !== req.session.user.id) {
            return res.status(403).send('Только создатель курса может завершить курс');
        }

        // Обновляем статус курса на 'completed'
        await course.update({ status: 'completed' });

        // Можно также добавить flash сообщение
        req.flash('success', 'Курс завершен. Новые уроки добавляться не будут.');
        res.redirect(`/courses/${course.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

// Обновить прогресс (например, после просмотра урока)
router.post('/:id/update-progress', requireAuth, async (req, res) => {
    try {
        const { progressPercent } = req.body;
        const course = await Course.findByPk(req.params.id);
        if (!course) {
            return res.status(404).send('Курс не найден');
        }

        const percent = parseInt(progressPercent) || 0;
        if (percent < 0 || percent > 100) {
            return res.status(400).send('Некорректный процент');
        }

        const [userProgress] = await UserCourseProgress.findOrCreate({
            where: {
                userId: req.session.user.id,
                courseId: course.id
            },
            defaults: {
                status: percent === 100 ? 'completed' : 'in_progress',
                progress: percent,
                lastAccessedAt: new Date(),
                completedAt: percent === 100 ? new Date() : null
            }
        });

        if (!userProgress.isNewRecord) {
            const newStatus = percent === 100 ? 'completed' : (percent > 0 ? 'in_progress' : 'not_started');
            await userProgress.update({
                status: newStatus,
                progress: percent,
                lastAccessedAt: new Date(),
                completedAt: percent === 100 ? new Date() : userProgress.completedAt
            });
        }

        res.redirect(`/courses/${course.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

// Добавление урока к курсу (только автор)
router.post('/:id/lessons', requireAuth, upload.single('videoFile'), async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);
        if (!course) {
            return res.status(404).send('Курс не найден');
        }
        if (course.userId !== req.session.user.id) {
            return res.status(403).send('Нет доступа');
        }
        // Проверяем, что курс не завершен
        if (course.status === 'completed') {
            req.flash('error', 'Курс завершен. Добавление новых уроков невозможно.');
            return res.redirect(`/courses/${course.id}`);
        }
        const { title, videoUrl, duration } = req.body;
        
        let filePath = null;
        if (req.file) {
            // Сохраняем относительный путь от public
            filePath = '/uploads/videos/' + req.file.filename;
        }

        // Определяем, что сохранять в videoUrl: если есть ссылка, используем её, иначе путь к файлу
        const finalVideoUrl = videoUrl && videoUrl.trim() !== '' ? videoUrl.trim() : (filePath || null);

        const lessonCount = await Lesson.count({ where: { courseId: course.id } });
        const lesson = await Lesson.create({
            title,
            videoUrl: finalVideoUrl,
            filePath,
            duration: parseInt(duration) || 0,
            courseId: course.id,
            order: lessonCount + 1
        });

        // Добавляем урок в архив вебинаров, если есть видео
        if (finalVideoUrl) {
            try {
                const creator = await User.findByPk(course.userId);
                await Webinar.create({
                    title: lesson.title,
                    description: `Урок из курса «${course.title}»`,
                    date: new Date(),
                    duration: lesson.duration || null,
                    videoUrl: finalVideoUrl,
                    category: course.genre || null,
                    speaker: creator?.username || null,
                    accessLevel: 'premium',
                    isActive: true,
                    lessonId: lesson.id
                });
            } catch (err) {
                console.error('Ошибка при создании записи вебинара из урока:', err);
            }
        }

        res.redirect(`/courses/${course.id}`);
    } catch (error) {
        console.error(error);
        // Если ошибка загрузки файла (multer), возвращаем соответствующее сообщение
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).send('Файл слишком большой (максимум 500 MB)');
        }
        if (error.message && error.message.includes('Разрешены только видеофайлы')) {
            return res.status(400).send(error.message);
        }
        res.status(500).send('Ошибка сервера');
    }
});

// Редактирование урока (форма)
router.get('/:courseId/lessons/:lessonId/edit', requireAuth, async (req, res) => {
    try {
        const { courseId, lessonId } = req.params;
        const course = await Course.findByPk(courseId);
        const lesson = await Lesson.findByPk(lessonId);

        if (!course || !lesson) {
            return res.status(404).send('Курс или урок не найден');
        }

        // Проверяем, является ли пользователь автором курса или администратором/владельцем
        const isAuthor = course.userId === req.session.user.id;
        const isAdmin = req.session.user.role === 'admin' || req.session.user.role === 'owner';

        if (!isAuthor && !isAdmin) {
            return res.status(403).send('Нет доступа');
        }

        res.render('courses/edit-lesson', {
            title: 'Редактировать урок',
            course,
            lesson,
            error: null
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

// Обновление урока
router.post('/:courseId/lessons/:lessonId/edit', requireAuth, upload.single('videoFile'), async (req, res) => {
    try {
        const { courseId, lessonId } = req.params;
        const { title, videoUrl, duration, order } = req.body;
        
        const course = await Course.findByPk(courseId);
        const lesson = await Lesson.findByPk(lessonId);

        if (!course || !lesson) {
            return res.status(404).send('Курс или урок не найден');
        }

        // Проверяем, является ли пользователь автором курса или администратором/владельцем
        const isAuthor = course.userId === req.session.user.id;
        const isAdmin = req.session.user.role === 'admin' || req.session.user.role === 'owner';

        if (!isAuthor && !isAdmin) {
            return res.status(403).send('Нет доступа');
        }

        let filePath = lesson.filePath;
        if (req.file) {
            // Сохраняем относительный путь от public
            filePath = '/uploads/videos/' + req.file.filename;
        }

        // Определяем, что сохранять в videoUrl: если есть ссылка, используем её, иначе путь к файлу
        const finalVideoUrl = videoUrl && videoUrl.trim() !== '' ? videoUrl.trim() : (filePath || lesson.videoUrl);

        // Обновляем урок
        await lesson.update({
            title,
            videoUrl: finalVideoUrl,
            filePath,
            duration: parseInt(duration) || 0,
            order: parseInt(order) || lesson.order
        });

        // Синхронизируем запись в архиве вебинаров
        try {
            const linkedWebinar = await Webinar.findOne({ where: { lessonId: lesson.id } });
            if (finalVideoUrl) {
                if (linkedWebinar) {
                    await linkedWebinar.update({
                        title: lesson.title,
                        videoUrl: finalVideoUrl,
                        duration: parseInt(duration) || linkedWebinar.duration
                    });
                } else {
                    const creator = await User.findByPk(course.userId);
                    await Webinar.create({
                        title: lesson.title,
                        description: `Урок из курса «${course.title}»`,
                        date: new Date(),
                        duration: parseInt(duration) || null,
                        videoUrl: finalVideoUrl,
                        category: course.genre || null,
                        speaker: creator?.username || null,
                        accessLevel: 'premium',
                        isActive: true,
                        lessonId: lesson.id
                    });
                }
            } else if (linkedWebinar) {
                await linkedWebinar.destroy();
            }
        } catch (err) {
            console.error('Ошибка при обновлении записи вебинара:', err);
        }

        res.redirect(`/courses/${courseId}`);
    } catch (error) {
        console.error(error);
        // Если ошибка загрузки файла (multer), возвращаем соответствующее сообщение
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).send('Файл слишком большой (максимум 500 MB)');
        }
        if (error.message && error.message.includes('Разрешены только видеофайлы')) {
            return res.status(400).send(error.message);
        }
        res.status(500).send('Ошибка сервера');
    }
});

// Удаление урока
router.post('/:courseId/lessons/:lessonId/delete', requireAuth, async (req, res) => {
    try {
        const { courseId, lessonId } = req.params;
        const course = await Course.findByPk(courseId);
        const lesson = await Lesson.findByPk(lessonId);

        if (!course || !lesson) {
            return res.status(404).send('Курс или урок не найден');
        }

        // Проверяем, является ли пользователь автором курса или администратором/владельцем
        const isAuthor = course.userId === req.session.user.id;
        const isAdmin = req.session.user.role === 'admin' || req.session.user.role === 'owner';

        if (!isAuthor && !isAdmin) {
            return res.status(403).send('Нет доступа');
        }

        // Удаляем связанную запись в архиве вебинаров
        try {
            const linkedWebinar = await Webinar.findOne({ where: { lessonId: lesson.id } });
            if (linkedWebinar) await linkedWebinar.destroy();
        } catch (err) {
            console.error('Ошибка при удалении записи вебинара:', err);
        }

        await lesson.destroy();
        res.redirect(`/courses/${courseId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

// Отметить урок как пройденный (для пользователя)
router.post('/:courseId/lessons/:lessonId/complete', requireAuth, async (req, res) => {
    try {
        const { courseId, lessonId } = req.params;
        console.log('Запрос на завершение урока:', courseId, lessonId, 'пользователь:', req.session.user.id);
        const course = await Course.findByPk(courseId);
        const lesson = await Lesson.findByPk(lessonId);

        if (!course || !lesson) {
            return res.status(404).send('Курс или урок не найден');
        }

        // Получаем или создаем запись о прогрессе пользователя
        const [userProgress, created] = await UserCourseProgress.findOrCreate({
            where: {
                userId: req.session.user.id,
                courseId: course.id
            },
            defaults: {
                status: 'in_progress',
                progress: 0,
                completedLessons: []
            }
        });

        // Проверяем, не пройден ли уже этот урок
        console.log('userProgress.completedLessons:', userProgress.completedLessons, 'type:', typeof userProgress.completedLessons);
        const completedLessons = userProgress.completedLessons || [];
        console.log('completedLessons after default:', completedLessons);
        if (completedLessons.includes && completedLessons.includes(lesson.id)) {
            return res.json({ success: true, message: 'Урок уже пройден', progress: userProgress.progress });
        }

        // Добавляем урок в пройденные
        completedLessons.push(lesson.id);
        const totalLessons = await Lesson.count({ where: { courseId: course.id } });
        const newProgress = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;

        console.log('userProgress:', userProgress.id, 'completedLessons before:', userProgress.completedLessons);
        console.log('new completedLessons:', completedLessons);
        console.log('totalLessons:', totalLessons, 'newProgress:', newProgress);

        // Обновляем прогресс
        userProgress.set('completedLessons', completedLessons);
        userProgress.set('progress', newProgress);
        userProgress.set('status', newProgress === 100 ? 'completed' : 'in_progress');
        userProgress.set('lastAccessedAt', new Date());
        if (newProgress === 100) {
            userProgress.set('completedAt', new Date());
        }
        console.log('Перед сохранением completedLessons:', userProgress.completedLessons);
        await userProgress.save();

        console.log('Update successful');
        // Перезагружаем запись из базы для проверки
        await userProgress.reload();
        console.log('После reload completedLessons:', userProgress.completedLessons, 'type:', typeof userProgress.completedLessons);
        res.json({ success: true, progress: newProgress, completedLessons });
    } catch (error) {
        console.error('Ошибка в complete урок:', error);
        res.status(500).json({ success: false, error: 'Ошибка сервера', details: error.message });
    }
});

// Удаление курса (автор или администратор)
router.post('/:id/delete', requireAuth, async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);
        if (!course) {
            return res.status(404).send('Курс не найден');
        }
        
        // Проверяем, является ли пользователь автором курса или администратором/владельцем
        const isAuthor = course.userId === req.session.user.id;
        const isAdmin = req.session.user.role === 'admin' || req.session.user.role === 'owner';
        
        if (!isAuthor && !isAdmin) {
            return res.status(403).send('Нет доступа');
        }
        
        await course.destroy();
        
        // Перенаправляем в зависимости от того, откуда пришел запрос
        if (req.headers.referer && req.headers.referer.includes('/admin')) {
            res.redirect('/admin/courses');
        } else {
            res.redirect('/courses');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

module.exports = router;
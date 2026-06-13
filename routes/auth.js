const express = require('express');
const { sequelize, User, Course, UserCourseProgress, EmailVerificationCode } = require('../models');
const { Op } = require('sequelize');
const { sendPasswordResetEmail, sendVerificationCodeEmail } = require('../config/email');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { syncSessionUser } = require('../middleware/authAdmin');
const router = express.Router();

console.log('Auth routes loaded');

// Страница регистрации
router.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('auth/register', { title: 'Регистрация', error: null });
});

// Генерация 6-значного кода
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Обработка регистрации (первый этап - отправка кода)
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;
        
        // Валидация email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.render('auth/register', { title: 'Регистрация', error: 'Введите корректный email адрес' });
        }
        
        // Валидация пароля
        if (password.length < 6) {
            return res.render('auth/register', { title: 'Регистрация', error: 'Пароль должен содержать не менее 6 символов' });
        }
        
        // Проверка на английские буквы, хотя бы одну заглавную и одну цифру
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}$/;
        if (!passwordRegex.test(password)) {
            return res.render('auth/register', { title: 'Регистрация', error: 'Пароль должен содержать только английские буквы, хотя бы одну заглавную букву и одну цифру' });
        }
        
        if (password !== confirmPassword) {
            return res.render('auth/register', { title: 'Регистрация', error: 'Пароли не совпадают' });
        }
        
        // Проверка существования пользователя
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.render('auth/register', { title: 'Регистрация', error: 'Пользователь с таким email уже существует' });
        }
        
        // Генерация кода
        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут
        
        // Сохраняем код в базу
        await EmailVerificationCode.create({
            email,
            code,
            expiresAt,
            used: false
        });
        
        // Отправляем код на email
        const emailResult = await sendVerificationCodeEmail(email, code);
        if (!emailResult.ok) {
            console.error('Ошибка отправки email:', emailResult.error);
            return res.render('auth/register', { title: 'Регистрация', error: 'Не удалось отправить код подтверждения. Попробуйте позже.' });
        }
        
        // Сохраняем данные регистрации в сессии
        req.session.registrationData = {
            username,
            email,
            password
        };
        
        // Перенаправляем на страницу подтверждения
        res.redirect(`/auth/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error) {
        console.error(error);
        res.render('auth/register', { title: 'Регистрация', error: 'Ошибка при регистрации' });
    }
});

// Страница подтверждения email
router.get('/verify-email', (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.redirect('/auth/register');
    }
    res.render('auth/verify-email', {
        title: 'Подтверждение email',
        email,
        error: null,
        success: null
    });
});

// Обработка подтверждения кода
router.post('/verify-email', async (req, res) => {
    try {
        const { email, code } = req.body;
        
        // Проверяем код
        const verification = await EmailVerificationCode.findOne({
            where: {
                email,
                code,
                used: false
            },
            order: [['createdAt', 'DESC']]
        });
        
        if (!verification) {
            return res.render('auth/verify-email', {
                title: 'Подтверждение email',
                email,
                error: 'Неверный или устаревший код',
                success: null
            });
        }
        
        if (verification.isExpired()) {
            return res.render('auth/verify-email', {
                title: 'Подтверждение email',
                email,
                error: 'Срок действия кода истёк. Запросите новый код.',
                success: null
            });
        }
        
        // Получаем данные регистрации из сессии
        const registrationData = req.session.registrationData;
        if (!registrationData || registrationData.email !== email) {
            return res.render('auth/verify-email', {
                title: 'Подтверждение email',
                email,
                error: 'Данные регистрации утеряны. Пожалуйста, начните регистрацию заново.',
                success: null
            });
        }
        
        // Создаём пользователя
        const user = await User.create({
            username: registrationData.username,
            email: registrationData.email,
            password: registrationData.password
        });
        
        // Помечаем код как использованный
        verification.used = true;
        await verification.save();
        
        // Очищаем временные данные
        delete req.session.registrationData;
        
        // Авторизуем пользователя
        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role || 'user',
            twoFactorEnabled: user.twoFactorEnabled,
            hasActiveSubscription: user.hasActiveSubscription,
            subscriptionExpiresAt: user.subscriptionExpiresAt,
            subscriptionFeatures: user.subscriptionFeatures
        };
        
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.render('auth/verify-email', {
            title: 'Подтверждение email',
            email: req.body.email,
            error: 'Ошибка при подтверждении кода',
            success: null
        });
    }
});

// Повторная отправка кода
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        
        // Проверяем, есть ли незавершённая регистрация
        const registrationData = req.session.registrationData;
        if (!registrationData || registrationData.email !== email) {
            return res.json({ ok: false, error: 'Сессия устарела' });
        }
        
        // Генерируем новый код
        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        
        // Помечаем старые коды как использованные (опционально)
        await EmailVerificationCode.update(
            { used: true },
            { where: { email, used: false } }
        );
        
        // Сохраняем новый код
        await EmailVerificationCode.create({
            email,
            code,
            expiresAt,
            used: false
        });
        
        // Отправляем email
        const emailResult = await sendVerificationCodeEmail(email, code);
        if (!emailResult.ok) {
            return res.json({ ok: false, error: 'Не удалось отправить код' });
        }
        
        res.json({ ok: true });
    } catch (error) {
        console.error(error);
        res.json({ ok: false, error: 'Внутренняя ошибка' });
    }
});

// Страница входа
router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('auth/login', { title: 'Вход', error: null });
});

// Обработка входа
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.render('auth/login', { title: 'Вход', error: 'Неверный email или пароль' });
        }
        const isValid = await user.validPassword(password);
        if (!isValid) {
            return res.render('auth/login', { title: 'Вход', error: 'Неверный email или пароль' });
        }

        if (user.twoFactorEnabled && user.twoFactorSecret) {
            req.session.pendingTwoFactorUser = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role || 'user'
            };
            return res.redirect('/auth/2fa');
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role || 'user',
            twoFactorEnabled: user.twoFactorEnabled,
            hasActiveSubscription: user.hasActiveSubscription,
            subscriptionExpiresAt: user.subscriptionExpiresAt,
            subscriptionFeatures: user.subscriptionFeatures
        };
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.render('auth/login', { title: 'Вход', error: 'Ошибка при входе' });
    }
});

// Выход
router.get('/logout', (req, res) => {
    delete req.session.pendingTwoFactorUser;
    req.session.destroy();
    res.redirect('/');
});

router.get('/2fa', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }

    if (!req.session.pendingTwoFactorUser) {
        return res.redirect('/auth/login');
    }

    res.render('auth/two-factor', {
        title: 'Двухфакторная аутентификация',
        error: req.flash('error')[0] || null,
        email: req.session.pendingTwoFactorUser.email
    });
});

router.post('/2fa', async (req, res) => {
    try {
        const pendingUser = req.session.pendingTwoFactorUser;
        const token = String(req.body.token || '').replace(/\s+/g, '');

        if (!pendingUser) {
            return res.redirect('/auth/login');
        }

        if (!/^\d{6}$/.test(token)) {
            req.flash('error', 'Введите корректный 6-значный код.');
            return res.redirect('/auth/2fa');
        }

        const user = await User.findByPk(pendingUser.id);
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            req.flash('error', 'Двухфакторная аутентификация недоступна для этого аккаунта.');
            delete req.session.pendingTwoFactorUser;
            return res.redirect('/auth/login');
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1
        });

        if (!verified) {
            req.flash('error', 'Неверный код подтверждения. Попробуйте снова.');
            return res.redirect('/auth/2fa');
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role || 'user',
            twoFactorEnabled: user.twoFactorEnabled,
            hasActiveSubscription: user.hasActiveSubscription,
            subscriptionExpiresAt: user.subscriptionExpiresAt,
            subscriptionFeatures: user.subscriptionFeatures
        };
        delete req.session.pendingTwoFactorUser;
        res.redirect('/');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Ошибка проверки кода. Попробуйте позже.');
        res.redirect('/auth/2fa');
    }
});

// Профиль пользователя
router.get('/profile', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    try {
        // Синхронизируем данные пользователя с актуальным статусом подписки
        const syncedUser = await syncSessionUser(req.session.user);
        if (!syncedUser) {
            req.session.destroy();
            return res.redirect('/auth/login');
        }
        
        // Обновляем сессию актуальными данными
        req.session.user = syncedUser;
        
        const user = await User.findByPk(syncedUser.id);
        if (!user) {
            req.session.destroy();
            return res.redirect('/auth/login');
        }
        // Статистика: курсы пользователя
        const userCoursesCount = await Course.count({ where: { userId: user.id } });
        const totalCoursesCount = await Course.count();
        // Прогресс по курсам
        const userProgresses = await UserCourseProgress.findAll({
            where: { userId: user.id },
            include: [{ model: Course }]
        });
        const coursesCompleted = userProgresses.filter(p => p.status === 'completed').length;
        const coursesInProgress = userProgresses.filter(p => p.status === 'in_progress').length;
        const totalEnrolledCourses = userProgresses.length;
        const averageProgress = totalEnrolledCourses > 0
            ? Math.round(userProgresses.reduce((sum, p) => sum + p.progress, 0) / totalEnrolledCourses)
            : 0;
        
        // Для обратной совместимости оставляем progressPercentage как процент созданных курсов от общего числа
        const progressPercentage = totalCoursesCount > 0 ? Math.round((userCoursesCount / totalCoursesCount) * 100) : 0;
        
        // Статистика по жанрам
        const genreStats = {};
        userProgresses.forEach(progress => {
            const genre = progress.Course?.genre || 'Другое';
            if (!genreStats[genre]) {
                genreStats[genre] = {
                    count: 0,
                    totalProgress: 0,
                    courses: []
                };
            }
            genreStats[genre].count++;
            genreStats[genre].totalProgress += progress.progress;
            genreStats[genre].courses.push({
                title: progress.Course?.title,
                progress: progress.progress,
                status: progress.status
            });
        });
        
        // Вычисляем средний прогресс по жанрам
        const genreStatsArray = Object.keys(genreStats).map(genre => {
            const stat = genreStats[genre];
            return {
                genre,
                count: stat.count,
                averageProgress: Math.round(stat.totalProgress / stat.count),
                courses: stat.courses
            };
        });
        
        res.render('auth/profile', {
            title: 'Мой профиль',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
                twoFactorEnabled: user.twoFactorEnabled,
                hasActiveSubscription: syncedUser.hasActiveSubscription,
                subscriptionExpiresAt: syncedUser.subscriptionExpiresAt,
                subscriptionFeatures: syncedUser.subscriptionFeatures
            },
            stats: {
                coursesCompleted: coursesCompleted,
                coursesInProgress: coursesInProgress,
                totalEnrolledCourses: totalEnrolledCourses,
                averageProgress: averageProgress,
                totalCourses: totalCoursesCount,
                userCourses: userCoursesCount,
                progressPercentage: progressPercentage
            },
            userProgresses: userProgresses,
            genreStats: genreStatsArray
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Ошибка сервера');
    }
});

router.post('/profile/2fa/setup', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Не авторизован' });
    }

    try {
        const user = await User.findByPk(req.session.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }

        const secret = speakeasy.generateSecret({
            name: `Lecturo (${user.email})`,
            issuer: 'Lecturo'
        });

        user.twoFactorTempSecret = secret.base32;
        await user.save();

        const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

        res.json({
            success: true,
            qrCodeDataUrl,
            manualCode: secret.base32
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Не удалось начать настройку 2FA' });
    }
});

router.post('/profile/2fa/enable', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Не авторизован' });
    }

    try {
        const { token } = req.body;
        const user = await User.findByPk(req.session.user.id);
        if (!user || !user.twoFactorTempSecret) {
            return res.status(400).json({ success: false, message: 'Сначала начните настройку 2FA' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorTempSecret,
            encoding: 'base32',
            token: String(token || '').replace(/\s+/g, ''),
            window: 1
        });

        if (!verified) {
            return res.status(400).json({ success: false, message: 'Неверный код подтверждения' });
        }

        user.twoFactorSecret = user.twoFactorTempSecret;
        user.twoFactorTempSecret = null;
        user.twoFactorEnabled = true;
        await user.save();

        res.json({ success: true, message: 'Двухфакторная аутентификация включена' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Не удалось включить 2FA' });
    }
});

router.post('/profile/2fa/disable', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Не авторизован' });
    }

    try {
        const { token } = req.body;
        const user = await User.findByPk(req.session.user.id);
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            return res.status(400).json({ success: false, message: '2FA уже отключена' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: String(token || '').replace(/\s+/g, ''),
            window: 1
        });

        if (!verified) {
            return res.status(400).json({ success: false, message: 'Неверный код подтверждения' });
        }

        user.twoFactorEnabled = false;
        user.twoFactorSecret = null;
        user.twoFactorTempSecret = null;
        await user.save();

        res.json({ success: true, message: 'Двухфакторная аутентификация отключена' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Не удалось отключить 2FA' });
    }
});

// Обновление имени пользователя
router.post('/profile/update-username', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Не авторизован' });
    }
    try {
        const { username } = req.body;
        if (!username || username.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Имя должно содержать минимум 3 символа' });
        }
        const user = await User.findByPk(req.session.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Пользователь не найден' });
        }
        // Проверка уникальности имени
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser && existingUser.id !== user.id) {
            return res.status(400).json({ success: false, message: 'Это имя уже занято' });
        }
        user.username = username.trim();
        await user.save();
        // Обновляем сессию
        req.session.user.username = user.username;
        res.json({ success: true, message: 'Имя успешно обновлено', username: user.username });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// ========== ВОССТАНОВЛЕНИЕ ПАРОЛЯ ==========

// Страница запроса сброса пароля
router.get('/forgot', (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.render('auth/forgot', {
        title: 'Восстановление пароля',
        error: req.flash('error')[0] || null,
        success: req.flash('success')[0] || null,
        demoMode: false,
        resetUrl: null
    });
});

// Обработка запроса сброса пароля
router.post('/forgot', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) {
            // Для безопасности не сообщаем, что пользователь не найден
            req.flash('success', 'Если email зарегистрирован, вы получите письмо с инструкциями');
            return res.redirect('/auth/forgot');
        }

        // Генерация токена
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 час
        await user.save();

        // Отправка email
        const resetUrl = `${req.protocol}://${req.get('host')}/auth/reset/${token}`;
        console.log(`Ссылка для сброса пароля для ${email}: ${resetUrl}`);
        
        const emailResult = await sendPasswordResetEmail(email, resetUrl);

        if (!emailResult || emailResult.ok === false) {
            console.error(`Письмо для сброса пароля не отправлено на ${email}: ${emailResult?.error || 'unknown error'}`);
            req.flash('error', 'Не удалось отправить письмо для сброса пароля. Проверьте настройки SMTP и попробуйте снова.');
            return res.redirect('/auth/forgot');
        }

        console.log(`Письмо для сброса пароля отправлено на ${email}`);
        req.flash('success', 'Если email зарегистрирован, на него отправлена ссылка для сброса пароля. Проверьте папку "Спам", если письмо не пришло.');
        res.redirect('/auth/forgot');
    } catch (error) {
        console.error(error);
        res.render('auth/forgot', {
            title: 'Восстановление пароля',
            error: 'Произошла ошибка. Попробуйте позже.',
            success: null,
            demoMode: false,
            resetUrl: null
        });
    }
});

// Страница сброса пароля по токену
router.get('/reset/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            where: {
                resetPasswordToken: req.params.token,
                resetPasswordExpires: { [Op.gt]: Date.now() }
            }
        });
        if (!user) {
            return res.render('auth/reset', {
                title: 'Сброс пароля',
                error: 'Ссылка для сброса пароля недействительна или устарела.',
                token: null,
                success: null
            });
        }
        res.render('auth/reset', {
            title: 'Сброс пароля',
            error: null,
            token: req.params.token,
            success: null
        });
    } catch (error) {
        console.error(error);
        res.render('auth/reset', {
            title: 'Сброс пароля',
            error: 'Произошла ошибка. Попробуйте позже.',
            token: null,
            success: null
        });
    }
});

// Обработка сброса пароля
router.post('/reset/:token', async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;
        if (password !== confirmPassword) {
            return res.render('auth/reset', {
                title: 'Сброс пароля',
                error: 'Пароли не совпадают.',
                token: req.params.token
            });
        }
        if (password.length < 6) {
            return res.render('auth/reset', {
                title: 'Сброс пароля',
                error: 'Пароль должен содержать минимум 6 символов.',
                token: req.params.token
            });
        }

        const user = await User.findOne({
            where: {
                resetPasswordToken: req.params.token,
                resetPasswordExpires: { [Op.gt]: Date.now() }
            }
        });
        if (!user) {
            return res.render('auth/reset', {
                title: 'Сброс пароля',
                error: 'Ссылка для сброса пароля недействительна или устарела.',
                token: null
            });
        }

        // Обновляем пароль
        user.password = password;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.render('auth/reset', {
            title: 'Сброс пароля',
            error: null,
            token: null,
            success: 'Пароль успешно изменен! Теперь вы можете войти с новым паролем.'
        });
    } catch (error) {
        console.error(error);
        res.render('auth/reset', {
            title: 'Сброс пароля',
            error: 'Произошла ошибка. Попробуйте позже.',
            token: req.params.token,
            success: null
        });
    }
});

module.exports = router;

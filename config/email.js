const nodemailer = require('nodemailer');

// Конфигурация транспорта для отправки email
// Режимы работы:
// 1. DIRECT - вывод письма в консоль (для разработки)
// 2. ETHEREAL - тестовый SMTP Ethereal (требует интернет)
// 3. REAL_SMTP - реальный SMTP сервер (настраивается через переменные окружения)

const EMAIL_MODE = process.env.EMAIL_MODE || 'DIRECT'; // DIRECT, ETHEREAL, REAL_SMTP
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@onlinecourses.com';

let transporter;
let transporterInitialized = false;
let transporterError = null;

async function createTransporter() {
    try {
        switch (EMAIL_MODE.toUpperCase()) {
            case 'REAL_SMTP':
                // Реальный SMTP сервер (например, Gmail, Mailgun, SendGrid)
                if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
                    throw new Error('Для режима REAL_SMTP необходимо задать SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
                }
                return nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT),
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    }
                });

            case 'ETHEREAL':
                // Тестовый SMTP Ethereal с автоматическим созданием аккаунта
                try {
                    const testAccount = await nodemailer.createTestAccount();
                    console.log('Создан тестовый аккаунт Ethereal:', testAccount.user);
                    console.log('Пароль:', testAccount.pass);
                    console.log('Веб-интерфейс: https://ethereal.email');
                    
                    return nodemailer.createTransport({
                        host: 'smtp.ethereal.email',
                        port: 587,
                        secure: false,
                        auth: {
                            user: testAccount.user,
                            pass: testAccount.pass
                        }
                    });
                } catch (error) {
                    console.error('Ошибка создания тестового аккаунта Ethereal:', error.message);
                    console.log('Переключаюсь в DIRECT режим');
                    return createDirectTransporter();
                }

            case 'DIRECT':
            default:
                // DIRECT режим - письмо не отправляется, а выводится в консоль
                return createDirectTransporter();
        }
    } catch (error) {
        console.error('Критическая ошибка при создании транспортера:', error.message);
        console.log('Использую DIRECT режим как запасной вариант');
        return createDirectTransporter();
    }
}

function createDirectTransporter() {
    // Транспорт, который выводит информацию о письме в консоль
    return nodemailer.createTransport({
        jsonTransport: true, // Генерирует JSON вместо реальной отправки
        // Альтернативно можно использовать streamTransport
    });
}

// Ленивая инициализация транспортера
async function getTransporter() {
    if (!transporterInitialized) {
        try {
            transporter = await createTransporter();
            transporterError = null;
        } catch (error) {
            transporterError = error;
            // В случае ошибки создаем DIRECT транспортер
            transporter = createDirectTransporter();
            console.error('Не удалось инициализировать транспортер, используется DIRECT режим:', error.message);
        }
        transporterInitialized = true;
    }
    return transporter;
}

async function verifySmtpConnection() {
    const currentMode = EMAIL_MODE.trim().toUpperCase();

    if (currentMode !== 'REAL_SMTP') {
        return {
            ok: false,
            mode: currentMode,
            message: 'SMTP verification is available only in REAL_SMTP mode'
        };
    }

    try {
        const transporter = await getTransporter();
        await transporter.verify();

        return {
            ok: true,
            mode: currentMode,
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT)
        };
    } catch (error) {
        transporterError = error;
        return {
            ok: false,
            mode: currentMode,
            message: error.message
        };
    }
}

async function sendTestEmail(email) {
    const transporter = await getTransporter();
    const currentMode = EMAIL_MODE.trim().toUpperCase();
    const mailOptions = {
        from: `"Lecturo" <${EMAIL_FROM}>`,
        to: email,
        subject: 'SMTP test email',
        text: 'This is a real SMTP test email from Lecturo.',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">SMTP test email</h2>
                <p>This is a test email from Lecturo.</p>
                <p>If you received it, your SMTP settings are working.</p>
            </div>
        `
    };

    const info = await transporter.sendMail(mailOptions);

    if (currentMode === 'DIRECT') {
        return { messageId: 'direct-mode-' + Date.now(), mode: currentMode };
    }

    return {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        mode: currentMode
    };
}

// Функция для отправки email сброса пароля
async function sendPasswordResetEmail(email, resetUrl) {
    try {
        const transporter = await getTransporter();

        const mailOptions = {
            from: `"Lecturo" <${EMAIL_FROM}>`,
            to: email,
            subject: 'Восстановление пароля',
            text: 'Вы запросили сброс пароля в Lecturo. Откройте HTML-версию письма и нажмите кнопку "Сбросить пароль". Если вы не запрашивали сброс пароля, проигнорируйте это письмо.',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Восстановление пароля</h2>
                    <p>Вы запросили сброс пароля для вашего аккаунта в Lecturo.</p>
                    <p>Для установки нового пароля нажмите на кнопку ниже (откроется в новой вкладке):</p>
                    <p style="margin: 30px 0; text-align: center;">
                        <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="background-color: #4CAF50; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); transition: background-color 0.3s;">Сбросить пароль</a>
                    </p>
                    <p>Ссылка действительна в течение 1 часа.</p>
                    <p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #777; font-size: 12px;">Это автоматическое сообщение, пожалуйста, не отвечайте на него.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        
        const currentMode = EMAIL_MODE.trim().toUpperCase();
        
        if (currentMode === 'DIRECT') {
            // В DIRECT режиме выводим ссылку в консоль
            console.log('='.repeat(80));
            console.log('DIRECT EMAIL MODE: Письмо НЕ отправлено реально, но вот его содержимое:');
            console.log('Получатель:', email);
            console.log('Тема: Восстановление пароля');
            console.log('Ссылка для сброса пароля:', resetUrl);
            console.log('Текст письма:', mailOptions.text);
            console.log('='.repeat(80));
            // Возвращаем фиктивный объект info
            return { ok: true, messageId: 'direct-mode-' + Date.now(), mode: currentMode };
        } else if (currentMode === 'ETHEREAL') {
            console.log('Email отправлен через Ethereal: %s', info.messageId);
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log('Превью письма: %s', previewUrl);
            } else {
                console.log('Превью письма недоступно');
            }
        } else {
            console.log('Email отправлен через SMTP: %s', info.messageId);
        }
        
        return { ok: true, ...info, mode: currentMode };
    } catch (error) {
        console.error('Ошибка отправки email:', error.message);
        return {
            ok: false,
            error: error.message
        };
    }
}

// Функция для отправки кода подтверждения email
async function sendVerificationCodeEmail(email, code) {
    try {
        const transporter = await getTransporter();

        const mailOptions = {
            from: `"Lecturo" <${EMAIL_FROM}>`,
            to: email,
            subject: 'Код подтверждения регистрации',
            text: `Ваш код подтверждения: ${code}. Введите его на странице регистрации. Код действителен 15 минут.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Подтверждение регистрации</h2>
                    <p>Вы зарегистрировались на платформе Lecturo. Для завершения регистрации введите следующий код подтверждения:</p>
                    <p style="font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 10px; margin: 30px 0; color: #4CAF50;">${code}</p>
                    <p>Код действителен в течение 15 минут.</p>
                    <p>Если вы не регистрировались на Lecturo, проигнорируйте это письмо.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #777; font-size: 12px;">Это автоматическое сообщение, пожалуйста, не отвечайте на него.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        
        const currentMode = EMAIL_MODE.trim().toUpperCase();
        
        if (currentMode === 'DIRECT') {
            // В DIRECT режиме выводим код в консоль
            console.log('='.repeat(80));
            console.log('DIRECT EMAIL MODE: Письмо НЕ отправлено реально, но вот его содержимое:');
            console.log('Получатель:', email);
            console.log('Тема: Код подтверждения регистрации');
            console.log('Код подтверждения:', code);
            console.log('='.repeat(80));
            return { ok: true, messageId: 'direct-mode-' + Date.now(), mode: currentMode };
        } else if (currentMode === 'ETHEREAL') {
            console.log('Email отправлен через Ethereal: %s', info.messageId);
            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log('Превью письма: %s', previewUrl);
            } else {
                console.log('Превью письма недоступно');
            }
        } else {
            console.log('Email отправлен через SMTP: %s', info.messageId);
        }
        
        return { ok: true, ...info, mode: currentMode };
    } catch (error) {
        console.error('Ошибка отправки email:', error.message);
        return {
            ok: false,
            error: error.message
        };
    }
}

module.exports = {
    transporter: null, // будет установлен после инициализации
    sendPasswordResetEmail,
    verifySmtpConnection,
    sendTestEmail,
    sendVerificationCodeEmail
};

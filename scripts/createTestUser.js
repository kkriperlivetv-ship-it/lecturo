const { sequelize } = require('../config/database');
const { User } = require('../models');

async function createTestUser() {
    try {
        await sequelize.authenticate();
        console.log('База данных подключена');

        const email = 'test@example.com';
        const password = 'password';
        const username = 'testuser';

        // Проверяем, существует ли пользователь
        let user = await User.findOne({ where: { email } });
        if (user) {
            console.log('Пользователь уже существует, обновляем пароль');
            user.password = password;
            await user.save();
            console.log('Пароль обновлен');
        } else {
            // Создаем нового пользователя
            user = await User.create({
                username,
                email,
                password,
                role: 'user',
                isProtected: false
            });
            console.log('Пользователь создан');
        }

        console.log('Email:', email);
        console.log('Пароль:', password);
        console.log('Имя пользователя:', username);
    } catch (error) {
        console.error('Ошибка:', error.message);
        console.error('Полная ошибка:', error);
    } finally {
        await sequelize.close();
    }
}

createTestUser();
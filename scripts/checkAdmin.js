const { sequelize } = require('../config/database');
const { User } = require('../models');
const bcrypt = require('bcryptjs');

async function checkAdmin() {
    try {
        await sequelize.authenticate();
        console.log('Подключение к базе данных успешно.');

        // Находим администратора
        const admin = await User.findOne({
            where: { email: 'marathon868@gmail.com' }
        });

        if (!admin) {
            console.log('Администратор не найден');
            return;
        }

        console.log('Найден администратор:');
        console.log('ID:', admin.id);
        console.log('Username:', admin.username);
        console.log('Email:', admin.email);
        console.log('Role:', admin.role);
        console.log('Password hash:', admin.password);
        console.log('Password length:', admin.password.length);

        // Проверяем пароль
        const testPassword = 'Kedamo1551';
        const isValid = await bcrypt.compare(testPassword, admin.password);
        console.log('Пароль "Kedamo1551" верен?', isValid);

        // Если пароль неверен, попробуем сравнить как plain text
        if (!isValid) {
            console.log('Пароль не совпадает с хэшем.');
            console.log('Сравнение как plain text:', admin.password === testPassword);
            
            // Если пароль сохранен как plain text, перехэшируем его
            if (admin.password === testPassword) {
                console.log('Пароль сохранен как plain text. Перехэшируем...');
                const salt = await bcrypt.genSalt(10);
                admin.password = await bcrypt.hash(testPassword, salt);
                await admin.save();
                console.log('Пароль перехэширован.');
            }
        }

    } catch (error) {
        console.error('Ошибка:', error);
    } finally {
        await sequelize.close();
    }
}

// Запускаем функцию
checkAdmin();
const { sequelize } = require('../config/database');
const { User, Course, Lesson, Log } = require('../models');

async function updateDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Подключение к базе данных успешно.');

        // Синхронизируем с параметром alter: true для добавления недостающих колонок
        await sequelize.sync({ alter: true });
        console.log('База данных обновлена (alter).');

        // Проверяем, существует ли администратор
        const existingAdmin = await User.findOne({
            where: { email: 'marathon868@gmail.com' }
        });

        if (existingAdmin) {
            // Обновляем роль, если пользователь уже существует
            existingAdmin.role = 'admin';
            await existingAdmin.save();
            console.log('Роль существующего пользователя обновлена на администратора.');
        } else {
            // Создаем нового администратора
            await User.create({
                username: 'admin',
                email: 'marathon868@gmail.com',
                password: 'Kedamo1551',
                role: 'admin'
            });
            console.log('Администратор успешно создан.');
        }

        console.log('Email: marathon868@gmail.com');
        console.log('Пароль: Kedamo1551');
        console.log('Роль: admin');
    } catch (error) {
        console.error('Ошибка при обновлении базы данных:', error);
    } finally {
        await sequelize.close();
    }
}

// Запускаем функцию
updateDatabase();
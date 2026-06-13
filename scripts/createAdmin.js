const { sequelize } = require('../config/database');
const { User } = require('../models');

async function createAdmin() {
    try {
        await sequelize.authenticate();
        console.log('Подключение к базе данных успешно.');

        // Проверяем, существует ли уже пользователь
        const existingUser = await User.findOne({
            where: { email: 'marathon868@gmail.com' }
        });

        if (existingUser) {
            // Обновляем роль и защиту, если пользователь уже существует
            existingUser.role = 'owner';
            existingUser.isProtected = true;
            await existingUser.save();
            console.log('Существующий пользователь обновлён до владельца с защитой.');
        } else {
            // Создаем нового владельца
            await User.create({
                username: 'owner',
                email: 'marathon868@gmail.com',
                password: 'Kedamo1551',
                role: 'owner',
                isProtected: true
            });
            console.log('Владелец успешно создан.');
        }

        console.log('Email: marathon868@gmail.com');
        console.log('Пароль: Kedamo1551');
        console.log('Роль: owner');
        console.log('Защищён: да (нельзя удалить/изменить)');
    } catch (error) {
        console.error('Ошибка при создании владельца:', error);
    } finally {
        await sequelize.close();
    }
}

// Запускаем функцию
createAdmin();
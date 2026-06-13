const { sequelize } = require('../config/database');
const { User } = require('../models');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
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

        // Устанавливаем новый пароль
        const newPassword = 'Kedamo1551';
        console.log('Устанавливаем новый пароль:', newPassword);

        // Хэшируем пароль
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Обновляем пароль (используем update чтобы вызвать хук beforeUpdate)
        admin.password = newPassword; // Модель сама хэширует через хук beforeUpdate
        await admin.save();

        console.log('Пароль успешно сброшен.');
        console.log('Новые данные для входа:');
        console.log('Email: marathon868@gmail.com');
        console.log('Пароль: Kedamo1551');
        console.log('Роль: admin');

        // Проверяем, что пароль работает
        const checkAdmin = await User.findOne({ where: { email: 'marathon868@gmail.com' } });
        const isValid = await bcrypt.compare(newPassword, checkAdmin.password);
        console.log('Проверка пароля после сброса:', isValid ? 'УСПЕХ' : 'ОШИБКА');

    } catch (error) {
        console.error('Ошибка:', error);
    } finally {
        await sequelize.close();
    }
}

// Запускаем функцию
resetAdminPassword();
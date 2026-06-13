const { sequelize } = require('../config/database');
const { User } = require('../models');

async function fixLoginError() {
    try {
        console.log('Проверка базы данных...');
        await sequelize.authenticate();
        
        // Принудительно синхронизируем только модель User с опцией alter
        // Это добавит недостающие колонки, если они есть
        await User.sync({ alter: true });
        console.log('Модель User синхронизирована (alter).');
        
        // Проверяем, что колонки существуют
        const [results] = await sequelize.query('PRAGMA table_info(Users)');
        const columns = results.map(r => r.name);
        console.log('Колонки таблицы Users:', columns);
        
        if (columns.includes('twoFactorEnabled')) {
            console.log('Колонка twoFactorEnabled присутствует.');
        } else {
            console.log('Колонка twoFactorEnabled отсутствует - добавляем вручную.');
            await sequelize.query('ALTER TABLE Users ADD COLUMN twoFactorEnabled BOOLEAN DEFAULT 0');
            await sequelize.query('ALTER TABLE Users ADD COLUMN twoFactorSecret VARCHAR(255)');
            await sequelize.query('ALTER TABLE Users ADD COLUMN twoFactorTempSecret VARCHAR(255)');
            console.log('Колонки добавлены.');
        }
        
        console.log('Проверка завершена. Перезапустите сервер для применения изменений.');
    } catch (error) {
        console.error('Ошибка при исправлении:', error.message);
    } finally {
        await sequelize.close();
    }
}

fixLoginError();
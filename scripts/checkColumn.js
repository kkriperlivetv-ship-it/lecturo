const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function checkColumn() {
    try {
        await sequelize.authenticate();
        console.log('База данных подключена');

        // Проверяем наличие колонки twoFactorEnabled
        const result = await sequelize.query("SELECT twoFactorEnabled FROM Users LIMIT 1", { type: QueryTypes.SELECT });
        console.log('Результат запроса:', result);

        // Проверяем структуру таблицы
        const columns = await sequelize.query("PRAGMA table_info(Users);", { type: QueryTypes.SELECT });
        const twoFactorEnabledCol = columns.find(c => c.name === 'twoFactorEnabled');
        console.log('Колонка twoFactorEnabled:', twoFactorEnabledCol);
    } catch (error) {
        console.error('Ошибка:', error.message);
        console.error('Полная ошибка:', error);
    } finally {
        await sequelize.close();
    }
}

checkColumn();
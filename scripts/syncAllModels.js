const { sequelize } = require('../config/database');
const models = require('../models');

async function syncAllModels() {
    try {
        console.log('Синхронизация всех моделей с базой данных...');
        
        // Синхронизируем все модели
        await sequelize.sync({ force: false, alter: true });
        
        console.log('Все модели успешно синхронизированы!');
        
        // Выводим информацию о таблицах
        const tables = await sequelize.query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
            { type: sequelize.QueryTypes.SELECT }
        );
        
        console.log(`Всего таблиц в базе данных: ${tables.length}`);
        tables.forEach(table => {
            console.log(`  - ${table.name}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Ошибка при синхронизации моделей:', error);
        process.exit(1);
    }
}

// Запускаем функцию, если скрипт вызван напрямую
if (require.main === module) {
    syncAllModels();
}

module.exports = syncAllModels;
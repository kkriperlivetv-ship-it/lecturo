const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function addMissingColumns() {
    try {
        await sequelize.authenticate();
        console.log('База данных подключена');

        // Получаем информацию о колонках таблицы Users
        const columns = await sequelize.query("PRAGMA table_info(Users);", { type: QueryTypes.SELECT });
        console.log('Существующие колонки:');
        columns.forEach(col => console.log(`- ${col.name} (${col.type})`));

        // Список необходимых колонок из модели User
        const requiredColumns = [
            { name: 'twoFactorEnabled', type: 'BOOLEAN', defaultValue: false },
            { name: 'twoFactorSecret', type: 'TEXT', defaultValue: null },
            { name: 'twoFactorTempSecret', type: 'TEXT', defaultValue: null },
            { name: 'hasActiveSubscription', type: 'BOOLEAN', defaultValue: false },
            { name: 'subscriptionExpiresAt', type: 'DATETIME', defaultValue: null },
            { name: 'subscriptionFeatures', type: 'TEXT', defaultValue: '{}' },
            { name: 'isProtected', type: 'BOOLEAN', defaultValue: false }
        ];

        for (const col of requiredColumns) {
            const exists = columns.some(c => c.name === col.name);
            if (!exists) {
                console.log(`Добавляем колонку ${col.name}...`);
                let sql = `ALTER TABLE Users ADD COLUMN ${col.name} ${col.type}`;
                if (col.defaultValue !== null) {
                    if (typeof col.defaultValue === 'boolean') {
                        sql += ` DEFAULT ${col.defaultValue ? 1 : 0}`;
                    } else if (typeof col.defaultValue === 'string') {
                        sql += ` DEFAULT '${col.defaultValue}'`;
                    } else {
                        sql += ` DEFAULT ${col.defaultValue}`;
                    }
                }
                await sequelize.query(sql);
                console.log(`Колонка ${col.name} добавлена`);
            } else {
                console.log(`Колонка ${col.name} уже существует`);
            }
        }

        console.log('Все необходимые колонки присутствуют');
    } catch (error) {
        console.error('Ошибка:', error.message);
    } finally {
        await sequelize.close();
    }
}

addMissingColumns();
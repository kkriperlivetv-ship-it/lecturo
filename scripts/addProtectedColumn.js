const { sequelize } = require('../config/database');

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');
        
        // Добавляем столбец isProtected если его нет
        const [results] = await sequelize.query(`
            PRAGMA table_info(Users);
        `);
        const hasColumn = results.some(col => col.name === 'isProtected');
        if (!hasColumn) {
            console.log('Adding column isProtected...');
            await sequelize.query(`
                ALTER TABLE Users ADD COLUMN isProtected BOOLEAN DEFAULT 0;
            `);
            console.log('Column isProtected added.');
        } else {
            console.log('Column isProtected already exists.');
        }
        
        // Обновляем ENUM для роли (SQLite не поддерживает ALTER ENUM, нужно пересоздать таблицу)
        // Вместо этого просто обновим существующие записи, если нужно
        // Но для простоты пропустим, так как Sequelize будет валидировать на уровне приложения
        
        console.log('Migration completed.');
    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        await sequelize.close();
    }
}

migrate();
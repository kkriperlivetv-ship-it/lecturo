const { sequelize } = require('../config/database');
const { User } = require('../models');

async function verifyAdmin() {
    try {
        await sequelize.authenticate();
        console.log('=== ПРОВЕРКА АДМИНИСТРАТОРА ===\n');

        // 1. Проверяем пользователя в базе данных
        const admin = await User.findOne({
            where: { email: 'marathon868@gmail.com' }
        });

        if (!admin) {
            console.log('❌ Администратор не найден в базе данных');
            return;
        }

        console.log('✅ Администратор найден в базе данных:');
        console.log(`   ID: ${admin.id}`);
        console.log(`   Username: ${admin.username}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Role === 'admin': ${admin.role === 'admin'}`);

        // 2. Проверяем, есть ли другие пользователи
        const allUsers = await User.findAll({
            attributes: ['id', 'username', 'email', 'role']
        });
        
        console.log('\n=== ВСЕ ПОЛЬЗОВАТЕЛИ В БАЗЕ ДАННЫХ ===');
        allUsers.forEach(user => {
            console.log(`   ${user.id}. ${user.username} (${user.email}) - роль: ${user.role}`);
        });

        // 3. Проверяем структуру таблицы Users
        console.log('\n=== СТРУКТУРА ТАБЛИЦЫ Users ===');
        const [results] = await sequelize.query("PRAGMA table_info(Users)");
        results.forEach(col => {
            console.log(`   ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
        });

    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    } finally {
        await sequelize.close();
    }
}

verifyAdmin();
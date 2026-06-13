const { Sequelize } = require('sequelize');
const path = require('path');

let sequelize;

if (process.env.DATABASE_URL) {
    // Production: PostgreSQL (Render, Railway и т.д.)
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            },
            connectTimeout: 10000 // 10 сек на TCP-соединение
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 10000, // 10 сек вместо 60 на получение соединения
            idle: 10000
        },
        logging: false
    });
} else {
    // Локальная разработка: SQLite
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, '..', 'database.sqlite'),
        logging: false
    });
}

module.exports = { sequelize };

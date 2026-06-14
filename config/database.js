const { Sequelize } = require('sequelize');
const path = require('path');

let sequelize;

if (process.env.DATABASE_URL) {
    // Production: PostgreSQL (Render, Railway и т.д.)
    const sslRequired = !process.env.DATABASE_URL.includes('localhost') &&
                        !process.env.DATABASE_URL.includes('127.0.0.1') &&
                        process.env.DB_SSL !== 'false';
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: sslRequired ? {
            ssl: { require: true, rejectUnauthorized: false },
            connectTimeout: 10000
        } : {
            connectTimeout: 10000
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 10000,
            idle: 10000
        },
        logging: false
    });
} else {
    // Локальная разработка: SQLite
    try {
        require('sqlite3');
    } catch (e) {
        console.error('ОШИБКА: DATABASE_URL не задан, а sqlite3 недоступен.');
        console.error('Задайте переменную DATABASE_URL для подключения к PostgreSQL.');
        process.exit(1);
    }
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, '..', 'database.sqlite'),
        logging: false
    });
}

module.exports = { sequelize };

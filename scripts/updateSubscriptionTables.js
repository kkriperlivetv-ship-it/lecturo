const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function updateSubscriptionTables() {
    try {
        console.log('Начинаем обновление таблиц для подписки и кошелька...');
        
        // Проверяем существование таблицы Subscriptions
        const subscriptionTableExists = await sequelize.query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='Subscriptions'",
            { type: QueryTypes.SELECT }
        );
        
        if (subscriptionTableExists.length === 0) {
            console.log('Таблица Subscriptions не существует, создаем...');
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS Subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER NOT NULL,
                    plan TEXT CHECK(plan IN ('basic', 'premium')) DEFAULT 'basic',
                    status TEXT CHECK(status IN ('active', 'canceled', 'expired', 'pending')) DEFAULT 'pending',
                    startDate DATETIME,
                    endDate DATETIME,
                    autoRenew BOOLEAN DEFAULT 1,
                    price DECIMAL(10,2) DEFAULT 150.00,
                    paymentMethod TEXT,
                    transactionId TEXT,
                    features TEXT DEFAULT '{"videoSearch":false,"webinarArchive":false,"pdfTemplates":false}',
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
                )
            `);
            console.log('Таблица Subscriptions создана');
        } else {
            console.log('Таблица Subscriptions уже существует');
        }
        
        // Проверяем существование таблицы Wallets
        const walletTableExists = await sequelize.query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='Wallets'",
            { type: QueryTypes.SELECT }
        );
        
        if (walletTableExists.length === 0) {
            console.log('Таблица Wallets не существует, создаем...');
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS Wallets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    userId INTEGER NOT NULL UNIQUE,
                    balance DECIMAL(10,2) DEFAULT 0.00,
                    currency TEXT DEFAULT 'RUB',
                    lastTransactionAt DATETIME,
                    sbpPhone TEXT,
                    sbpBank TEXT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
                )
            `);
            console.log('Таблица Wallets создана');
        } else {
            console.log('Таблица Wallets уже существует');
        }
        
        // Проверяем существование таблицы Transactions
        const transactionTableExists = await sequelize.query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='Transactions'",
            { type: QueryTypes.SELECT }
        );
        
        if (transactionTableExists.length === 0) {
            console.log('Таблица Transactions не существует, создаем...');
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS Transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    walletId INTEGER NOT NULL,
                    userId INTEGER NOT NULL,
                    type TEXT CHECK(type IN ('deposit', 'withdrawal', 'subscription', 'refund')),
                    amount DECIMAL(10,2) NOT NULL,
                    description TEXT,
                    status TEXT CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
                    paymentMethod TEXT,
                    paymentDetails TEXT,
                    metadata TEXT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (walletId) REFERENCES Wallets(id) ON DELETE CASCADE,
                    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE
                )
            `);
            console.log('Таблица Transactions создана');
        } else {
            console.log('Таблица Transactions уже существует');
        }
        
        // Проверяем наличие полей подписки в таблице Users
        const userColumns = await sequelize.query(
            "PRAGMA table_info('Users')",
            { type: QueryTypes.SELECT }
        );
        
        const columnNames = userColumns.map(col => col.name);
        
        // Добавляем поле hasActiveSubscription, если его нет
        if (!columnNames.includes('hasActiveSubscription')) {
            console.log('Добавляем поле hasActiveSubscription в таблицу Users...');
            await sequelize.query(
                "ALTER TABLE Users ADD COLUMN hasActiveSubscription BOOLEAN DEFAULT 0"
            );
            console.log('Поле hasActiveSubscription добавлено');
        }
        
        // Добавляем поле subscriptionExpiresAt, если его нет
        if (!columnNames.includes('subscriptionExpiresAt')) {
            console.log('Добавляем поле subscriptionExpiresAt в таблицу Users...');
            await sequelize.query(
                "ALTER TABLE Users ADD COLUMN subscriptionExpiresAt DATETIME"
            );
            console.log('Поле subscriptionExpiresAt добавлено');
        }
        
        // Добавляем поле subscriptionFeatures, если его нет
        if (!columnNames.includes('subscriptionFeatures')) {
            console.log('Добавляем поле subscriptionFeatures в таблицу Users...');
            await sequelize.query(
                "ALTER TABLE Users ADD COLUMN subscriptionFeatures TEXT DEFAULT '{\"videoSearch\":false,\"webinarArchive\":false,\"pdfTemplates\":false}'"
            );
            console.log('Поле subscriptionFeatures добавлено');
        }
        
        console.log('Обновление таблиц завершено успешно!');
        
        // Создаем кошельки для существующих пользователей
        console.log('Создаем кошельки для существующих пользователей...');
        const users = await sequelize.query(
            "SELECT id FROM Users",
            { type: QueryTypes.SELECT }
        );
        
        for (const user of users) {
            const existingWallet = await sequelize.query(
                "SELECT id FROM Wallets WHERE userId = ?",
                {
                    replacements: [user.id],
                    type: QueryTypes.SELECT
                }
            );
            
            if (existingWallet.length === 0) {
                await sequelize.query(
                    "INSERT INTO Wallets (userId, balance, currency) VALUES (?, 0.00, 'RUB')",
                    {
                        replacements: [user.id]
                    }
                );
            }
        }
        
        console.log(`Создано/проверено кошельков для ${users.length} пользователей`);
        
        console.log('Все операции завершены успешно!');
        process.exit(0);
    } catch (error) {
        console.error('Ошибка при обновлении таблиц:', error);
        process.exit(1);
    }
}

// Запускаем функцию, если скрипт вызван напрямую
if (require.main === module) {
    updateSubscriptionTables();
}

module.exports = updateSubscriptionTables;
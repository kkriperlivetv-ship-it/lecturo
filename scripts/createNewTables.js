const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function createNewTables() {
    try {
        console.log('Создание таблиц для новых моделей...');
        
        // Проверяем существование таблицы Webinars
        const webinarTableExists = await sequelize.query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='Webinars'",
            { type: QueryTypes.SELECT }
        );
        
        if (webinarTableExists.length === 0) {
            console.log('Таблица Webinars не существует, создаем...');
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS Webinars (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    date DATETIME NOT NULL,
                    duration INTEGER,
                    videoUrl TEXT NOT NULL,
                    thumbnailUrl TEXT,
                    category TEXT,
                    speaker TEXT,
                    accessLevel TEXT CHECK(accessLevel IN ('free', 'premium')) DEFAULT 'premium',
                    views INTEGER DEFAULT 0,
                    isActive BOOLEAN DEFAULT 1,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('Таблица Webinars создана');
        } else {
            console.log('Таблица Webinars уже существует');
        }
        
        // Проверяем существование таблицы PdfMaterials
        const pdfMaterialTableExists = await sequelize.query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='PdfMaterials'",
            { type: QueryTypes.SELECT }
        );
        
        if (pdfMaterialTableExists.length === 0) {
            console.log('Таблица PdfMaterials не существует, создаем...');
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS PdfMaterials (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    fileName TEXT NOT NULL,
                    fileUrl TEXT NOT NULL,
                    fileSize INTEGER,
                    courseId INTEGER,
                    module TEXT,
                    category TEXT,
                    accessLevel TEXT CHECK(accessLevel IN ('free', 'premium')) DEFAULT 'premium',
                    downloads INTEGER DEFAULT 0,
                    isActive BOOLEAN DEFAULT 1,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (courseId) REFERENCES Courses(id) ON DELETE SET NULL
                )
            `);
            console.log('Таблица PdfMaterials создана');
        } else {
            console.log('Таблица PdfMaterials уже существует');
        }
        
        // Проверяем существование таблицы VideoTranscriptions
        const videoTranscriptionTableExists = await sequelize.query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='VideoTranscriptions'",
            { type: QueryTypes.SELECT }
        );
        
        if (videoTranscriptionTableExists.length === 0) {
            console.log('Таблица VideoTranscriptions не существует, создаем...');
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS VideoTranscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lessonId INTEGER NOT NULL,
                    videoUrl TEXT NOT NULL,
                    transcription TEXT NOT NULL,
                    wordIndex TEXT,
                    duration INTEGER,
                    language TEXT DEFAULT 'ru',
                    processedAt DATETIME,
                    status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (lessonId) REFERENCES Lessons(id) ON DELETE CASCADE
                )
            `);
            console.log('Таблица VideoTranscriptions создана');
        } else {
            console.log('Таблица VideoTranscriptions уже существует');
        }
        
        console.log('Все таблицы успешно созданы/проверены!');
        
        // Выводим список всех таблиц
        const tables = await sequelize.query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
            { type: QueryTypes.SELECT }
        );
        
        console.log(`Всего таблиц в базе данных: ${tables.length}`);
        tables.forEach(table => {
            console.log(`  - ${table.name}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Ошибка при создании таблиц:', error);
        process.exit(1);
    }
}

// Запускаем функцию, если скрипт вызван напрямую
if (require.main === module) {
    createNewTables();
}

module.exports = createNewTables;
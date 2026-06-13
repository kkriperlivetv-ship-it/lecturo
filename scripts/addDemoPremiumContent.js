const { sequelize } = require('../config/database');
const { Webinar, PdfMaterial, Course } = require('../models');

async function addDemoPremiumContent() {
    try {
        console.log('Добавляем демо-данные для premium контента...');
        
        // Получаем существующие курсы
        const courses = await Course.findAll();
        if (courses.length === 0) {
            console.log('Нет курсов для привязки PDF материалов. Создаем демо-курс...');
            // В реальном приложении здесь нужно было бы создать курс
            console.log('Пропускаем создание PDF материалов без курсов');
        }
        
        // Добавляем демо-вебинары
        const demoWebinars = [
            {
                title: 'Введение в веб-разработку 2026',
                description: 'Полный обзор современных технологий веб-разработки. React, Node.js, базы данных и DevOps.',
                date: new Date('2026-01-15'),
                duration: 120,
                videoUrl: '/uploads/webinars/web-dev-intro-2026.mp4',
                thumbnailUrl: '/uploads/webinars/thumbs/web-dev.jpg',
                category: 'Веб-разработка',
                speaker: 'Иван Петров',
                accessLevel: 'premium',
                views: 245
            },
            {
                title: 'Продвинутый JavaScript: Асинхронность и оптимизация',
                description: 'Глубокое погружение в асинхронное программирование, промисы, async/await и оптимизацию производительности.',
                date: new Date('2026-02-10'),
                duration: 90,
                videoUrl: '/uploads/webinars/advanced-js.mp4',
                thumbnailUrl: '/uploads/webinars/thumbs/js-advanced.jpg',
                category: 'JavaScript',
                speaker: 'Анна Сидорова',
                accessLevel: 'premium',
                views: 189
            },
            {
                title: 'React 19: Новые возможности и лучшие практики',
                description: 'Обзор новых возможностей React 19, серверных компонентов и оптимизации производительности.',
                date: new Date('2026-03-05'),
                duration: 105,
                videoUrl: '/uploads/webinars/react-19.mp4',
                thumbnailUrl: '/uploads/webinars/thumbs/react-19.jpg',
                category: 'React',
                speaker: 'Петр Иванов',
                accessLevel: 'premium',
                views: 312
            },
            {
                title: 'Базы данных: Оптимизация запросов и индексы',
                description: 'Как писать эффективные SQL-запросы, создавать индексы и оптимизировать работу с базами данных.',
                date: new Date('2026-04-20'),
                duration: 135,
                videoUrl: '/uploads/webinars/db-optimization.mp4',
                thumbnailUrl: '/uploads/webinars/thumbs/database.jpg',
                category: 'Базы данных',
                speaker: 'Мария Козлова',
                accessLevel: 'premium',
                views: 156
            },
            {
                title: 'DevOps для начинающих: Docker и CI/CD',
                description: 'Основы DevOps: контейнеризация с Docker, настройка пайплайнов CI/CD и автоматизация развертывания.',
                date: new Date('2026-05-12'),
                duration: 150,
                videoUrl: '/uploads/webinars/devops-basics.mp4',
                thumbnailUrl: '/uploads/webinars/thumbs/devops.jpg',
                category: 'DevOps',
                speaker: 'Алексей Смирнов',
                accessLevel: 'premium',
                views: 278
            }
        ];
        
        for (const webinarData of demoWebinars) {
            const existing = await Webinar.findOne({ where: { title: webinarData.title } });
            if (!existing) {
                await Webinar.create(webinarData);
                console.log(`Добавлен вебинар: ${webinarData.title}`);
            } else {
                console.log(`Вебинар уже существует: ${webinarData.title}`);
            }
        }
        
        // Добавляем демо-PDF материалы
        const demoPdfMaterials = [
            {
                title: 'Чек-лист по JavaScript: Основные концепции',
                description: 'Полный чек-лист по основным концепциям JavaScript для начинающих разработчиков.',
                fileName: 'javascript-checklist.pdf',
                fileUrl: '/uploads/pdf/javascript-checklist.pdf',
                fileSize: 1024000,
                courseId: courses.length > 0 ? courses[0].id : null,
                module: 'Основы JavaScript',
                category: 'Чек-лист',
                accessLevel: 'premium',
                downloads: 89
            },
            {
                title: 'Шаблон проекта React + TypeScript',
                description: 'Готовый шаблон для начала проекта на React с TypeScript, ESLint и Prettier.',
                fileName: 'react-ts-template.pdf',
                fileUrl: '/uploads/pdf/react-ts-template.pdf',
                fileSize: 2048000,
                courseId: courses.length > 1 ? courses[1].id : null,
                module: 'Настройка проекта',
                category: 'Шаблон',
                accessLevel: 'premium',
                downloads: 124
            },
            {
                title: 'Конспект по алгоритмам и структурам данных',
                description: 'Краткий конспект по основным алгоритмам и структурам данных для собеседований.',
                fileName: 'algorithms-notes.pdf',
                fileUrl: '/uploads/pdf/algorithms-notes.pdf',
                fileSize: 1536000,
                courseId: courses.length > 0 ? courses[0].id : null,
                module: 'Алгоритмы',
                category: 'Конспект',
                accessLevel: 'premium',
                downloads: 67
            },
            {
                title: 'Чек-лист по безопасности веб-приложений',
                description: 'Проверочный список по безопасности для веб-приложений: OWASP Top 10 и защита от атак.',
                fileName: 'web-security-checklist.pdf',
                fileUrl: '/uploads/pdf/web-security-checklist.pdf',
                fileSize: 1280000,
                courseId: null,
                module: 'Безопасность',
                category: 'Чек-лист',
                accessLevel: 'premium',
                downloads: 45
            },
            {
                title: 'Шаблон документации проекта',
                description: 'Стандартный шаблон для документации программного проекта: README, API docs, deployment.',
                fileName: 'project-docs-template.pdf',
                fileUrl: '/uploads/pdf/project-docs-template.pdf',
                fileSize: 1792000,
                courseId: null,
                module: 'Документация',
                category: 'Шаблон',
                accessLevel: 'premium',
                downloads: 92
            }
        ];
        
        for (const pdfData of demoPdfMaterials) {
            const existing = await PdfMaterial.findOne({ where: { title: pdfData.title } });
            if (!existing) {
                await PdfMaterial.create(pdfData);
                console.log(`Добавлен PDF материал: ${pdfData.title}`);
            } else {
                console.log(`PDF материал уже существует: ${pdfData.title}`);
            }
        }
        
        console.log('Демо-данные успешно добавлены!');
        console.log(`Всего вебинаров: ${await Webinar.count()}`);
        console.log(`Всего PDF материалов: ${await PdfMaterial.count()}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Ошибка при добавлении демо-данных:', error);
        process.exit(1);
    }
}

// Запускаем функцию, если скрипт вызван напрямую
if (require.main === module) {
    addDemoPremiumContent();
}

module.exports = addDemoPremiumContent;
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserCourseProgress = sequelize.define('UserCourseProgress', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    courseId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('not_started', 'in_progress', 'completed'),
        defaultValue: 'not_started',
        allowNull: false
    },
    progress: {
        type: DataTypes.INTEGER, // процент завершения (0-100)
        defaultValue: 0,
        allowNull: false,
        validate: {
            min: 0,
            max: 100
        }
    },
    completedLessons: {
        type: DataTypes.TEXT, // массив ID пройденных уроков хранится как JSON строка
        defaultValue: '[]',
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('completedLessons');
            // Если rawValue уже массив, возвращаем его
            if (Array.isArray(rawValue)) {
                return rawValue;
            }
            // Если rawValue - строка, пытаемся распарсить
            if (typeof rawValue === 'string') {
                try {
                    return rawValue ? JSON.parse(rawValue) : [];
                } catch {
                    return [];
                }
            }
            // Любой другой тип (число, null, undefined) возвращаем пустой массив
            return [];
        },
        set(value) {
            let strValue;
            if (typeof value === 'string') {
                // Проверяем, является ли строка валидным JSON
                try {
                    JSON.parse(value);
                    strValue = value;
                } catch {
                    // Если не JSON, считаем пустым массивом
                    strValue = '[]';
                }
            } else if (Array.isArray(value)) {
                strValue = JSON.stringify(value);
            } else if (typeof value === 'number') {
                // Преобразуем число в массив с этим числом
                strValue = JSON.stringify([value]);
            } else {
                // null, undefined, объект и т.д.
                strValue = '[]';
            }
            this.setDataValue('completedLessons', strValue);
        }
    },
    completedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    lastAccessedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['userId', 'courseId']
        }
    ]
});

module.exports = UserCourseProgress;
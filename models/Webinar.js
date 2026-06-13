const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Webinar = sequelize.define('Webinar', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Длительность в минутах'
    },
    videoUrl: {
        type: DataTypes.STRING,
        allowNull: false
    },
    thumbnailUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Категория вебинара'
    },
    speaker: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Спикер вебинара'
    },
    accessLevel: {
        type: DataTypes.ENUM('free', 'premium'),
        defaultValue: 'premium',
        allowNull: false
    },
    views: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    lessonId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        unique: true
    }
}, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
        {
            fields: ['date']
        },
        {
            fields: ['accessLevel']
        },
        {
            fields: ['category']
        }
    ]
});

module.exports = Webinar;
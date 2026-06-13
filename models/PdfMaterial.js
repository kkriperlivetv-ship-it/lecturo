const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PdfMaterial = sequelize.define('PdfMaterial', {
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
    fileName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fileUrl: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fileSize: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Размер файла в байтах'
    },
    courseId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Courses',
            key: 'id'
        }
    },
    module: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Название модуля курса'
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Категория материала (шаблон, чек-лист, конспект и т.д.)'
    },
    accessLevel: {
        type: DataTypes.ENUM('free', 'premium'),
        defaultValue: 'premium',
        allowNull: false
    },
    downloads: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    }
}, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
        {
            fields: ['courseId']
        },
        {
            fields: ['accessLevel']
        },
        {
            fields: ['category']
        }
    ]
});

// Связи
PdfMaterial.associate = function(models) {
    PdfMaterial.belongsTo(models.Course, { foreignKey: 'courseId' });
};

module.exports = PdfMaterial;
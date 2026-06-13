const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Subscription = sequelize.define('Subscription', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    plan: {
        type: DataTypes.ENUM('basic', 'premium'),
        defaultValue: 'basic',
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('active', 'canceled', 'expired', 'pending'),
        defaultValue: 'pending',
        allowNull: false
    },
    startDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    endDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    autoRenew: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 150.00,
        allowNull: false
    },
    paymentMethod: {
        type: DataTypes.STRING,
        allowNull: true
    },
    transactionId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    features: {
        type: DataTypes.JSON,
        defaultValue: {
            videoSearch: false,
            webinarArchive: false,
            pdfTemplates: false
        },
        allowNull: false
    }
}, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
});

// Связь с пользователем
Subscription.associate = function(models) {
    Subscription.belongsTo(models.User, { foreignKey: 'userId' });
};

module.exports = Subscription;
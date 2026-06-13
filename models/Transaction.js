const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    walletId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('deposit', 'withdrawal', 'subscription', 'refund'),
        allowNull: false
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
        defaultValue: 'pending',
        allowNull: false
    },
    paymentMethod: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'СБП, карта, и т.д.'
    },
    paymentDetails: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Детали платежа (номер транзакции, банк и т.д.)'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Дополнительные данные'
    }
}, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
        {
            fields: ['userId']
        },
        {
            fields: ['walletId']
        },
        {
            fields: ['createdAt']
        }
    ]
});

// Связи
Transaction.associate = function(models) {
    Transaction.belongsTo(models.Wallet, { foreignKey: 'walletId' });
    Transaction.belongsTo(models.User, { foreignKey: 'userId' });
};

module.exports = Transaction;
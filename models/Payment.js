const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    walletId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Wallets',
            key: 'id'
        }
    },
    yookassaPaymentId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ID платежа в ЮKassa'
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'RUB',
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM(
            'pending',      // Ожидает оплаты
            'succeeded',    // Успешно оплачен
            'canceled',     // Отменен
            'failed'        // Ошибка
        ),
        defaultValue: 'pending',
        allowNull: false
    },
    paymentMethod: {
        type: DataTypes.STRING,
        defaultValue: 'sbp',
        allowNull: false
    },
    qrCodeUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL QR кода для СБП'
    },
    confirmationUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL для перенаправления после оплаты'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Дополнительные данные платежа'
    }
}, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
});

Payment.associate = function(models) {
    Payment.belongsTo(models.User, { foreignKey: 'userId' });
    Payment.belongsTo(models.Wallet, { foreignKey: 'walletId' });
};

module.exports = Payment;
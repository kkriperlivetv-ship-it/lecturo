const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Wallet = sequelize.define('Wallet', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    balance: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'RUB',
        allowNull: false
    },
    lastTransactionAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    sbpPhone: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Номер телефона для СБП'
    },
    sbpBank: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Банк для СБП'
    }
}, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
});

// Связь с пользователем
Wallet.associate = function(models) {
    Wallet.belongsTo(models.User, { foreignKey: 'userId' });
};

// Метод для пополнения баланса
Wallet.prototype.deposit = async function(amount, description = 'Пополнение через СБП') {
    const Transaction = require('./Transaction');
    
    this.balance = parseFloat(this.balance) + parseFloat(amount);
    this.lastTransactionAt = new Date();
    await this.save();
    
    // Создаем запись о транзакции
    await Transaction.create({
        walletId: this.id,
        userId: this.userId,
        type: 'deposit',
        amount: amount,
        description: description,
        status: 'completed'
    });
    
    return this.balance;
};

// Метод для списания средств
Wallet.prototype.withdraw = async function(amount, description = 'Оплата подписки') {
    if (parseFloat(this.balance) < parseFloat(amount)) {
        throw new Error('Недостаточно средств на балансе');
    }
    
    const Transaction = require('./Transaction');
    
    this.balance = parseFloat(this.balance) - parseFloat(amount);
    this.lastTransactionAt = new Date();
    await this.save();
    
    // Создаем запись о транзакции
    await Transaction.create({
        walletId: this.id,
        userId: this.userId,
        type: 'withdrawal',
        amount: amount,
        description: description,
        status: 'completed'
    });
    
    return this.balance;
};

module.exports = Wallet;
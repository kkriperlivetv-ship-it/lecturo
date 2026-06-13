const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmailVerificationCode = sequelize.define('EmailVerificationCode', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    code: {
        type: DataTypes.STRING(6),
        allowNull: false
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
    },
    used: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'email_verification_codes',
    timestamps: false,
    indexes: [
        {
            fields: ['email', 'used']
        },
        {
            fields: ['expiresAt']
        }
    ]
});

EmailVerificationCode.prototype.isExpired = function() {
    return new Date() > this.expiresAt;
};

EmailVerificationCode.prototype.isValid = function() {
    return !this.used && !this.isExpired();
};

module.exports = EmailVerificationCode;
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('user', 'admin', 'owner'),
        defaultValue: 'user',
        allowNull: false
    },
    isProtected: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    resetPasswordToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    resetPasswordExpires: {
        type: DataTypes.DATE,
        allowNull: true
    },
    twoFactorEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    twoFactorSecret: {
        type: DataTypes.STRING,
        allowNull: true
    },
    twoFactorTempSecret: {
        type: DataTypes.STRING,
        allowNull: true
    },
    hasActiveSubscription: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    subscriptionExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    subscriptionFeatures: {
        type: DataTypes.JSON,
        defaultValue: {
            videoSearch: false,
            webinarArchive: false,
            pdfTemplates: false
        },
        allowNull: false
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    hooks: {
        beforeCreate: async (user) => {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

User.prototype.validPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = User;

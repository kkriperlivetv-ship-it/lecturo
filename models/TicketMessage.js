const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TicketMessage = sequelize.define('TicketMessage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    ticketId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Tickets',
            key: 'id'
        }
    },
    authorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    authorName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    text: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    timestamps: true,
    updatedAt: false,
    tableName: 'TicketMessages'
});

module.exports = TicketMessage;

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
        allowNull: false
    },
    authorId: {
        type: DataTypes.INTEGER,
        allowNull: false
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

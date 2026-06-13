const { sequelize } = require('../config/database');
const Payment = require('../models/Payment');

async function migratePayments() {
    try {
        await sequelize.sync({ alter: true });
        console.log('Payments table created/updated successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

migratePayments();
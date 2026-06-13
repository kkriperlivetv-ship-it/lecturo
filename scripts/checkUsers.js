const { sequelize } = require('../config/database');
const { User } = require('../models');

async function check() {
    await sequelize.authenticate();
    console.log('Connected to database.');
    
    const users = await User.findAll();
    console.log(`Total users: ${users.length}`);
    users.forEach(u => {
        console.log(`- ${u.id}: ${u.username} (${u.email}) role=${u.role}`);
    });
    
    await sequelize.close();
}

check().catch(console.error);
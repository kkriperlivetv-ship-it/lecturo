const { sequelize } = require('../config/database');
const { User } = require('../models');

async function check() {
    await sequelize.authenticate();
    console.log('Connected to database.');
    
    const owner = await User.findOne({ where: { email: 'marathon868@gmail.com' } });
    if (!owner) {
        console.log('Owner not found!');
        return;
    }
    
    console.log('Owner details:');
    console.log(`  ID: ${owner.id}`);
    console.log(`  Username: ${owner.username}`);
    console.log(`  Email: ${owner.email}`);
    console.log(`  Role: ${owner.role}`);
    console.log(`  isProtected: ${owner.isProtected}`);
    console.log(`  Created: ${owner.createdAt}`);
    
    // Check if role is in allowed admin roles
    const isAdmin = owner.role === 'admin' || owner.role === 'owner';
    console.log(`  Is admin/owner: ${isAdmin}`);
    
    await sequelize.close();
}

check().catch(console.error);
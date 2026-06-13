const { sequelize } = require('../config/database');
const { User, Subscription, Wallet } = require('../models');

async function checkSubscriptions() {
    try {
        await sequelize.authenticate();
        console.log('Database connected');
        
        const users = await User.findAll();
        console.log('\n=== Users ===');
        for (const user of users) {
            console.log(`User ${user.id}: ${user.username}, hasActiveSubscription=${user.hasActiveSubscription}, expires=${user.subscriptionExpiresAt}`);
        }
        
        const subscriptions = await Subscription.findAll();
        console.log('\n=== Subscriptions ===');
        for (const sub of subscriptions) {
            console.log(`Subscription ${sub.id}: userId=${sub.userId}, status=${sub.status}, endDate=${sub.endDate}`);
        }
        
        const wallets = await Wallet.findAll();
        console.log('\n=== Wallets ===');
        for (const wallet of wallets) {
            console.log(`Wallet ${wallet.id}: userId=${wallet.userId}, balance=${wallet.balance}`);
        }
        
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSubscriptions();
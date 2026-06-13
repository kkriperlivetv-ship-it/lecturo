const { sequelize } = require('../config/database');
const { User, Subscription } = require('../models');
const { syncSessionUser } = require('../middleware/authAdmin');

async function debug() {
    await sequelize.authenticate();
    console.log('Database connected');

    // Получим всех пользователей с подписками
    const users = await User.findAll();
    for (const user of users) {
        console.log(`\n--- User ${user.id} (${user.username}) ---`);
        console.log('hasActiveSubscription (DB):', user.hasActiveSubscription);
        console.log('subscriptionExpiresAt (DB):', user.subscriptionExpiresAt);
        
        const activeSubscription = await Subscription.findOne({
            where: { userId: user.id, status: 'active' },
            order: [['endDate', 'DESC']]
        });
        console.log('Active subscription in Subscription table:', activeSubscription ? activeSubscription.id : 'none');
        if (activeSubscription) {
            console.log('Subscription endDate:', activeSubscription.endDate);
            console.log('Subscription status:', activeSubscription.status);
        }

        // Вызовем syncSessionUser
        const sessionUser = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            twoFactorEnabled: user.twoFactorEnabled,
            hasActiveSubscription: user.hasActiveSubscription,
            subscriptionExpiresAt: user.subscriptionExpiresAt,
            subscriptionFeatures: user.subscriptionFeatures
        };
        const synced = await syncSessionUser(sessionUser);
        console.log('Synced hasActiveSubscription:', synced.hasActiveSubscription);
        console.log('Synced subscriptionExpiresAt:', synced.subscriptionExpiresAt);
        console.log('Diff?', synced.hasActiveSubscription !== user.hasActiveSubscription ? 'DIFFERENT!' : 'same');
    }
    await sequelize.close();
}

debug().catch(err => {
    console.error(err);
    process.exit(1);
});
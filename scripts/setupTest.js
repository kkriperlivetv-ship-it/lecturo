const { sequelize } = require('../config/database');
const { User, Wallet, Subscription } = require('../models');

async function setupTest() {
    try {
        await sequelize.authenticate();
        console.log('Database connected');
        
        // Удаляем все подписки
        await Subscription.destroy({ where: {} });
        console.log('Subscriptions cleared');
        
        // Устанавливаем hasActiveSubscription=false для всех пользователей
        await User.update(
            { 
                hasActiveSubscription: false,
                subscriptionExpiresAt: null,
                subscriptionFeatures: {
                    videoSearch: false,
                    webinarArchive: false,
                    pdfTemplates: false
                }
            },
            { where: {} }
        );
        console.log('Users updated');
        
        // Пополняем кошельки всех пользователей
        const wallets = await Wallet.findAll();
        for (const wallet of wallets) {
            await wallet.update({ balance: 500 });
        }
        console.log('Wallets funded with 500 RUB');
        
        await sequelize.close();
        console.log('Setup complete');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

setupTest();
const { User, Subscription } = require('../models');

async function resetAllSubscriptions() {
    try {
        console.log('Начинаем сброс подписок...');
        
        // Обновляем всех пользователей - убираем статус подписки
        const usersCount = await User.update(
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
        
        console.log('Обновлено ' + usersCount[0] + ' пользователей');
        
        // Отменяем все активные подписки
        const subscriptions = await Subscription.update(
            { status: 'canceled', autoRenew: false },
            { where: { status: 'active' } }
        );
        
        console.log('Отменено ' + subscriptions[0] + ' подписок');
        console.log('Сброс подписок завершен');
        process.exit(0);
    } catch (error) {
        console.error('Ошибка при сбросе подписок:', error);
        process.exit(1);
    }
}

resetAllSubscriptions();
const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const { User, Subscription, Wallet, Transaction, Payment } = require('../models');
const { isAuthenticated } = require('../middleware/authAdmin');
const { getYooKassa, isConfigured } = require('../config/yookassa');

// Получить информацию о подписке пользователя
router.get('/subscription', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Проверяем активную подписку в БД
        const subscription = await Subscription.findOne({
            where: {
                userId,
                status: 'active',
                endDate: { [Op.gt]: new Date() }
            },
            order: [['endDate', 'DESC'], ['createdAt', 'DESC']]
        });
        
        const wallet = await Wallet.findOne({ where: { userId } });
        
        // Определяем наличие подписки по факту наличия активной подписки в БД
        const hasActiveSubscription = !!subscription;
        const subscriptionExpiresAt = subscription?.endDate || null;
        
        // Get features from subscription if available, otherwise use defaults
        const subscriptionFeatures = subscription?.features || { videoSearch: false, webinarArchive: false, pdfTemplates: false };
        
        res.json({
            success: true,
            subscription: subscription || null,
            wallet: wallet || null,
            userHasSubscription: hasActiveSubscription,
            subscriptionExpiresAt: subscriptionExpiresAt,
            subscriptionFeatures
        });
    } catch (error) {
        console.error('Ошибка при получении информации о подписке:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Оформить подписку
router.post('/subscribe', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const { plan = 'premium', autoRenew = true } = req.body;
        
        // Проверяем, есть ли активная подписка
        const activeSubscription = await Subscription.findOne({
            where: { 
                userId,
                status: 'active'
            }
        });
        
        if (activeSubscription) {
            return res.status(400).json({ 
                success: false, 
                message: 'У вас уже есть активная подписка' 
            });
        }
        
        // Проверяем баланс кошелька
        const wallet = await Wallet.findOne({ where: { userId } });
        if (!wallet) {
            return res.status(400).json({ 
                success: false, 
                message: 'Кошелек не найден. Пожалуйста, пополните баланс.' 
            });
        }
        
        const subscriptionPrice = 150.00; // 150 рублей в месяц
        
        if (parseFloat(wallet.balance) < subscriptionPrice) {
            return res.status(400).json({ 
                success: false, 
                message: 'Недостаточно средств на балансе. Пожалуйста, пополните кошелек.' 
            });
        }
        
        // Списываем средства
        await wallet.withdraw(subscriptionPrice, 'Оплата подписки Premium');
        
// Создаем подписку
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1); // +1 месяц

        const subscription = await Subscription.create({
            userId,
            plan,
            status: 'active',
            startDate,
            endDate,
            autoRenew,
            price: subscriptionPrice,
            paymentMethod: 'wallet',
            features: {
                videoSearch: true,
                webinarArchive: true,
                pdfTemplates: true
            }
        });

        // Обновляем информацию о пользователе
        await User.update({
            hasActiveSubscription: true,
            subscriptionExpiresAt: endDate,
            subscriptionFeatures: {
                videoSearch: true,
                webinarArchive: true,
                pdfTemplates: true
            }
        }, { where: { id: userId } });
        
        // Обновляем сессию пользователя
        if (req.session.user) {
            req.session.user.hasActiveSubscription = true;
            req.session.user.subscriptionExpiresAt = endDate;
            req.session.user.subscriptionFeatures = {
                videoSearch: true,
                webinarArchive: true,
                pdfTemplates: true
            };
        }
        if (req.user) {
            req.user.hasActiveSubscription = true;
            req.user.subscriptionExpiresAt = endDate;
            req.user.subscriptionFeatures = {
                videoSearch: true,
                webinarArchive: true,
                pdfTemplates: true
            };
        }
        
// Возвращаем актуальные данные из БД
         const updatedUser = await User.findByPk(userId);
         const updatedSubscription = await Subscription.findOne({
             where: { userId, status: 'active' },
             order: [['endDate', 'DESC'], ['createdAt', 'DESC']]
         });

res.json({
            success: true,
            message: 'Подписка успешно оформлена!',
            subscription: updatedSubscription,
            wallet: await Wallet.findOne({ where: { userId } }),
            userHasSubscription: Boolean(updatedUser.hasActiveSubscription),
            subscriptionExpiresAt: updatedUser.subscriptionExpiresAt,
            subscriptionFeatures: updatedUser.subscriptionFeatures || { videoSearch: false, webinarArchive: false, pdfTemplates: false }
        });
    } catch (error) {
        console.error('Ошибка при оформлении подписки:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Отменить подписку
router.post('/unsubscribe', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const subscription = await Subscription.findOne({
            where: { 
                userId,
                status: 'active'
            }
        });
        
        if (!subscription) {
            return res.status(400).json({ 
                success: false, 
                message: 'Активная подписка не найдена' 
            });
        }
        
        // Обновляем статус подписки
        await subscription.update({
            status: 'canceled',
            autoRenew: false
        });
        
        // Обновляем информацию о пользователе
        await User.update({
            hasActiveSubscription: false,
            subscriptionExpiresAt: null,
            subscriptionFeatures: {
                videoSearch: false,
                webinarArchive: false,
                pdfTemplates: false
            }
        }, { where: { id: userId } });
        
        // Обновляем сессию пользователя
        if (req.session.user) {
            req.session.user.hasActiveSubscription = false;
            req.session.user.subscriptionFeatures = {
                videoSearch: false,
                webinarArchive: false,
                pdfTemplates: false
            };
            // subscriptionExpiresAt можно оставить как есть или очистить
            req.session.user.subscriptionExpiresAt = null;
        }
        if (req.user) {
            req.user.hasActiveSubscription = false;
            req.user.subscriptionFeatures = {
                videoSearch: false,
                webinarArchive: false,
                pdfTemplates: false
            };
            req.user.subscriptionExpiresAt = null;
        }
        
        res.json({
            success: true,
            message: 'Подписка успешно отменена',
            userHasSubscription: false,
            subscriptionExpiresAt: null,
            subscriptionFeatures: {
                videoSearch: false,
                webinarArchive: false,
                pdfTemplates: false
            }
        });
    } catch (error) {
        console.error('Ошибка при отмене подписки:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Создать платеж через СБП
router.post('/wallet/deposit', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, paymentMethod = 'sbp' } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Укажите корректную сумму для пополнения' 
            });
        }
        
        // Находим или создаем кошелек
        let wallet = await Wallet.findOne({ where: { userId } });
        if (!wallet) {
            wallet = await Wallet.create({
                userId,
                balance: 0.00,
                currency: 'RUB'
            });
        }
        
        // Проверяем настройки ЮKassa
        if (!isConfigured()) {
            // Демо-режим: просто пополняем баланс
            await wallet.deposit(parseFloat(amount), `Пополнение через ${paymentMethod.toUpperCase()}`);
            return res.json({
                success: true,
                message: 'Кошелек успешно пополнен (демо-режим)',
                wallet: await Wallet.findOne({ where: { userId } }),
                transaction: {
                    amount,
                    paymentMethod,
                    status: 'completed'
                }
            });
        }
        
        // Создаем платеж в ЮKassa
        const yookassa = getYooKassa();
        const payment = await yookassa.payment.create({
            amount: {
                value: parseFloat(amount).toFixed(2),
                currency: 'RUB'
            },
            payment_method_data: {
                type: 'sbp'
            },
            confirmation: {
                type: 'qr',
                locale: 'ru_RU'
            },
            description: `Пополнение баланса пользователя ${userId}`,
            metadata: {
                userId: userId,
                walletId: wallet.id,
                type: 'deposit'
            }
        });
        
        // Создаем запись о платеже
        const newPayment = await Payment.create({
            userId,
            walletId: wallet.id,
            yookassaPaymentId: payment.id,
            amount: parseFloat(amount),
            status: 'pending',
            paymentMethod: 'sbp',
            qrCodeUrl: payment.confirmation?.qr_data,
            confirmationUrl: payment.confirmation?.confirmation_url,
            description: `Пополнение баланса на ${amount} ₽`
        });
        
        res.json({
            success: true,
            message: 'Платеж создан, отсканируйте QR-код',
            payment: {
                id: payment.id,
                status: payment.status,
                qrCodeUrl: payment.confirmation?.qr_data,
                amount: amount
            }
        });
    } catch (error) {
        console.error('Ошибка при создании платежа:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Проверить статус платежа
router.get('/wallet/payment/:paymentId', isAuthenticated, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.user.id;
        
        const payment = await Payment.findOne({
            where: { 
                id: paymentId,
                userId 
            }
        });
        
        if (!payment) {
            return res.status(404).json({ 
                success: false, 
                message: 'Платеж не найден' 
            });
        }
        
        // Проверяем статус в ЮKassa, если настроена
        if (isConfigured() && payment.yookassaPaymentId) {
            const yookassa = getYooKassa();
            const yooPayment = await yookassa.payment.findOne(payment.yookassaPaymentId);
            
            if (yooPayment.status === 'succeeded' && payment.status !== 'succeeded') {
                // Пополняем баланс
                let wallet = await Wallet.findOne({ where: { userId } });
                if (!wallet) {
                    wallet = await Wallet.create({
                        userId,
                        balance: 0.00,
                        currency: 'RUB'
                    });
                }
                await wallet.deposit(parseFloat(payment.amount), 'Пополнение через СБП');
                await payment.update({ status: 'succeeded' });
            }
        }
        
        const updatedPayment = await Payment.findOne({ where: { id: paymentId } });
        
        res.json({
            success: true,
            payment: {
                id: updatedPayment.id,
                status: updatedPayment.status,
                amount: updatedPayment.amount,
                qrCodeUrl: updatedPayment.qrCodeUrl
            }
        });
    } catch (error) {
        console.error('Ошибка при проверке статуса платежа:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Webhook от ЮKassa
router.post('/webhook/yookassa', async (req, res) => {
    try {
        const event = req.body;
        
        if (event.event === 'payment.succeeded') {
            const payment = await Payment.findOne({
                where: { yookassaPaymentId: event.object.id }
            });
            
            if (payment && payment.status !== 'succeeded') {
                // Пополняем баланс
                let wallet = await Wallet.findOne({ where: { id: payment.walletId } });
                if (!wallet) {
                    wallet = await Wallet.create({
                        userId: payment.userId,
                        balance: 0.00,
                        currency: 'RUB'
                    });
                }
                await wallet.deposit(parseFloat(payment.amount), 'Пополнение через СБП');
                await payment.update({ status: 'succeeded' });
            }
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Ошибка webhook:', error);
        res.status(200).send('OK'); // Всегда возвращаем 200
    }
});

// Получить историю транзакций
router.get('/wallet/transactions', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const transactions = await Transaction.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        
        res.json({
            success: true,
            transactions
        });
    } catch (error) {
        console.error('Ошибка при получении истории транзакций:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

// Получить информацию о кошельке
router.get('/wallet', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        
        let wallet = await Wallet.findOne({ where: { userId } });
        if (!wallet) {
            // Создаем кошелек, если его нет
            wallet = await Wallet.create({
                userId,
                balance: 0.00,
                currency: 'RUB'
            });
        }
        
        res.json({
            success: true,
            wallet
        });
    } catch (error) {
        console.error('Ошибка при получении информации о кошельке:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

module.exports = router;

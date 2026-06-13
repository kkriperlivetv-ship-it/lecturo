const request = require('supertest');
const app = require('../server'); // нужно импортировать приложение

async function test() {
    // Логинимся как kedamo
    const agent = request.agent(app);
    const res = await agent
        .post('/auth/login')
        .send({ email: 'marathon868@gmail.com', password: 'Kedamo1551' });
    console.log('Login status:', res.status);
    
    // Получаем профиль
    const profileRes = await agent.get('/auth/profile');
    console.log('Profile status:', profileRes.status);
    // Извлечем данные из рендеринга? Нельзя, но можно посмотреть HTML.
    // Вместо этого вызовем маршрут API подписки
    const subRes = await agent.get('/api/subscription');
    console.log('Subscription API:', JSON.stringify(subRes.body, null, 2));
}

test().catch(console.error);
async function test() {
    const baseUrl = 'http://localhost:3000';
    
    const formData = new URLSearchParams();
    formData.append('email', 'marathon868@gmail.com');
    formData.append('password', 'Kedamo1551');
    
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        body: formData,
        redirect: 'manual',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const cookies = loginRes.headers.get('set-cookie');
    
    // Проверка курса 1 (завершён)
    const course1Res = await fetch(`${baseUrl}/courses/1`, {
        headers: { 'Cookie': cookies }
    });
    const html1 = await course1Res.text();
    const hasButton1 = /lesson-complete-btn/.test(html1);
    console.log('Курс 1 (завершён) - кнопка "Урок пройден" присутствует?', hasButton1);
    
    // Проверка курса 2 (не завершён)
    const course2Res = await fetch(`${baseUrl}/courses/2`, {
        headers: { 'Cookie': cookies }
    });
    const html2 = await course2Res.text();
    const hasButton2 = /lesson-complete-btn/.test(html2);
    console.log('Курс 2 (не завершён) - кнопка "Урок пройден" присутствует?', hasButton2);
    
    // Проверка статусов
    const progress1 = await fetch(`${baseUrl}/debug/debug-progress/1`, {
        headers: { 'Cookie': cookies }
    });
    if (progress1.ok) {
        const p1 = await progress1.json();
        console.log('Статус курса 1:', p1.status, 'прогресс:', p1.progress);
    }
    const progress2 = await fetch(`${baseUrl}/debug/debug-progress/2`, {
        headers: { 'Cookie': cookies }
    });
    if (progress2.ok) {
        const p2 = await progress2.json();
        console.log('Статус курса 2:', p2.status, 'прогресс:', p2.progress);
    }
}

if (typeof fetch !== 'undefined') {
    test().catch(err => console.error(err));
} else {
    console.error('fetch не поддерживается');
}
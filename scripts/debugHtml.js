async function debug() {
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
    
    const courseRes = await fetch(`${baseUrl}/courses/2`, {
        headers: { 'Cookie': cookies }
    });
    const html = await courseRes.text();
    
    // Найти позицию блока lesson-progress
    const idx = html.indexOf('lesson-progress');
    if (idx !== -1) {
        const snippet = html.substring(idx - 100, idx + 500);
        console.log('Фрагмент HTML с lesson-progress:');
        console.log(snippet);
    } else {
        console.log('Блок lesson-progress не найден');
    }
    
    // Также проверим, есть ли data-lesson-id
    const hasDataLessonId = html.includes('data-lesson-id');
    console.log('Есть data-lesson-id?', hasDataLessonId);
    
    // Проверим, есть ли кнопка с классом lesson-complete-btn
    const hasButtonClass = html.includes('lesson-complete-btn');
    console.log('Есть lesson-complete-btn?', hasButtonClass);
}

if (typeof fetch !== 'undefined') {
    debug().catch(err => console.error(err));
} else {
    console.error('fetch не поддерживается');
}
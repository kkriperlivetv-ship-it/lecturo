// Обработка отметки урока как пройденного
document.addEventListener('DOMContentLoaded', function() {
    console.log('Скрипт прогресса загружен');
    const buttons = document.querySelectorAll('.lesson-complete-btn');
    if (buttons.length === 0) {
        console.log('Кнопки "Урок пройден" не найдены (возможно, пользователь создатель курса или не авторизован)');
        return;
    }
    console.log('Найдено кнопок:', buttons.length);
    buttons.forEach(btn => {
        console.log('Найдена кнопка урока:', btn.dataset.lessonId, 'course:', btn.dataset.courseId);
        btn.addEventListener('click', async function() {
            const lessonId = this.dataset.lessonId;
            const courseId = this.dataset.courseId;
            const progressBar = this.closest('.lesson-progress')?.querySelector('.progress-fill-small');
            
            // Если уже пройден, ничего не делаем
            if (this.disabled) return;
            
            try {
                console.log('Отправка запроса на /courses/' + courseId + '/lessons/' + lessonId + '/complete');
                const response = await fetch(`/courses/${courseId}/lessons/${lessonId}/complete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });
                console.log('Ответ получен, статус:', response.status, response.statusText);
                if (!response.ok) {
                    const text = await response.text();
                    console.error('Ошибка HTTP:', text);
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const result = await response.json();
                console.log('Результат:', result);
                if (result.success) {
                    // Анимация заполнения прогресс-бара
                    if (progressBar) {
                        progressBar.style.width = '100%';
                    }
                    // Обновляем кнопку
                    this.classList.remove('btn-outline-success');
                    this.classList.add('btn-success');
                    this.innerHTML = '<i class="fas fa-check"></i> Пройден';
                    this.disabled = true;
                    // Можно обновить общий прогресс курса, если нужно
                    // Например, обновить верхний прогресс-бар
                    if (result.overallProgress !== undefined) {
                        const overallProgressBar = document.querySelector('.progress-fill');
                        if (overallProgressBar) {
                            overallProgressBar.style.width = result.overallProgress + '%';
                            const progressText = document.querySelector('.progress-percent');
                            if (progressText) {
                                progressText.textContent = Math.round(result.overallProgress) + '%';
                            }
                        }
                    }
                } else {
                    alert('Ошибка: ' + (result.message || 'Не удалось отметить урок как пройденный'));
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Сетевая ошибка. Проверьте подключение. Детали: ' + error.message);
            }
        });
    });
});
const { UserCourseProgress } = require('../models');

async function fix() {
    const progress = await UserCourseProgress.findOne({
        where: { userId: 2, courseId: 2 }
    });
    if (progress) {
        console.log('Текущее raw значение:', progress.getDataValue('completedLessons'));
        console.log('Текущее значение через геттер:', progress.completedLessons);
        // Устанавливаем корректный массив
        progress.completedLessons = progress.completedLessons; // это вызовет сеттер с текущим значением (числом?)
        // Но лучше явно установить массив
        const current = progress.completedLessons;
        let fixedArray;
        if (Array.isArray(current)) {
            fixedArray = current;
        } else if (typeof current === 'number') {
            fixedArray = [current];
        } else {
            fixedArray = [];
        }
        progress.completedLessons = fixedArray;
        await progress.save();
        console.log('Исправлено на:', progress.completedLessons);
        console.log('Raw после сохранения:', progress.getDataValue('completedLessons'));
    } else {
        console.log('Запись не найдена');
    }
    process.exit(0);
}

fix().catch(err => {
    console.error(err);
    process.exit(1);
});
const { UserCourseProgress } = require('../models');

async function reset() {
    const progress = await UserCourseProgress.findOne({ where: { userId: 2, courseId: 2 } });
    if (progress) {
        progress.status = 'in_progress';
        progress.progress = 50;
        progress.completedLessons = [];
        await progress.save();
        console.log('Прогресс курса 2 сброшен:', progress.status, progress.progress);
    } else {
        console.log('Запись не найдена');
    }
    process.exit(0);
}

reset().catch(err => {
    console.error(err);
    process.exit(1);
});
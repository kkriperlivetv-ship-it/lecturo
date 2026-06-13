const { UserCourseProgress } = require('../models');

async function check() {
    const progress1 = await UserCourseProgress.findOne({ where: { userId: 2, courseId: 1 } });
    const progress2 = await UserCourseProgress.findOne({ where: { userId: 2, courseId: 2 } });
    console.log('Курс 1:', progress1 ? { status: progress1.status, progress: progress1.progress } : 'нет записи');
    console.log('Курс 2:', progress2 ? { status: progress2.status, progress: progress2.progress } : 'нет записи');
    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
const { sequelize } = require('../models/index');
const { UserCourseProgress } = require('../models');

async function check() {
    await sequelize.sync();
    const progress = await UserCourseProgress.findOne({
        where: { userId: 2, courseId: 2 }
    });
    if (progress) {
        console.log('Raw completedLessons:', progress.getDataValue('completedLessons'));
        console.log('Type of raw:', typeof progress.getDataValue('completedLessons'));
        console.log('Via getter:', progress.completedLessons);
        console.log('Type via getter:', typeof progress.completedLessons);
        console.log('Is array?', Array.isArray(progress.completedLessons));
    } else {
        console.log('Progress not found');
    }
    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
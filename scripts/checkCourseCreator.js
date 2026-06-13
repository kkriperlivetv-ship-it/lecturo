const { Course } = require('../models');

async function check() {
    const course = await Course.findByPk(2);
    console.log('Курс 2:', { id: course.id, title: course.title, userId: course.userId });
    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
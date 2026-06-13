const { Course } = require('../models');

async function check() {
    const course1 = await Course.findByPk(1);
    const course2 = await Course.findByPk(2);
    console.log('Курс 1:', { id: course1.id, title: course1.title, status: course1.status });
    console.log('Курс 2:', { id: course2.id, title: course2.title, status: course2.status });
    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
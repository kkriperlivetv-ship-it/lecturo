const bcrypt = require('bcrypt');
const { User } = require('../models');

async function checkPassword() {
    try {
        const user = await User.findOne({ where: { email: 'test2@example.com' } });
        if (!user) {
            console.log('User not found');
            return;
        }
        console.log('User found:', user.email);
        console.log('Password hash:', user.password);
        console.log('Is password "password"?', await bcrypt.compare('password', user.password));
        console.log('Is password "test"?', await bcrypt.compare('test', user.password));
        console.log('Is password "123456"?', await bcrypt.compare('123456', user.password));
    } catch (error) {
        console.error('Error:', error);
    }
}

checkPassword();
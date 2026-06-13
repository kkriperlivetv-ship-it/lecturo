const User = require('./User');
const Course = require('./Course');
const Lesson = require('./Lesson');
const Log = require('./Log');
const UserCourseProgress = require('./UserCourseProgress');
const EmailVerificationCode = require('./EmailVerificationCode');
const Subscription = require('./Subscription');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const VideoTranscription = require('./VideoTranscription');
const Webinar = require('./Webinar');
const PdfMaterial = require('./PdfMaterial');
const Payment = require('./Payment');
const Ticket = require('./Ticket');
const TicketMessage = require('./TicketMessage');

module.exports = {
  User,
  Course,
  Lesson,
  Log,
  UserCourseProgress,
  EmailVerificationCode,
  Subscription,
  Wallet,
  Transaction,
  VideoTranscription,
  Webinar,
  PdfMaterial,
  Payment,
  Ticket,
  TicketMessage
};

// Связи
User.hasMany(Course, { foreignKey: 'userId', onDelete: 'CASCADE' });
Course.belongsTo(User, { foreignKey: 'userId' });

Course.hasMany(Lesson, { foreignKey: 'courseId', onDelete: 'CASCADE' });
Lesson.belongsTo(Course, { foreignKey: 'courseId' });

User.hasMany(Log, { foreignKey: 'userId', onDelete: 'CASCADE' });
Log.belongsTo(User, { foreignKey: 'userId' });

// Связи для прогресса
User.hasMany(UserCourseProgress, { foreignKey: 'userId', onDelete: 'CASCADE' });
UserCourseProgress.belongsTo(User, { foreignKey: 'userId' });

Course.hasMany(UserCourseProgress, { foreignKey: 'courseId', onDelete: 'CASCADE' });
UserCourseProgress.belongsTo(Course, { foreignKey: 'courseId' });

// Связи для подписки и кошелька
User.hasOne(Subscription, { foreignKey: 'userId', onDelete: 'CASCADE' });
Subscription.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(Wallet, { foreignKey: 'userId', onDelete: 'CASCADE' });
Wallet.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Transaction, { foreignKey: 'userId', onDelete: 'CASCADE' });
Transaction.belongsTo(User, { foreignKey: 'userId' });

Wallet.hasMany(Transaction, { foreignKey: 'walletId', onDelete: 'CASCADE' });
Transaction.belongsTo(Wallet, { foreignKey: 'walletId' });

// Связи для платежей
User.hasMany(Payment, { foreignKey: 'userId', onDelete: 'CASCADE' });
Payment.belongsTo(User, { foreignKey: 'userId' });

Wallet.hasMany(Payment, { foreignKey: 'walletId', onDelete: 'CASCADE' });
Payment.belongsTo(Wallet, { foreignKey: 'walletId' });

// Связи для транскрибации видео
Lesson.hasOne(VideoTranscription, { foreignKey: 'lessonId', onDelete: 'CASCADE' });
VideoTranscription.belongsTo(Lesson, { foreignKey: 'lessonId' });

// Связи для PDF материалов
Course.hasMany(PdfMaterial, { foreignKey: 'courseId', onDelete: 'CASCADE' });
PdfMaterial.belongsTo(Course, { foreignKey: 'courseId' });

// Связи для тикетов
User.hasMany(Ticket, { foreignKey: 'userId', onDelete: 'CASCADE' });
Ticket.belongsTo(User, { foreignKey: 'userId' });
Ticket.hasMany(TicketMessage, { foreignKey: 'ticketId', as: 'messages', onDelete: 'CASCADE' });
TicketMessage.belongsTo(Ticket, { foreignKey: 'ticketId', as: 'ticket' });
User.hasMany(TicketMessage, { foreignKey: 'authorId', onDelete: 'CASCADE' });
TicketMessage.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

const multer = require('multer');
const path = require('path');

// Настройка хранилища для видео
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/videos/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'video-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /mp4|webm|ogg|mov|avi|mkv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Разрешены только видеофайлы (mp4, webm, ogg, mov, avi, mkv)'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 },
    fileFilter: fileFilter
});

// Настройка хранилища для PDF
const pdfStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/pdfs/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'pdf-' + uniqueSuffix + ext);
    }
});

const pdfFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.pdf' || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Разрешены только PDF файлы'), false);
    }
};

const uploadPdf = multer({
    storage: pdfStorage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: pdfFilter
});

module.exports = upload;
module.exports.uploadPdf = uploadPdf;

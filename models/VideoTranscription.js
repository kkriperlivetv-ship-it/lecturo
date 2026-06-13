const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VideoTranscription = sequelize.define('VideoTranscription', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    lessonId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Lessons',
            key: 'id'
        }
    },
    videoUrl: {
        type: DataTypes.STRING,
        allowNull: false
    },
    transcription: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Полная транскрибация видео в формате JSON'
    },
    wordIndex: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Индекс слов для быстрого поиска'
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Длительность видео в секундах'
    },
    language: {
        type: DataTypes.STRING(10),
        defaultValue: 'ru',
        allowNull: false
    },
    processedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
        defaultValue: 'pending',
        allowNull: false
    }
}, {
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
        {
            fields: ['lessonId']
        },
        {
            fields: ['status']
        }
    ]
});

// Связи
VideoTranscription.associate = function(models) {
    VideoTranscription.belongsTo(models.Lesson, { foreignKey: 'lessonId' });
};

// Метод для поиска слов в транскрипции
VideoTranscription.prototype.searchWords = function(searchTerm) {
    try {
        const transcriptionData = JSON.parse(this.transcription);
        const results = [];
        const searchLower = searchTerm.toLowerCase();
        
        if (Array.isArray(transcriptionData)) {
            transcriptionData.forEach((segment, index) => {
                if (segment.text && segment.text.toLowerCase().includes(searchLower)) {
                    results.push({
                        segmentIndex: index,
                        text: segment.text,
                        startTime: segment.startTime || 0,
                        endTime: segment.endTime || 0,
                        confidence: segment.confidence || 1
                    });
                }
            });
        }
        
        return results;
    } catch (error) {
        console.error('Ошибка при поиске в транскрипции:', error);
        return [];
    }
};

// Метод для создания индекса слов
VideoTranscription.prototype.createWordIndex = function() {
    try {
        const transcriptionData = JSON.parse(this.transcription);
        const wordIndex = {};
        
        if (Array.isArray(transcriptionData)) {
            transcriptionData.forEach((segment, segmentIndex) => {
                if (segment.text) {
                    const words = segment.text.toLowerCase().split(/\s+/);
                    words.forEach(word => {
                        const cleanWord = word.replace(/[^\wа-яА-ЯёЁ]/g, '');
                        if (cleanWord.length > 2) { // Игнорируем короткие слова
                            if (!wordIndex[cleanWord]) {
                                wordIndex[cleanWord] = [];
                            }
                            wordIndex[cleanWord].push({
                                segmentIndex,
                                startTime: segment.startTime || 0,
                                endTime: segment.endTime || 0
                            });
                        }
                    });
                }
            });
        }
        
        this.wordIndex = wordIndex;
        return wordIndex;
    } catch (error) {
        console.error('Ошибка при создании индекса слов:', error);
        return {};
    }
};

module.exports = VideoTranscription;
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './TicketModal.css';

const TicketModal = ({ onClose, onCreateTicket }) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [showButton, setShowButton] = useState(false);

  const handleSubjectChange = (e) => {
    setSubject(e.target.value);
    if (e.target.value.length > 0 && !showDescription) {
      setShowDescription(true);
    }
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
    if (e.target.value.length >= 5 && !showButton) {
      setShowButton(true);
    } else if (e.target.value.length < 5 && showButton) {
      setShowButton(false);
    }
  };

  const handleSubmit = async () => {
    await onCreateTicket(subject, description);
    // Reset form
    setSubject('');
    setDescription('');
    setShowDescription(false);
    setShowButton(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="modal-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="modal-header"
        >
          <h2>Создать заявку в поддержку</h2>
          <motion.button
            onClick={onClose}
            className="close-button"
          >
            ×
          </motion.button>
        </motion.div>

        <motion.form
          className="modal-body"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          {/* Subject Field - Always visible initially */}
          <motion.div
            initial={{ opacity: showDescription ? 0 : 1, y: showDescription ? 20 : 0 }}
            animate={{ opacity: showDescription ? 0 : 1, y: showDescription ? 20 : 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="input-wrapper"
          >
              <motion.input
                type="text"
                placeholder="Тема"
                value={subject}
                onChange={handleSubjectChange}
                className="input-field"
                autoFocus
              />
          </motion.div>

          {/* Description Field - Appears after subject has at least 1 char */}
          <motion.div
            initial={{ opacity: showDescription ? 0 : 1, y: showDescription ? 20 : 0 }}
            animate={{ opacity: showDescription ? 1 : 0, y: showDescription ? 0 : -20 }}
            exit={{ opacity: 0, y: 20 }}
            className="textarea-wrapper"
          >
            <motion.textarea
              placeholder="Опишите ситуацию"
              value={description}
              onChange={handleDescriptionChange}
              className="textarea-field"
              rows={4}
            />
          </motion.div>

          {/* Submit Button - Appears after description has at least 5 chars */}
            <motion.button
              type="submit"
              disabled={!showButton}
              initial={{ opacity: showButton ? 0 : 1, y: showButton ? 20 : 0 }}
              animate={{ opacity: showButton ? 1 : 0, y: showButton ? 0 : -20 }}
              exit={{ opacity: 0, y: 20 }}
              className="submit-button"
            >
              Отправить заявку
            </motion.button>
        </motion.form>
      </motion.div>
    </motion.div>
  );
};

export default TicketModal;
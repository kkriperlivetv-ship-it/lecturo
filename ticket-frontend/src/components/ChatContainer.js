import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './ChatContainer.css';

const ChatContainer = ({ ticket, messages, onSendMessage, onCloseTicket, user }) => {
  const [input, setInput] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    await onSendMessage(input);
    setInput('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="chat-container"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="chat-header"
      >
        <h2>Чат поддержки</h2>
        <div className="chat-info">
          <p><strong>Заявка:</strong> {ticket.subject}</p>
          <p><strong>Статус:</strong> 
            {ticket.status === 'waiting' ? 'Ожидает' : 
             ticket.status === 'in_progress' ? 'В работе' : 'Закрыто'}
          </p>
        </div>
        {user.isAdmin && ticket.status === 'in_progress' && (
          <button onClick={onCloseTicket} className="close-button">
            Закрыть заявку
          </button>
        )}
      </motion.div>

      <div className="chat-messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.authorId === user.id ? 'own' : 'other'}`}>
            <div className="message-content">
              <p>{message.text}</p>
              <span className="message-time">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {!ticket.closedAt && (
        <motion.form
          className="chat-input-form"
          onSubmit={handleSend}
        >
          <motion.input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Напишите сообщение..."
            className="chat-input"
          />
          <motion.button
            type="submit"
            className="chat-send-button"
          >
            Отправить
          </motion.button>
        </motion.form>
      )}
      
      {ticket.closedAt && (
        <div className="chat-closed">
          <p>Эта заявка закрыта. Дальнейшие сообщения отправлять нельзя.</p>
        </div>
      )}
    </motion.div>
  );
};

export default ChatContainer;
import React from 'react';
import { motion } from 'framer-motion';
import './Header.css';

const Header = ({ user, showModal, setShowModal, activeTicketsCount, isAdmin }) => {
  return (
    <header className="header">
      <div className="header-content">
        <h1>Система поддержки</h1>
        <div className="header-actions">
          {!isAdmin && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowModal(true)}
              className="help-button"
            >
              Помощь
              {activeTicketsCount > 0 && (
                <span className="notification-badge">{activeTicketsCount}</span>
              )}
            </motion.button>
          )}
          {isAdmin && (
            <div className="admin-badge">
              Ожидает: {activeTicketsCount}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
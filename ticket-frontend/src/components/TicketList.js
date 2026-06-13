import React from 'react';
import './TicketList.css';

const TicketList = ({ tickets, onAcceptTicket }) => {
  return (
    <div className="ticket-list-container">
      <h2>Заявки в поддержку</h2>
      {tickets.length === 0 ? (
        <p>Нет ожидающих заявок</p>
      ) : (
        <div className="tickets-list">
          {tickets.map(ticket => (
            <div key={ticket.id} className="ticket-card">
              <div className="ticket-header">
                <h3>{ticket.subject}</h3>
                <span className={`ticket-status ticket-${ticket.status}`}>
                  {ticket.status === 'waiting' ? 'Ожидает' : 
                   ticket.status === 'in_progress' ? 'В работе' : 'Закрыто'}
                </span>
              </div>
              <div className="ticket-body">
                <p><strong>От:</strong> {ticket.userName}</p>
                <p><strong>Описание:</strong> {ticket.description}</p>
                <p><strong>Создано:</strong> {new Date(ticket.createdAt).toLocaleString()}</p>
              </div>
              {ticket.status === 'waiting' && (
                <button 
                  onClick={() => onAcceptTicket(ticket.id)}
                  className="accept-button"
                >
                  Принять заявку
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TicketList;
import React, { useState, useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import TicketModal from './components/TicketModal';
import TicketList from './components/TicketList';
import ChatContainer from './components/ChatContainer';
import { useSocket } from './hooks/useSocket';

function App() {
  const [user] = useState({ id: 'user1', name: 'John Doe' }); // Regular user
  // For admin testing, uncomment the line below and comment the above line
  // const [user] = useState({ id: 'admin', name: 'Admin', isAdmin: true });
  
  const [showModal, setShowModal] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [tickets, setTickets] = useState([]); // For admin: waiting tickets
  const [userTickets, setUserTickets] = useState([]); // For user: their tickets
  const [messages, setMessages] = useState([]);
  
  const { socket, emit } = useSocket();

  // Load tickets for admin or user's tickets
  useEffect(() => {
    if (user.isAdmin) {
      // Admin: listen for ticket updates
      const handleTicketCreated = (ticket) => {
        setTickets(prev => [...prev, ticket]);
      };
      const handleTicketUpdated = (ticket) => {
        setTickets(prev => 
          prev.map(t => t.id === ticket.id ? ticket : t)
        );
      };
      socket.on('ticket:created', handleTicketCreated);
      socket.on('ticket:updated', handleTicketUpdated);
      
      return () => {
        socket.off('ticket:created', handleTicketCreated);
        socket.off('ticket:updated', handleTicketUpdated);
      };
    } else {
      // User: listen for their own tickets
      const handleTicketCreated = (ticket) => {
        if (ticket.userId === user.id) {
          setUserTickets(prev => [...prev, ticket]);
        }
      };
      const handleTicketUpdated = (ticket) => {
        if (ticket.userId === user.id) {
          setUserTickets(prev => 
            prev.map(t => t.id === ticket.id ? ticket : t)
          );
        }
      };
      socket.on('ticket:created', handleTicketCreated);
      socket.on('ticket:updated', handleTicketUpdated);
      
      return () => {
        socket.off('ticket:created', handleTicketCreated);
        socket.off('ticket:updated', handleTicketUpdated);
      };
    }
  }, [user, socket]);

  // Load messages for current ticket
  useEffect(() => {
    if (currentTicket && socket) {
      // Join the ticket room
      emit('joinTicket', currentTicket.id);
      
      const handleMessageCreated = (message) => {
        setMessages(prev => [...prev, message]);
      };
      socket.on('message:created', handleMessageCreated);
      
      return () => {
        socket.off('message:created', handleMessageCreated);
        emit('leaveTicket', currentTicket.id);
      };
    }
  }, [currentTicket, socket, emit]);

  const handleCreateTicket = async (subject, description) => {
    try {
      const response = await fetch('http://localhost:5000/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          userName: user.name,
          subject,
          description
        })
      });
      
      if (!response.ok) {
        throw new Error('Не удалось создать заявку');
      }
      
      const ticket = await response.json();
      setShowModal(false);
      // Note: We don't set currentTicket here; we wait for admin acceptance via socket
    } catch (error) {
      console.error('Failed to create ticket:', error);
      alert('Failed to create ticket. Please try again.');
    }
  };

  const handleAcceptTicket = async (ticketId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/tickets/${ticketId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to accept ticket');
      }
      
      const ticket = await response.json();
      // Ticket accepted, chat will open via socket event (ticket:accepted)
    } catch (error) {
      console.error('Failed to accept ticket:', error);
      alert('Failed to accept ticket.');
    }
  };

  const handleSendMessage = async (text) => {
    if (!currentTicket) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/tickets/${currentTicket.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authorId: user.id,
          text
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const message = await response.json();
      setMessages(prev => [...prev, message]);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message.');
    }
  };

  const handleCloseTicket = async () => {
    if (!currentTicket) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/tickets/${currentTicket.id}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to close ticket');
      }
      
      const ticket = await response.json();
      setCurrentTicket(null);
      setMessages([]);
    } catch (error) {
      console.error('Failed to close ticket:', error);
      alert('Failed to close ticket.');
    }
  };

  // Listen for ticket acceptance (for user)
  useEffect(() => {
    if (!user.isAdmin) {
      const handleTicketAccepted = (ticket) => {
        if (ticket.userId === user.id) {
          setCurrentTicket(ticket);
        }
      };
      const handleTicketClosed = (ticket) => {
        if (ticket.userId === user.id && currentTicket?.id === ticket.id) {
          setCurrentTicket(null);
          setMessages([]);
        }
      };
      socket.on('ticket:accepted', handleTicketAccepted);
      socket.on('ticket:closed', handleTicketClosed);
      
      return () => {
        socket.off('ticket:accepted', handleTicketAccepted);
        socket.off('ticket:closed', handleTicketClosed);
      };
    }
  }, [user, socket, currentTicket]);

  const activeTicketsCount = user.isAdmin 
    ? tickets.filter(t => t.status === 'waiting').length
    : userTickets.filter(t => t.status !== 'closed').length;

  return (
    <div className="App">
      <Header 
        user={user} 
        showModal={showModal} 
        setShowModal={setShowModal}
        activeTicketsCount={activeTicketsCount}
        isAdmin={user.isAdmin}
      />
      
      {showModal && (
        <TicketModal 
          onClose={() => setShowModal(false)}
          onCreateTicket={handleCreateTicket}
        />
      )}
      
      {user.isAdmin ? (
        <TicketList 
          tickets={tickets}
          onAcceptTicket={handleAcceptTicket}
        />
      ) : null}
      
      {currentTicket && (
        <ChatContainer 
          ticket={currentTicket}
          messages={messages}
          onSendMessage={handleSendMessage}
          onCloseTicket={handleCloseTicket}
          user={user}
        />
      )}
    </div>
  );
}

export default App;
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// In-memory storage (in production, use a database)
let tickets = [];
let messages = [];

// Generate ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// REST API endpoints
app.get('/api/tickets', (req, res) => {
  // Return waiting tickets for admin
  const waitingTickets = tickets.filter(ticket => ticket.status === 'waiting');
  res.json(waitingTickets);
});

app.post('/api/tickets', (req, res) => {
  const { userId, userName, subject, description } = req.body;
  
  if (!userId || !userName || !subject || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const ticket = {
    id: generateId(),
    userId,
    userName,
    subject,
    description,
    status: 'waiting',
    createdAt: new Date(),
    acceptedAt: undefined,
    closedAt: undefined
  };

  tickets.push(ticket);
  
  // Notify admins about new ticket via Socket.IO
  io.emit('ticket:created', ticket);
  
  res.status(201).json(ticket);
});

app.post('/api/tickets/:id/accept', (req, res) => {
  const { id } = req.params;
  const ticketIndex = tickets.findIndex(t => t.id === id);
  
  if (ticketIndex === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const ticket = tickets[ticketIndex];
  if (ticket.status !== 'waiting') {
    return res.status(400).json({ error: 'Ticket is not waiting' });
  }

  ticket.status = 'in_progress';
  ticket.acceptedAt = new Date();
  
  // Notify user and admins via Socket.IO
  io.to(`ticket:${id}`).emit('ticket:accepted', ticket);
  io.emit('ticket:updated', ticket);
  
  res.json(ticket);
});

app.post('/api/tickets/:id/messages', (req, res) => {
  const { id } = req.params;
  const { authorId, text } = req.body;
  
  if (!authorId || !text) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const ticket = tickets.find(t => t.id === id);
  if (!ticket) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  if (ticket.status === 'closed') {
    return res.status(400).json({ error: 'Ticket is closed' });
  }

  const message = {
    id: generateId(),
    ticketId: id,
    authorId,
    text,
    timestamp: new Date()
  };

  messages.push(message);
  
  // Send to ticket room via Socket.IO
  io.to(`ticket:${id}`).emit('message:created', message);
  
  res.status(201).json(message);
});

app.post('/api/tickets/:id/close', (req, res) => {
  const { id } = req.params;
  const ticketIndex = tickets.findIndex(t => t.id === id);
  
  if (ticketIndex === -1) {
    return res.status(404).json({ error: 'Ticket not found' });
  }

  const ticket = tickets[ticketIndex];
  if (ticket.status === 'closed') {
    return res.status(400).json({ error: 'Ticket is already closed' });
  }

  ticket.status = 'closed';
  ticket.closedAt = new Date();
  
  // Notify ticket room via Socket.IO
  io.to(`ticket:${id}`).emit('ticket:closed', ticket);
  io.emit('ticket:updated', ticket);
  
  res.json(ticket);
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join ticket room
  socket.on('joinTicket', (ticketId) => {
    socket.join(`ticket:${ticketId}`);
    console.log(`Socket ${socket.id} joined ticket ${ticketId}`);
    
    // Send existing messages for this ticket
    const ticketMessages = messages.filter(m => m.ticketId === ticketId);
    socket.emit('messages:load', ticketMessages);
  });

  // Leave ticket room
  socket.on('leaveTicket', (ticketId) => {
    socket.leave(`ticket:${ticketId}`);
    console.log(`Socket ${socket.id} left ticket ${ticketId}`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
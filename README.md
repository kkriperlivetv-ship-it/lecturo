# Ticket Support System

A real-time ticket support system built with React (frontend) and Node.js/Socket.IO (backend).

## Features

- User interface for creating support tickets with animated form fields
- Admin panel to view and manage tickets
- Real-time communication between users and admins via WebSocket (Socket.IO)
- Ticket status tracking (waiting, in_progress, closed)
- Notification counters for active tickets
- Chat interface for user-admin communication

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd ticket-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ticket-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Start the Backend Server

1. From the `ticket-backend` directory:
   ```bash
   npm start
   ```
   The server will run on `http://localhost:5000`

### Start the Frontend Application

1. From the `ticket-frontend` directory:
   ```bash
   npm start
   ```
   The application will run on `http://localhost:3000`

## Usage

### As a Regular User

1. Open the application in your browser (`http://localhost:3000`)
2. Click the "Help" button in the header
3. Enter a subject for your ticket (at least 1 character)
4. Describe your situation (at least 5 characters)
5. Click "Submit Ticket"
6. Wait for an admin to accept your ticket
7. Once accepted, a chat interface will appear for real-time communication
8. When the admin closes the ticket, the chat becomes read-only

### As an Administrator

1. To test as admin, modify the `user` state in `ticket-frontend/src/App.js`:
   ```javascript
   const [user] = useState({ id: 'admin', name: 'Admin', isAdmin: true });
   ```
2. Open the application in your browser
3. You'll see a badge showing the number of waiting tickets
4. Click on tickets to view details
5. Click "Accept Ticket" to start a chat with the user
6. Use the chat interface to communicate with the user
7. Click "Close Ticket" when the issue is resolved

## Architecture

### Backend (`ticket-backend`)

- `server.js`: Main server file with Express and Socket.IO
- REST API endpoints for ticket management
- Socket.IO for real-time communication
- In-memory storage (for demo purposes)

### Frontend (`ticket-frontend`)

- React application with functional components and hooks
- Framer Motion for animations
- Socket.IO client for real-time communication
- Components:
  - Header: Contains help button and notification counters
  - TicketModal: Animated form for creating tickets
  - TicketList: Admin view of waiting tickets
  - ChatContainer: Real-time chat interface

## Design Decisions

1. **Animated Form Fields**: Used Framer Motion to create smooth transitions between form fields as specified in the requirements.

2. **Real-time Communication**: Implemented Socket.IO for instant updates between clients and server.

3. **Separation of Concerns**: 
   - Backend handles data storage and API logic
   - Frontend handles UI and user interactions
   - Socket.IO handles real-time events

4. **State Management**: Used React hooks for component state and Socket.IO events for cross-client synchronization.

5. **Error Handling**: Added basic error handling for API calls and socket communications.

## Limitations (for Demo)

- Uses in-memory storage instead of a database (data resets on server restart)
- No user authentication (hardcoded user IDs)
- No persistence of chat history beyond server session
- No input sanitization or validation beyond basic checks

## Production Considerations

For production use, consider:
1. Adding a database (MongoDB, PostgreSQL, etc.)
2. Implementing proper user authentication
3. Adding input validation and sanitization
4. Implementing rate limiting
5. Adding HTTPS/SSL
6. Adding comprehensive error logging
7. Using environment variables for configuration
8. Adding unit and integration tests

## License

MIT
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const useSocket = () => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const emit = (event, data, callback) => {
    if (socket) {
      socket.emit(event, data, callback);
    }
  };

  return { socket, emit };
};

export default useSocket;
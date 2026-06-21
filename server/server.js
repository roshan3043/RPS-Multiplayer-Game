import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

app.get('/health', (req, res) => {
  res.send('RPS Game Server is running.');
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins for dev
    methods: ['GET', 'POST']
  }
});

const rooms = {}; // roomId -> roomState
let strangerQueue = []; // list of { id, name, socket }

// Helper to generate unique room ID
function generateRoomId() {
  let id;
  do {
    id = 'RPS-' + Math.floor(100000 + Math.random() * 900000);
  } while (rooms[id]);
  return id;
}

// Clean player from stranger queue
function removeFromQueue(socketId) {
  strangerQueue = strangerQueue.filter(p => p.id !== socketId);
}

// Find room by player socket ID
function findRoomByPlayerId(socketId) {
  for (const roomId in rooms) {
    const room = rooms[roomId];
    if (room.players.some(p => p.id === socketId)) {
      return room;
    }
  }
  return null;
}

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // 1. Join stranger queue
  socket.on('join-stranger', ({ name }) => {
    removeFromQueue(socket.id);
    console.log(`Player ${name} joined stranger queue`);

    if (strangerQueue.length > 0) {
      // Match found!
      const opponent = strangerQueue.shift();
      const roomId = generateRoomId();

      socket.join(roomId);
      opponent.socket.join(roomId);

      const roomState = {
        id: roomId,
        players: [
          { id: opponent.id, name: opponent.name, score: 0, move: null },
          { id: socket.id, name, score: 0, move: null }
        ],
        type: 'stranger'
      };

      rooms[roomId] = roomState;

      // Broadcast match details to both players
      io.to(roomId).emit('match-found', {
        roomId,
        players: roomState.players
      });

      console.log(`Match matched stranger room ${roomId}: ${opponent.name} vs ${name}`);
    } else {
      strangerQueue.push({ id: socket.id, name, socket });
    }
  });

  // 2. Create private room
  socket.on('create-private', ({ name }) => {
    removeFromQueue(socket.id);
    const roomId = generateRoomId();

    socket.join(roomId);
    
    rooms[roomId] = {
      id: roomId,
      players: [
        { id: socket.id, name, score: 0, move: null }
      ],
      type: 'private'
    };

    socket.emit('room-created', { roomId });
    console.log(`Private room ${roomId} created by ${name}`);
  });

  // 3. Join private room
  socket.on('join-private', ({ name, roomId }) => {
    removeFromQueue(socket.id);
    const code = roomId ? roomId.trim().toUpperCase() : '';
    const room = rooms[code];

    if (!room) {
      socket.emit('error-msg', { message: 'Room not found.' });
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('error-msg', { message: 'Room is full.' });
      return;
    }

    socket.join(code);
    room.players.push({ id: socket.id, name, score: 0, move: null });

    io.to(code).emit('match-found', {
      roomId: code,
      players: room.players
    });

    console.log(`Player ${name} joined private room ${code}`);
  });

  // 4. Submit move
  socket.on('make-move', ({ roomId, move }) => {
    const room = rooms[roomId];
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    player.move = move;
    console.log(`Player ${player.name} chose ${move} in room ${roomId}`);

    // If both players have made their move
    if (room.players.length === 2 && room.players.every(p => p.move !== null)) {
      const p1 = room.players[0];
      const p2 = room.players[1];

      let roundWinnerId = 'draw';

      if (p1.move !== p2.move) {
        if (
          (p1.move === 'rock' && p2.move === 'scissors') ||
          (p1.move === 'paper' && p2.move === 'rock') ||
          (p1.move === 'scissors' && p2.move === 'paper')
        ) {
          p1.score++;
          roundWinnerId = p1.id;
        } else {
          p2.score++;
          roundWinnerId = p2.id;
        }
      }

      let gameWinnerId = null;
      if (p1.score >= 3) {
        gameWinnerId = p1.id;
      } else if (p2.score >= 3) {
        gameWinnerId = p2.id;
      }

      // Emit round result to both players
      io.to(roomId).emit('round-result', {
        players: room.players,
        winnerId: roundWinnerId,
        gameWinnerId,
        moves: {
          [p1.id]: p1.move,
          [p2.id]: p2.move
        }
      });

      // Clear moves in memory for the next round
      p1.move = null;
      p2.move = null;
    }
  });

  // 5. Restart game (Play Again)
  socket.on('restart-game', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.players.forEach(p => {
      p.score = 0;
      p.move = null;
    });

    io.to(roomId).emit('game-restarted', {
      players: room.players
    });

    console.log(`Room ${roomId} restarted`);
  });

  // 6. Leave queue
  socket.on('leave-queue', () => {
    removeFromQueue(socket.id);
    console.log(`Socket ${socket.id} left queue`);
  });

  // 7. Disconnection handler
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    removeFromQueue(socket.id);

    const room = findRoomByPlayerId(socket.id);
    if (room) {
      socket.to(room.id).emit('opponent-disconnected');
      delete rooms[room.id];
      console.log(`Room ${room.id} deleted because player left`);
    }
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`RPS Socket.io Server running on port ${PORT}`);
});

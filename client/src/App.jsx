import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import GameScreen from './components/GameScreen';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [name, setName] = useState('');
  const [isNameEntered, setIsNameEntered] = useState(false);
  const [view, setView] = useState('lobby'); // 'lobby', 'queue', 'game'
  const [roomId, setRoomId] = useState('');
  const [players, setPlayers] = useState([]);
  const [loadingText, setLoadingText] = useState('Connecting to server...');
  const [privateCodeInput, setPrivateCodeInput] = useState('');

  // 1. Establish Socket.io connection and parse invite links
  useEffect(() => {
    // Determine server host (fallback to localhost:5000 in dev)
    const socketHost = import.meta.env.VITE_SERVER_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
    console.log('Connecting to Socket.io:', socketHost);
    
    const s = io(socketHost);
    setSocket(s);

    s.on('connect', () => {
      console.log('Connected to game server. Socket ID:', s.id);
    });

    s.on('room-created', ({ roomId: newRoomId }) => {
      setRoomId(newRoomId);
      setView('queue');
      setLoadingText('Waiting for your friend to join...');
    });

    s.on('match-found', ({ roomId: joinedRoomId, players: roomPlayers }) => {
      setRoomId(joinedRoomId);
      setPlayers(roomPlayers);
      setView('game');
    });

    s.on('error-msg', ({ message }) => {
      alert(message);
      setView('lobby');
    });

    // Check if player joined via shareable room code in URL query parameters
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('room');
    if (inviteCode) {
      setPrivateCodeInput(inviteCode.toUpperCase());
    }

    return () => {
      s.disconnect();
    };
  }, []);

  const handleSaveName = (e) => {
    e.preventDefault();
    if (name.trim()) {
      setIsNameEntered(true);
    }
  };

  const handlePlayStranger = () => {
    if (!socket) return;
    setView('queue');
    setLoadingText('Finding a stranger opponent...');
    socket.emit('join-stranger', { name });
  };

  const handleCreatePrivate = () => {
    if (!socket) return;
    socket.emit('create-private', { name });
  };

  const handleJoinPrivate = (e) => {
    e.preventDefault();
    if (!socket || !privateCodeInput.trim()) return;
    setView('queue');
    setLoadingText(`Joining room ${privateCodeInput}...`);
    socket.emit('join-private', { name, roomId: privateCodeInput.trim() });
  };

  const handleCancelSearch = () => {
    if (socket) {
      socket.emit('leave-queue');
      // If we joined a room, we disconnect and reconnect to leave clean
      socket.disconnect();
      socket.connect();
    }
    setView('lobby');
    setRoomId('');
  };

  const handleQuitGame = () => {
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
    setView('lobby');
    setRoomId('');
    setPlayers([]);
  };

  // Generate shareable link
  const shareableLink = `${window.location.origin}${window.location.pathname}?room=${roomId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareableLink);
    alert('Invite link copied to clipboard!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* View router */}
      {view === 'lobby' && (
        <div className="w-full max-w-md bg-slate-900/80 border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-md text-center space-y-6">
          <h1 className="text-4xl font-black italic tracking-tight bg-gradient-to-r from-sky-400 to-rose-400 bg-clip-text text-transparent">
            ROCK PAPER SCISSORS
          </h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest">
            Online Multiplayer Arena
          </p>

          {!isNameEntered ? (
            /* Phase 1: Enter Username */
            <form onSubmit={handleSaveName} className="space-y-4 text-left">
              <div>
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-2">
                  Enter your name to start game
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-slate-950 text-white font-medium focus:outline-none focus:border-sky-400 transition-all"
                  placeholder="Pilot callsign..."
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-widest transition-all button-hover glow-blue"
              >
                SAVE CALLSIGN
              </button>
            </form>
          ) : (
            /* Phase 2: Selection lobby */
            <div className="space-y-6 text-left">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 flex justify-between items-center">
                <span className="text-xs text-slate-400 font-bold uppercase">Callsign:</span>
                <span className="font-bold text-sky-400">{name}</span>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handlePlayStranger}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-widest transition-all button-hover glow-blue"
                >
                  ⚔️ Play with Stranger
                </button>
                <button
                  onClick={handleCreatePrivate}
                  className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-white/5 font-black text-xs uppercase tracking-widest transition-all button-hover"
                >
                  🤝 Play with Friend
                </button>
              </div>

              {/* Enter private room code manually */}
              <form onSubmit={handleJoinPrivate} className="border-t border-white/5 pt-4 space-y-3">
                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
                  Join Room by Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="E.g. RPS-123456"
                    value={privateCodeInput}
                    onChange={(e) => setPrivateCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 rounded-xl border border-white/10 bg-slate-950 text-white text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-sky-400"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-widest transition-all button-hover"
                  >
                    JOIN
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Queue Screen */}
      {view === 'queue' && (
        <div className="w-full max-w-md bg-slate-900/80 border border-white/10 p-8 rounded-3xl shadow-2xl backdrop-blur-md text-center space-y-6 animate-scaleIn">
          <div className="w-12 h-12 rounded-full border-2 border-sky-400/20 border-t-sky-400 loader mx-auto" />
          
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider animate-pulse">
              {loadingText}
            </h3>
            <p className="text-xs text-slate-400 uppercase tracking-widest">
              Please wait...
            </p>
          </div>

          {roomId && (
            /* Invite link generator for private room */
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-3">
              <div className="text-xs text-slate-500 font-mono uppercase">Room ID</div>
              <div className="text-2xl font-mono font-black text-yellow-400 tracking-wider">
                {roomId}
              </div>
              <button
                onClick={copyToClipboard}
                className="w-full py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-xs font-bold uppercase tracking-wider transition-all"
              >
                Copy Invite Link
              </button>
              <div className="text-[10px] text-slate-500 leading-normal uppercase">
                Share this code or link with your friend to connect instantly.
              </div>
            </div>
          )}

          <button
            onClick={handleCancelSearch}
            className="w-full py-2.5 rounded-xl border border-rose-500/20 hover:border-rose-500/50 text-rose-400 font-bold text-xs uppercase tracking-widest transition-all"
          >
            Cancel Search
          </button>
        </div>
      )}

      {/* Game arena view */}
      {view === 'game' && (
        <GameScreen
          roomId={roomId}
          players={players}
          socket={socket}
          selfId={socket?.id}
          onQuit={handleQuitGame}
        />
      )}
    </div>
  );
}

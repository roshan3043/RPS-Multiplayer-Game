import React, { useState, useEffect } from 'react';

const MOVE_EMOJIS = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️'
};

export default function GameScreen({ roomId, players, socket, selfId, onQuit }) {
  const [myChoice, setMyChoice] = useState(null);
  const [hasOpponentChosen, setHasOpponentChosen] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  
  // Game state sync
  const [localPlayers, setLocalPlayers] = useState(players);
  const [roundResult, setRoundResult] = useState(null);
  const [revealedMoves, setRevealedMoves] = useState({ self: null, opponent: null });
  const [roundWinnerText, setRoundWinnerText] = useState('');
  const [gameWinner, setGameWinner] = useState(null); // 'you' / 'opponent'

  const selfPlayer = localPlayers.find(p => p.id === selfId);
  const opponentPlayer = localPlayers.find(p => p.id !== selfId);

  useEffect(() => {
    if (!socket) return;

    // Listen for round results from server
    socket.on('round-result', ({ players: newPlayers, winnerId, gameWinnerId, moves }) => {
      // 1. Play hand shaking animation
      setIsShaking(true);
      setHasOpponentChosen(true);

      // 2. Wait for shake animation to finish (600ms)
      setTimeout(() => {
        setIsShaking(false);
        
        // Show moves
        const myMove = moves[selfId];
        const opponentId = opponentPlayer.id;
        const oppMove = moves[opponentId];
        
        setRevealedMoves({ self: myMove, opponent: oppMove });

        // Update scores and players
        setLocalPlayers(newPlayers);

        // Determine round winner text
        if (winnerId === 'draw') {
          setRoundWinnerText("It's a Draw!");
        } else if (winnerId === selfId) {
          setRoundWinnerText('You Won this round! 🎉');
        } else {
          setRoundWinnerText(`${opponentPlayer.name} won this round! ⚔️`);
        }

        // Check if game is completed
        if (gameWinnerId) {
          setTimeout(() => {
            setGameWinner(gameWinnerId === selfId ? 'you' : 'opponent');
          }, 1000);
        }

        // Reset choice for next round (but keep reveal visible until choice is clicked again)
        setMyChoice(null);
        setHasOpponentChosen(false);
      }, 600);
    });

    // Listen for game restarts
    socket.on('game-restarted', ({ players: restartedPlayers }) => {
      setLocalPlayers(restartedPlayers);
      setRoundResult(null);
      setRevealedMoves({ self: null, opponent: null });
      setRoundWinnerText('');
      setGameWinner(null);
      setMyChoice(null);
      setHasOpponentChosen(false);
      setIsShaking(false);
    });

    // Listen for opponent leaving
    socket.on('opponent-disconnected', () => {
      alert('Your opponent has disconnected. Returning to lobby.');
      onQuit();
    });

    return () => {
      socket.off('round-result');
      socket.off('game-restarted');
      socket.off('opponent-disconnected');
    };
  }, [socket, selfId, opponentPlayer]);

  // Keyboard controls
  useEffect(() => {
    if (gameWinner || myChoice) return;

    const handleKeyDown = (e) => {
      if (e.key === '1') makeChoice('rock');
      else if (e.key === '2') makeChoice('paper');
      else if (e.key === '3') makeChoice('scissors');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameWinner, myChoice]);

  const makeChoice = (choice) => {
    if (myChoice || gameWinner) return;
    setMyChoice(choice);
    // Clear previous round text when locked in
    setRoundWinnerText('');
    socket.emit('make-move', { roomId, move: choice });
  };

  const handlePlayAgain = () => {
    socket.emit('restart-game', { roomId });
  };

  // Determine hands to render:
  // - If shaking: both show closed fists '✊'
  // - If choices revealed: show chosen moves
  // - Else (idle waiting): show closed fists '✊'
  const leftHandHandEmoji = isShaking
    ? '✊'
    : (revealedMoves.self ? MOVE_EMOJIS[revealedMoves.self] : '✊');
    
  const rightHandHandEmoji = isShaking
    ? '✊'
    : (revealedMoves.opponent ? MOVE_EMOJIS[revealedMoves.opponent] : '✊');

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col justify-between min-h-[90vh] p-4 text-white">
      {/* Header HUD */}
      <div className="flex justify-between items-center bg-slate-900/80 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        {/* Self score */}
        <div className="text-left flex-1">
          <div className="text-xs text-sky-400 font-bold uppercase tracking-wider">YOU</div>
          <div className="text-2xl font-black truncate">{selfPlayer?.name}</div>
          <div className="text-sm font-mono mt-1">Score: <span className="text-sky-400 font-bold text-lg">{selfPlayer?.score}</span></div>
        </div>

        <div className="px-4 text-center">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">FIRST TO 3</div>
          <div className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-white/5 font-mono">
            {roomId}
          </div>
        </div>

        {/* Opponent score */}
        <div className="text-right flex-1">
          <div className="text-xs text-rose-400 font-bold uppercase tracking-wider">OPPONENT</div>
          <div className="text-2xl font-black truncate">{opponentPlayer?.name || 'Connecting...'}</div>
          <div className="text-sm font-mono mt-1">Score: <span className="text-rose-400 font-bold text-lg">{opponentPlayer?.score}</span></div>
        </div>
      </div>

      {/* Main Arena Clash Screen */}
      <div className="flex-1 flex flex-col justify-center items-center py-8">
        <div className="w-full grid grid-cols-2 gap-8 relative items-center justify-items-center min-h-[220px]">
          {/* Left Player Hand */}
          <div className="flex flex-col items-center">
            <div className={`w-28 h-28 rounded-full border-4 border-sky-400/40 bg-sky-950/20 flex items-center justify-center text-6xl shadow-2xl transition-all ${
              isShaking ? 'shake-left' : 'glow-blue'
            }`}>
              <span>{leftHandHandEmoji}</span>
            </div>
            <span className="text-xs font-bold text-sky-400 uppercase mt-3 tracking-widest">
              {revealedMoves.self ? revealedMoves.self : (myChoice ? 'LOCKED IN' : 'SELECTING')}
            </span>
          </div>

          {/* Center VS and Text overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center">
            {roundWinnerText ? (
              <div className="bg-slate-950/90 border border-white/10 px-4 py-2.5 rounded-xl shadow-2xl text-sm font-black uppercase tracking-widest animate-[scaleIn_0.2s_ease-out] min-w-[140px]">
                {roundWinnerText}
              </div>
            ) : isShaking ? (
              <div className="text-3xl font-black italic text-yellow-400 uppercase tracking-widest animate-pulse">
                SHAKE!
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/20 flex items-center justify-center text-xs font-black text-slate-400">
                VS
              </div>
            )}
          </div>

          {/* Right Player Hand (Opponent) */}
          <div className="flex flex-col items-center">
            {/* Note scaleX(-1) to flip hand image for opposite view */}
            <div className={`w-28 h-28 rounded-full border-4 border-rose-400/40 bg-rose-950/20 flex items-center justify-center text-6xl shadow-2xl transition-all ${
              isShaking ? 'shake-right' : 'glow-pink'
            }`}>
              <span className="inline-block transform scale-x-[-1]">{rightHandHandEmoji}</span>
            </div>
            <span className="text-xs font-bold text-rose-400 uppercase mt-3 tracking-widest">
              {revealedMoves.opponent ? revealedMoves.opponent : (hasOpponentChosen ? 'LOCKED IN' : 'SELECTING')}
            </span>
          </div>
        </div>
      </div>

      {/* Control Deck */}
      <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 backdrop-blur-md space-y-4">
        {gameWinner ? (
          /* Rematch Game Over state */
          <div className="text-center space-y-4 py-4 animate-scaleIn">
            <h2 className="text-3xl font-black tracking-tight uppercase">
              {gameWinner === 'you' ? '🏆 YOU WON THE MATCH! 🏆' : '💀 MATCH DEFEAT 💀'}
            </h2>
            <p className="text-xs text-slate-400 uppercase">
              First core pilot to 3 wins is completed.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={onQuit}
                className="px-6 py-2.5 rounded-xl border border-white/10 hover:bg-slate-800 font-bold text-xs uppercase transition-all"
              >
                Quit Lobby
              </button>
              <button
                onClick={handlePlayAgain}
                className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-widest transition-all glow-blue"
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        ) : (
          /* Selection choices */
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-500 font-bold uppercase tracking-wider">
              <span>Select Core Move (Key 1, 2, 3)</span>
              <span>{myChoice ? 'Waiting for opponent...' : 'Awaiting lock...'}</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                disabled={!!myChoice}
                onClick={() => makeChoice('rock')}
                className={`py-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all uppercase relative ${
                  myChoice === 'rock'
                    ? 'border-sky-400 bg-sky-500/10'
                    : 'border-white/10 bg-slate-950/60 hover:border-sky-400/40 hover:scale-[1.02] active:scale-100'
                }`}
              >
                <span className="text-3xl">✊</span>
                <span className="text-[10px] font-bold text-white/80">ROCK</span>
                <span className="absolute top-1 right-2 text-[8px] text-slate-600 font-mono">1</span>
              </button>

              <button
                disabled={!!myChoice}
                onClick={() => makeChoice('paper')}
                className={`py-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all uppercase relative ${
                  myChoice === 'paper'
                    ? 'border-sky-400 bg-sky-500/10'
                    : 'border-white/10 bg-slate-950/60 hover:border-sky-400/40 hover:scale-[1.02] active:scale-100'
                }`}
              >
                <span className="text-3xl">✋</span>
                <span className="text-[10px] font-bold text-white/80">PAPER</span>
                <span className="absolute top-1 right-2 text-[8px] text-slate-600 font-mono">2</span>
              </button>

              <button
                disabled={!!myChoice}
                onClick={() => makeChoice('scissors')}
                className={`py-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all uppercase relative ${
                  myChoice === 'scissors'
                    ? 'border-sky-400 bg-sky-500/10'
                    : 'border-white/10 bg-slate-950/60 hover:border-sky-400/40 hover:scale-[1.02] active:scale-100'
                }`}
              >
                <span className="text-3xl">✌️</span>
                <span className="text-[10px] font-bold text-white/80">SCISSORS</span>
                <span className="absolute top-1 right-2 text-[8px] text-slate-600 font-mono">3</span>
              </button>
            </div>
            
            <div className="text-center pt-2">
              <button
                onClick={onQuit}
                className="text-xs text-slate-500 hover:text-rose-400 uppercase tracking-widest font-bold font-mono transition-all"
              >
                LEAVE ARENA
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

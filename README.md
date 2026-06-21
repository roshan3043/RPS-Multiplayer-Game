# Rock-Paper-Scissors Online Multiplayer Game

A real-time, online multiplayer Rock-Paper-Scissors game replica of the tutorial by **CyberWolves**. It features a modern dark UI/HUD, room synchronization, CSS-based physical hand-shaking animations, and keyboard shortcuts.

---

## 🛠️ Tech Stack

- **Frontend Client**: React (Vite) + Tailwind CSS v4 + Socket.io-client
- **Backend Server**: Node.js + Express + Socket.io

---

## 🌟 Key Features

1. **Matchmaking Modes**:
   - **Play with Stranger**: Direct matchmaking queue that pairs two searching players automatically.
   - **Play with Friend**: Generates a room code (e.g. `RPS-123456`) and shareable link (`?room=RPS-123456`) to invite opponents. Entering the page via an invite link automatically fills the code for connection.
2. **Arena Scoreboard HUD**:
   - Split layout header displaying names, scores, and lock-in indicators. First to **3 wins** wins the match!
3. **Clashing Hand Animations**:
   - Hands display as closed fists (`✊`) that shake in unison using CSS animations (`@keyframes shakeLeft`/`shakeRight`) upon move locks.
   - Reveals choices (✊, ✋, ✌️) after the shake is completed, updating scoreboard values concurrently.
4. **Keyboard Shortcuts**:
   - Make selections quickly using keyboard hotkeys:
     - `1` key for **Rock** (✊)
     - `2` key for **Paper** (✋)
     - `3` key for **Scissors** (✌️)
5. **Real-time Event Synchronization**:
   - Uses Socket.io bi-directional messaging to coordinate moves, restarts, queues, and cleanups on disconnects.

---

## 📂 Project Structure

```
├── client/                 # React + Vite Client
│   ├── src/
│   │   ├── components/
│   │   │   └── GameScreen.jsx  # Main arena HUD, shaking fists, choice selectors
│   │   ├── App.jsx             # Top-level client router & socket listeners
│   │   └── index.css           # Styling sheets and shake keyframe animation blocks
│   └── package.json
│
├── server/                 # Node.js + Express Server
│   ├── server.js           # Matchmaker rooms controller
│   └── package.json
│
└── README.md
```

---

## 🚀 How to Run Locally

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed.

### Step 1: Run the Backend Server
Open a terminal, navigate to the `server/` directory, install packages, and start the developer server:
```bash
cd server
npm install
npm run dev
```
*The server will run on port `5000`.*

### Step 2: Run the Client App
Open a separate terminal, navigate to the `client/` directory, install packages, and start the client dev server:
```bash
cd client
npm install
npm run dev
```
*The client will run on Vite's default dev server (usually `http://localhost:5173`).*

Open `http://localhost:5173` in multiple browser windows (e.g. Chrome normal and Incognito) to play a real-time matched game!

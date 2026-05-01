# 🚀 Chain of Command: Stellar War

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![PixiJS](https://img.shields.io/badge/PixiJS-ff3e81?style=for-the-badge&logo=pixijs&logoColor=white)](https://pixijs.com/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

**Chain of Command: Stellar War** is a cooperative tactical space combat game built for the web. Command massive capital ships, manage a stressed bridge crew, and outmaneuver the relentless Hegemony AI in a hex-based theater of war.

> *Success in this cold, unforgiving theater of war requires perfect coordination with your allies, shrewd management of your stressed and overworked bridge crew, and the tactical acumen to outmaneuver a relentless enemy AI.*

---

## 🌌 Key Features

*   **Tactical Capital Ship Combat**: Experience the weight of command with realistic momentum physics. Your ship doesn't just stop—it drifts. Plan your vectors rounds in advance.
*   **Bridge Crew Management**: Allocate **Command Tokens (CT)** to your officers:
    *   **Helm**: Manage speed, rotation, and evasive maneuvers.
    *   **Tactical**: Fire primary and secondary weapon systems.
    *   **Engineering**: Manage shields, hull repairs, and subsystem recovery.
    *   **Sensors**: Target locks, electronic warfare, and scanning.
*   **Stress System**: Push your officers to their limits, but beware—overworked crew members may **Fumble**, leading to misfires, engine stalls, or critical errors.
*   **Step-Die Volley System**: A unique polyhedral dice system (D4 through D12) with **Exploding Criticals** that makes every volley feel impactful.
*   **Dynamic Scenarios**:
    *   **Procedural Scenario Generator**: Fight in "Station Sieges", "Turret Breaches", and "Breakout" missions.
    *   **Scenario Editor**: Create your own tactical challenges with custom layouts and enemy deployments.
*   **Environmental Hazards**: Navigate through Asteroid Belts, Ion Nebulas, and Debris Fields that drastically alter LoS and combat effectiveness.

## 🛠️ Tech Stack

*   **Engine**: [PixiJS](https://pixijs.com/) for high-performance hex-map rendering.
*   **Frontend**: [React 19](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/).
*   **State Management**: [Zustand](https://github.com/pmndrs/zustand) for reactive, performant game state.
*   **Animations**: [Framer Motion](https://www.framer.com/motion/) for polished UI transitions.
*   **Build Tool**: [Vite](https://vitejs.dev/).
*   **Testing**: [Vitest](https://vitest.dev/) & [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).

## 🚀 Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (Latest LTS recommended)
*   npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Arrowstar/Chain-of-Command-Game.git
    cd Chain-of-Command-Game
    ```

2.  Install dependencies:
    ```bash
    cd app
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```

4.  Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📂 Project Structure

```text
├── app/                # Main React Application
│   ├── src/
│   │   ├── components/ # UI Components (Board, Console, Editor)
│   │   ├── data/       # Game Data (Adversaries, Officers, Tactics)
│   │   ├── store/      # Zustand State Management (Game, UI, Editor)
│   │   ├── types/      # TypeScript Definitions
│   │   └── utils/      # Combat Logic, Math, and Helpers
│   └── public/         # Game Assets (Sprites, Textures)
├── design_docs/        # Rulebooks, Design Notes, and Lore
└── public/             # Global Static Assets
```

## 📜 Development Notes

*   **Combat Logic**: Located in `app/src/utils/combat.ts`.
*   **AI Tactics**: Defined in `app/src/data/tacticDeck.ts`.
*   **Hex Map Logic**: Handled in `app/src/components/board/HexMap.tsx` using PixiJS.

---

*“Will you secure victory for the fleet, or face a court-martial—or worse, a silent grave—in the dark?”*

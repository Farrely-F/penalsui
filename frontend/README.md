# PenalSUI Frontend

A React-based frontend for the PenalSUI penalty shootout game built on the SUI blockchain.

## 🚀 Features

- **Wallet Integration**: Connect SUI-compatible wallets (Sui Wallet, Surf Wallet, etc.)
- **Game Creation**: Create new penalty shootout matches
- **Game Joining**: Join existing games using Game ID
- **Real-time Gameplay**: Turn-based penalty shootout with live updates
- **Beautiful UI**: Modern design with Tailwind CSS and shadcn/ui components
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Tech Stack

- **React 18** - Frontend framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library
- **@mysten/dapp-kit** - SUI wallet integration
- **@mysten/sui** - SUI blockchain SDK
- **@tanstack/react-query** - Data fetching and caching
- **Bun** - Package manager and runtime

## 📦 Installation

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## 🎮 How to Play

1. **Connect Wallet**: Click "Connect Wallet" and connect your SUI wallet
2. **Create or Join Game**: 
   - Create a new game and share the Game ID with a friend
   - Or join an existing game using a Game ID
3. **Start Game**: Once both players have joined, either player can start the game
4. **Play Rounds**: Take turns as shooter and goalkeeper
   - **Shooter**: Choose direction to shoot (Left, Center, Right)
   - **Goalkeeper**: Guess where the opponent will shoot
   - Goal is scored if goalkeeper guesses wrong
5. **Win**: Player with most goals after 5 rounds wins!

## 🔧 Configuration

The contract configuration is located in `src/contracts/config.ts`:

```typescript
export const CONTRACT_CONFIG = {
  PACKAGE_ID: "0x54571514857de28f9e16b499c99695274b6489be147c061366f775eb120b5412",
  GAME_REGISTRY_ID: "0x61992df5c5cd8ecc892af6f915eb1a610bcfff853cdca071b4ca7f3e4a70f5b7",
  MODULE_NAME: "game",
  // ...
};
```

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── GameLobby.tsx      # Game creation and joining
│   ├── GameInterface.tsx  # Main game interface
│   └── WalletStatus.tsx   # Wallet connection status
├── contracts/
│   └── config.ts          # Contract configuration
├── hooks/
│   └── useGameContract.ts # Contract interaction hooks
├── lib/
│   └── utils.ts           # Utility functions
├── App.tsx                # Main app component
├── main.tsx              # App entry point
└── networkConfig.ts      # SUI network configuration
```

## 🔗 Contract Integration

The frontend integrates with the PenalSUI smart contract through:

- **Contract Calls**: Create game, join game, start game, shoot, keep
- **State Queries**: Game state, round info, current turn
- **Real-time Updates**: Polling for game state changes
- **Event Handling**: Transaction success/error handling

## 🌐 Network Configuration

The app is configured to work with SUI testnet by default. You can change the network in `src/main.tsx`:

```typescript
<SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
```

## 🎨 UI Components

Built with shadcn/ui components for a consistent and beautiful interface:

- Cards for game sections
- Buttons for actions
- Progress bars for game progress
- Badges for status indicators
- Toast notifications for feedback

## 🔄 Real-time Features

- **Auto-refresh**: Game state updates every 2 seconds
- **Turn detection**: Automatically detects whose turn it is
- **Live scoring**: Real-time score updates
- **Round progression**: Automatic round advancement

## 🚨 Error Handling

- Wallet connection errors
- Transaction failures
- Network issues
- Invalid game states
- User-friendly error messages

## 📱 Responsive Design

The interface is fully responsive and works on:

- Desktop computers
- Tablets
- Mobile phones
- Different screen orientations

## 🔐 Security

- All transactions require wallet signatures
- No private keys stored in frontend
- Contract addresses are hardcoded for security
- Input validation for all user actions

## 🎯 Future Enhancements

- Game history and statistics
- Player profiles and rankings
- Tournament mode
- Spectator mode
- Mobile app version
- NFT integration for achievements

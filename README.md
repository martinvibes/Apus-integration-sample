# APUS Chat Attestation Example

A React-based chat application with attestation using AO Network and Arweave Wallet.

## Features
- Wallet connection with arweave-wallet-kit
- AI chat powered by AO Network (aoconnect)
- Real-time attestation display
- Modern Web3 UI design
- TypeScript support with strict type checking
- Centralized configuration management

## Quick Start
```bash
npm install
npm run dev
```

## Configuration
- Update the configuration in `src/config/index.ts`
- Main configuration includes:
  - `aoProcessId`: Your AO process ID
  - `appName`: Application name
  - `defaultAttestedBy`: Default attestation providers
  - `walletPermissions`: Required wallet permissions

## Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Tech Stack
- React 19 + TypeScript + Vite
- Ant Design
- arweave-wallet-kit + @permaweb/aoconnect
- ESLint with TypeScript support


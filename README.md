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

## AO Process Deployment

This project includes an AO process that handles AI inference requests. Follow these steps to deploy your own AO process:

### 1. Install aos CLI

```bash
npm i -g https://preview_ao.arweave.net
```

### 2. Spawn your process & trust APUS HyperBEAM Node

1. **Spawn your process:**
   ```bash
   aos my_process
   ```
2. **Select aos:**
   When prompted, select the default `aos` option. There is no need to select `hyper-hos`.

   ![aos selection example](./aos_selection.png)

3. **Trust APUS node operator:**
   ```bash
   ao.authorities[2] = "lpJ5Edz_8DbNnVDL0XdbsY9vCOs45NACzfI4jvo4Ba8"
   ```

### 3. Deploy the AO Process

1. **Navigate to the ao_process directory:**
   ```bash
   cd ao_process
   ```

2. **Deploy the process:**
   ```bash
   aos my_process --mainnet http://72.46.85.207:8734
   ```
2. **Load the AO agent code:**
   ```bash
   .load ao_agent.lua
   ```

### 4. Update Configuration

After deploying your AO process, update the process ID in `src/config/index.ts`:

```typescript
export const config = {
  // AO Network Configuration
  aoProcessId: 'YOUR_PROCESS_ID_HERE', // Replace with your deployed process ID
  
  // APUS HyperBEAM Node Configuration
  apusHyperbeamNodeUrl: 'http://72.46.85.207:8734',
  // ... rest of config
} as const;
```

### 5. AO Process Code

The AO process code is located in `ao_process/ao_agent.lua`. This process:

- Listens for inference requests with the "Infer" action
- Forwards requests to the APUS AI service
- Stores results in a cache for retrieval
- Exposes results via the `patch@1.0` protocol

### Process Flow

1. **Frontend sends request** → AO Process receives "Infer" action
2. **AO Process forwards** → APUS AI service processes the request
3. **AI service responds** → AO Process stores result in cache
4. **Frontend retrieves** → Results are fetched via HTTP API

## Tech Stack
- React 19 + TypeScript + Vite
- Ant Design
- arweave-wallet-kit + @permaweb/aoconnect
- ESLint with TypeScript support
- AO Network (Lua-based smart contracts)


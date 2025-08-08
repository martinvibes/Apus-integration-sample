export const config = {
  // AO Network Configuration
  aoProcessId: 'AXKZaeCaI6V8hfadGtvVbNSCDndgyTPIPwF0mznbt8E', // TODO: Replace with your AO process ID
  
  // App Configuration
  appName: 'apus-chat-example',
  appLogo: undefined,
  
  // Attestation Configuration
  defaultAttestedBy: ['NVIDIA', 'AMD'],
  
  // UI Configuration
  theme: {
    accent: { r: 9, g: 29, b: 255 },
  },
  
  // Wallet Configuration
  walletPermissions: ['ACCESS_ADDRESS', 'SIGN_TRANSACTION', 'DISPATCH'] as const,
  ensurePermissions: true,
} as const; 
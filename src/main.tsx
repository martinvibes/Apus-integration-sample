import { createRoot } from "react-dom/client";
import App from "./App";
import { ArweaveWalletKit } from "arweave-wallet-kit";
import { ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./config";
import "./index.css";

console.log("main.tsx is loading...");

// Create a QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const root = document.getElementById("root");
console.log("Root element:", root);

if (root) {
  console.log("Creating React root...");
  const reactRoot = createRoot(root);

  reactRoot.render(
    <ArweaveWalletKit
      config={{
        permissions: [...config.walletPermissions],
        ensurePermissions: config.ensurePermissions,
        appInfo: {
          name: config.appName,
          logo: config.appLogo,
        },
      }}
      theme={{
        accent: config.theme.accent,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ConfigProvider>
          <App />
        </ConfigProvider>
      </QueryClientProvider>
    </ArweaveWalletKit>
  );

  console.log("React app rendered successfully");
} else {
  console.error("Root element not found!");
}

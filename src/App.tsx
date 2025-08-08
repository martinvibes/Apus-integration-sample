import React, { useState } from "react";
import ChatBox from "./components/ChatBox";
import WalletConnectButton from "./components/WalletConnectButton";
import AttestationSection from "./components/AttestationSection";

interface AttestationInfo {
  runtimeMeasurement: string;
  tlsFingerprint: string;
  attestedBy: string[];
}

const App: React.FC = () => {
  const [attestation, setAttestation] = useState<AttestationInfo | null>(null);

  console.log("App component rendering...");

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Background decoration */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)",
        pointerEvents: "none"
      }} />
      
      <WalletConnectButton />
      
      <div style={{ 
        position: "relative", 
        zIndex: 1,
        padding: "40px 20px",
        maxWidth: 1400,
        margin: "0 auto"
      }}>
        <h1 style={{ 
          textAlign: "center", 
          color: "white", 
          fontSize: "2.5rem",
          fontWeight: 700,
          marginBottom: 60,
          textShadow: "0 2px 4px rgba(0,0,0,0.3)",
          letterSpacing: "0.5px"
        }}>
          APUS Chat Attestation Example
        </h1>
        
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          gap: 40, 
          alignItems: "flex-start"
        }}>
          <ChatBox onAttestationUpdate={setAttestation} />
          <AttestationSection 
            runtimeMeasurement={attestation?.runtimeMeasurement}
            tlsFingerprint={attestation?.tlsFingerprint}
            attestedBy={attestation?.attestedBy}
          />
        </div>
      </div>
    </div>
  );
};

export default App; 
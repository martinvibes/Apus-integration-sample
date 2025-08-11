import React, { useState, useRef, useEffect } from "react";
import { Input, Button, message as antdMessage } from "antd";
import { useWallet } from "../contexts/WalletContext";
import { connect, createSigner } from '@permaweb/aoconnect';
import { config } from "../config";

interface ChatItem {
  role: "user" | "assistant" | "tip";
  message: string;
  timestamp: number;
}

interface AttestationInfo {
  runtimeMeasurement: string;
  tlsFingerprint: string;
  attestedBy: string[];
}

interface ChatBoxProps {
  onAttestationUpdate?: (attestation: AttestationInfo) => void;
}

const DEFAULT_CHAT: ChatItem[] = [
  {
    role: "tip",
    message: "Hi, I’m Apus Assistant! Ask me anything below — let’s get started!",
    timestamp: Date.now(),
  },
];

const processId = config.aoProcessId;
const apusHyperbeamNodeUrl = config.apusHyperbeamNodeUrl;

const payApusToken = async () => {
  // TODO: Call backend/contract to pay 1 Apus Token
  return Promise.resolve();
};

// Poll for result using fetch with 404 retry mechanism
const pollForResult = async (requestReference: string): Promise<{ data: string; attestation?: string; reference?: string; status?: string }> => {
  const resultApiUrl = `${apusHyperbeamNodeUrl}/${processId}~process@1.0/now/cache/tasks/${requestReference}/serialize~json@1.0`;
  
  console.log("Fetching result from URL:", resultApiUrl);
  console.log("Request Reference:", requestReference);

  try {
    const response = await fetch(resultApiUrl);
    
    if (response.status === 404) {
      // 404 means result is not ready yet, continue polling
      console.log("Result not ready (404), retrying in 5 seconds...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      return pollForResult(requestReference);
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Received response:", data);
    
    // Check the status field
    const status = data.status;
    console.log("Task status:", status);
    
    if (status === "processing") {
      // Still processing, retry in 5 seconds
      console.log("Task still processing, retrying in 5 seconds...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      return pollForResult(requestReference);
    }
    
    if (status === "failed") {
      // Task failed, throw error with error message
      const errorMessage = data.error_message || "Task failed without error message";
      console.error("Task failed:", errorMessage);
      throw new Error(`Task failed: ${errorMessage}`);
    }
    
    if (status === "success") {
      // Task completed successfully, parse the response
      const responseData = data.response;
      console.log("Response data:", responseData);
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseData);
        console.log("Parsed response:", parsedResponse);
      } catch (error) {
        console.error("Failed to parse response:", error);
        throw new Error('Invalid response format');
      }
      
      // Extract result and attestation from the parsed response
      const result = parsedResponse.result;
      const attestation = parsedResponse.attestation;
      
      console.log("Extracted result:", result);
      console.log("Extracted attestation:", attestation);
      
      return {
        data: typeof result === 'string' ? result : JSON.stringify(result),
        attestation: attestation,
        reference: requestReference,
        status: 'success'
      };
    }
    
    // Unknown status
    throw new Error(`Unknown task status: ${status}`);
    
  } catch (error: unknown) {
    console.error('Failed to fetch result:', error);
    
    // If it's a network error, retry
    if (error instanceof TypeError || (error instanceof Error && error.message.includes('fetch'))) {
      console.log("Network error, retrying in 5 seconds...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      return pollForResult(requestReference);
    }
    
    throw new Error('Failed to get result: ' + (error instanceof Error ? error.message : String(error)));
  }
};

const ChatBox: React.FC<ChatBoxProps> = ({ onAttestationUpdate }) => {
  const { checkLogin } = useWallet();
  const [chatHistory, setChatHistory] = useState<ChatItem[]>(DEFAULT_CHAT);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestReference, setRequestReference] = useState<string>('');
  const chatListRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when chatHistory changes
  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSend = async () => {
    if (!checkLogin()) return;
    if (!prompt.trim()) {
      antdMessage.warning("Please enter a message");
      return;
    }
    
    setLoading(true);
    try {
      await payApusToken();
      
      // Generate unique reference for this request
      const ref = Date.now().toString();
      setRequestReference(ref);
      
      setChatHistory((prev) => [
        ...prev,
        { role: "user", message: prompt, timestamp: Date.now() },
        { role: "tip", message: "Your question is sent. Please wait for the answer...", timestamp: Date.now() },
      ]);
      
      const currentPrompt = prompt;
      setPrompt("");

      // Setup aoconnect with HyperBEAM node
      const { request } = connect({
        MODE: "mainnet", 
        URL: apusHyperbeamNodeUrl,
        signer: createSigner(window.arweaveWallet),
      });

      // Send request using new API structure
      const data = await request({
        type: 'Message',
        path: `/${processId}~process@1.0/push/serialize~json@1.0`,
        method: "POST",
        'data-protocol': 'ao',
        variant: 'ao.N.1',
        "accept-bundle": "true",
        "accept-codec": "httpsig@1.0",
        signingFormat: "ANS-104",
        target: processId,
        Action: "Infer",
        'X-Reference': ref,
        data: currentPrompt,
      });
      
      console.log('Request sent successfully:', data);

      // Poll for result using new fetch method
      const aiReply = await pollForResult(ref);
      console.log('AI Reply received:', aiReply);

      // Update chat history with AI response
      setChatHistory((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", message: aiReply.data || String(aiReply), timestamp: Date.now() }
      ]);

      // Update attestation if available
      if (aiReply.attestation) {
        // Handle complex attestation structure
        let attestationData = aiReply.attestation;
        let attestationJWT = '';
        
        // Extract JWT from the complex attestation structure
        if (Array.isArray(attestationData) && attestationData.length > 0) {
          // Look for the first JWT in the attestation array
          for (const item of attestationData) {
            if (Array.isArray(item) && item.length === 2 && item[0] === 'JWT') {
              attestationJWT = item[1];
              break;
            }
          }
        }
        
        const newAttestation = {
          runtimeMeasurement: attestationJWT || JSON.stringify(attestationData),
          tlsFingerprint: aiReply.reference || "N/A",
          attestedBy: [...config.defaultAttestedBy]
        };
        onAttestationUpdate?.(newAttestation);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to send message";
      antdMessage.error(errorMessage);
      setChatHistory((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      width: 600, 
      background: "rgba(255, 255, 255, 0.9)", 
      borderRadius: 20, 
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)", 
      padding: 24,
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255, 255, 255, 0.2)"
    }}>
      <div
        ref={chatListRef}
        style={{
          height: 400,
          marginBottom: 20,
          overflowY: "auto",
          padding: "16px 0",
          background: "transparent"
        }}
      >
        {chatHistory.map((item, idx) => (
          <div key={idx} style={{ 
            textAlign: item.role === "user" ? "right" : "left", 
            margin: "12px 0",
            padding: "8px 0"
          }}>
            <div style={{
              display: "inline-block",
              maxWidth: "70%",
              padding: "12px 16px",
              borderRadius: item.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: item.role === "user" 
                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" 
                : item.role === "tip" 
                ? "#f0f0f0" 
                : "#f8f9fa",
              color: item.role === "user" ? "white" : "#333",
              fontSize: "14px",
              lineHeight: "1.5",
              boxShadow: item.role === "user" ? "0 2px 8px rgba(102, 126, 234, 0.3)" : "0 1px 3px rgba(0,0,0,0.1)"
            }}>
              {item.message}
            </div>
          </div>
        ))}
      </div>
      
      {/* Request Reference Display */}
      {requestReference && (
        <div style={{ 
          marginBottom: 16, 
          padding: "8px 12px", 
          background: "rgba(0, 123, 255, 0.1)", 
          borderRadius: 8,
          fontSize: "12px",
          color: "#666"
        }}>
          <strong>Request Reference:</strong> {requestReference}
        </div>
      )}
      
      <div style={{ 
        background: "rgba(255, 255, 255, 0.8)", 
        borderRadius: 16, 
        padding: "16px",
        border: "1px solid rgba(255, 255, 255, 0.3)"
      }}>
        <Input.TextArea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Type your question here..."
          autoSize={{ minRows: 2, maxRows: 4 }}
          disabled={loading}
          onPressEnter={e => { if (!e.shiftKey) { e.preventDefault(); handleSend(); } }}
          style={{
            border: "none",
            background: "transparent",
            fontSize: "14px",
            resize: "none"
          }}
        />
        <div style={{ textAlign: "right", marginTop: 12 }}>
          <Button 
            type="primary" 
            onClick={handleSend} 
            loading={loading} 
            disabled={loading}
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              borderRadius: "12px",
              height: "40px",
              padding: "0 24px",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)"
            }}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatBox; 
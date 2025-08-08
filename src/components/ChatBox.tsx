import React, { useState, useRef, useEffect } from "react";
import { Input, Button, message as antdMessage } from "antd";
import { useWallet } from "../contexts/WalletContext";
import { message as aoMessage, dryrun, createDataItemSigner,result as aoResult } from '@permaweb/aoconnect';
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
    message: "Hi, I'm Qwen! Please type your question below. Enjoy!",
    timestamp: Date.now(),
  },
];

const processId = config.aoProcessId;

const payApusToken = async () => {
  // TODO: Call backend/contract to pay 1 Apus Token
  return Promise.resolve();
};

// Poll AO process for inference result
const pollForResult = async (processId: string, messageId: string): Promise<{ data: string; attestation?: string; reference?: string; status?: string }> => {
  try {
    const result = await dryrun({
      process: processId,
      tags: [
        { name: 'Action', value: 'GetResult' },
        { name: 'Messageid', value: messageId }
      ],
    });


    const response = result.Messages?.[0]?.Data;
    let parsed;
    try {
      parsed = typeof response === 'string' ? JSON.parse(response) : response;
    } catch {
      parsed = response;
    }

    // 修正逻辑：只有 status 为 "success" 时才返回结果，为 "processing" 时继续轮询，其他情况返回错误或原始数据
    if (parsed && parsed.data && parsed.attestation) {
      // 有 attestation 说明推理完成
      return parsed;
    } else if (parsed && parsed.status === "success") {
      // 没有 attestation 但 status 为 success，也认为完成
      return parsed;
    } else if (parsed && parsed.status === "processing") {
      // 还在处理中，继续轮询
      await new Promise(res => setTimeout(res, 5000));
      return pollForResult(processId, messageId);
    } else if (!response) {
      // 没有返回内容
      return { data: "No response" };
    } else {
      // 其他情况直接返回原始数据
      return { data: response };
    }
  } catch (e) {
    throw new Error('Failed to get result: ' + (e instanceof Error ? e.message : e));
  }
};

const ChatBox: React.FC<ChatBoxProps> = ({ onAttestationUpdate }) => {
  const { checkLogin } = useWallet();
  const [chatHistory, setChatHistory] = useState<ChatItem[]>(DEFAULT_CHAT);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
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
      setChatHistory((prev) => [
        ...prev,
        { role: "user", message: prompt, timestamp: Date.now() },
        { role: "tip", message: "Your question is sent. Please wait for the answer...", timestamp: Date.now() },
      ]);
      const currentPrompt = prompt;
      setPrompt("");

      // 1. Send inference request
      const signer = createDataItemSigner(window.arweaveWallet);
      const res = await aoMessage({
        process: processId,
        tags: [{ name: 'Action', value: 'SendRequest' }],
        data: currentPrompt,
        signer,
      });
      console.log(res);
      const messageId = res;

      const result = await aoResult({
        process: processId,
        message: messageId,
      });
      console.log(result);

      const taskRef = result?.Messages?.[1]?.Data;
      console.log(taskRef);

      // 2. Poll for inference result
      const aiReply = await pollForResult(processId, taskRef);
      console.log(aiReply);

      // 3. Update chat history with AI response
      setChatHistory((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", message: aiReply.data || String(aiReply), timestamp: Date.now() }
      ]);

      // 4. Update attestation if available
      if (aiReply.attestation) {
        const newAttestation = {
          runtimeMeasurement: aiReply.attestation,
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
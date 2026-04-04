import { useEffect, useState, useRef } from "react";
import { socket } from "../socket";
import { Input, Button } from "./UI";
import axios from "axios";

export default function GroupChat({ groupId, user, token }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  // Load messages
  useEffect(() => {
    axios.get(`/api/messages/${groupId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setMessages(res.data))
      .catch(() => setMessages([]));
  }, [groupId, token]);

  // Socket setup
  useEffect(() => {
    socket.emit("join_group", groupId);

    socket.on("receive_message", (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => socket.off("receive_message");
  }, [groupId]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!text.trim()) return;

    socket.emit("send_message", {
      groupId,
      userId: user._id,
      text,
    });

    setText("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 350 }}>
      
      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        paddingRight: 6
      }}>
        {messages.map((m) => {
          const isMe = m.sender._id === user._id;

          return (
            <div
              key={m._id}
              style={{
                alignSelf: isMe ? "flex-end" : "flex-start",
                background: isMe ? "var(--accent)" : "var(--surface)",
                color: isMe ? "#000" : "var(--text)",
                padding: "8px 12px",
                borderRadius: 12,
                maxWidth: "70%",
                fontSize: 14
              }}
            >
              {!isMe && (
                <div style={{
                  fontSize: 11,
                  opacity: 0.6,
                  marginBottom: 2
                }}>
                  {m.sender.name}
                </div>
              )}

              <div>{m.text}</div>

              {/* Timestamp */}
              <div style={{
                fontSize: 10,
                opacity: 0.5,
                textAlign: "right",
                marginTop: 4
              }}>
                {new Date(m.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: "flex",
        gap: 8,
        marginTop: 10
      }}>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <Button onClick={sendMessage}>
          Send
        </Button>
      </div>
    </div>
  );
}
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
  if (!groupId) return;

  console.log("Joining group:", groupId);

  // ✅ join room
  socket.emit("join_group", groupId);

  // ✅ stable listener
  const handleMessage = (msg) => {
    console.log("Received message:", msg);
    setMessages(prev => [...prev, msg]);
  };

  socket.on("receive_message", handleMessage);

  // ✅ cleanup (VERY IMPORTANT)
  return () => {
    socket.off("receive_message", handleMessage);
  };
}, [groupId]);


  // ✅ FIXED sendMessage (ONLY IMPROVED)
  const sendMessage = () => {
    if (!text.trim()) return;

    // ✅ DEBUG USER STRUCTURE
    console.log("USER OBJECT:", user);

    // ✅ SAFE USER ID EXTRACTION
    const senderId =
      user?._id ||
      user?.id ||
      user?.user?._id ||
      user?.data?._id;

    if (!senderId) {
      console.error("❌ senderId is undefined. Fix user object.");
      return;
    }

    socket.emit("send_message", {
      groupId,
      userId: senderId, // ✅ FIXED
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
          // ✅ SAFE CHECK (prevents crash)
          const isMe = m.sender?._id === (user?._id || user?.id);

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
                  {m.sender?.name || "User"} {/* ✅ SAFE */}
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
import { useEffect, useState, useRef } from 'react';
import { socket } from '../socket';
import { Input, Button } from './UI';
import { useNotif } from '../context/NotifContext';
import axios from 'axios';

export default function GroupChat({ groupId, user, token }) {
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState('');
  const bottomRef  = useRef(null);
  const { setActiveChatGroupId } = useNotif();

  // Tell NotifContext this chat is open → suppresses toast for incoming messages here
  useEffect(() => {
    if (!groupId) return;
    setActiveChatGroupId(groupId);
    return () => setActiveChatGroupId(null); // clear when unmounted / group changes
  }, [groupId, setActiveChatGroupId]);

  // Load message history
  useEffect(() => {
    if (!groupId) return;
    axios.get(`/api/messages/${groupId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setMessages(res.data))
      .catch(() => setMessages([]));
  }, [groupId, token]);

  // Join group socket room + listen for incoming messages
  useEffect(() => {
    if (!groupId) return;
    socket.emit('join_group', groupId);

    const handleMessage = (msg) => {
      setMessages(prev => {
        // Prevent duplicates (can happen if sender receives their own echo)
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      // Scroll to bottom on new message
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };

    socket.on('receive_message', handleMessage);
    return () => socket.off('receive_message', handleMessage);
  }, [groupId]);

  // Scroll to bottom when messages load
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [messages.length === 1]); // only on initial load

  const sendMessage = () => {
    if (!text.trim()) return;

    const senderId = user?._id || user?.id || user?.user?._id;
    if (!senderId) {
      console.error('senderId undefined — check user object');
      return;
    }

    socket.emit('send_message', { groupId, userId: senderId, text: text.trim() });
    setText('');
  };

  const myId = user?._id || user?.id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 350 }}>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        paddingRight: 6,
        paddingBottom: 4,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '12px', padding: '24px 0' }}>
            No messages yet — say hello!
          </div>
        )}

        {messages.map((m) => {
          const isMe = String(m.sender?._id) === String(myId);
          return (
            <div
              key={m._id}
              style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                background: isMe ? 'var(--accent)' : 'var(--surface2)',
                color: isMe ? '#000' : 'var(--text)',
                border: isMe ? 'none' : '1px solid var(--border)',
                padding: '8px 12px',
                borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                maxWidth: '72%',
                fontSize: 13,
              }}
            >
              {!isMe && (
                <div style={{ fontSize: 10, opacity: 0.65, marginBottom: 2, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                  {m.sender?.name || 'User'}
                </div>
              )}
              <div style={{ lineHeight: 1.5 }}>{m.text}</div>
              <div style={{ fontSize: 10, opacity: 0.5, textAlign: 'right', marginTop: 4 }}>
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Message..."
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <Button onClick={sendMessage}>Send</Button>
      </div>
    </div>
  );
}
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../socket';
import { useAuth } from './AuthContext';

const NotifContext = createContext(null);

export function NotifProvider({ children }) {
  const { user } = useAuth();

  // toasts: [{ id, message, type, at }]  — shown on screen, auto-dismiss
  const [toasts,   setToasts]   = useState([]);
  // history: all notifications received this session
  const [history,  setHistory]  = useState([]);
  const [unread,   setUnread]   = useState(0);
  const timerMap = useRef({});

  // Join personal notification room when user logs in
  useEffect(() => {
    if (!user) return;
    const uid = user.id || user._id;
    socket.emit('join_user', uid);
  }, [user]);

  const dismissToast = useCallback((id) => {
    clearTimeout(timerMap.current[id]);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((notification) => {
    const id = `${Date.now()}-${Math.random()}`;
    const toast = { ...notification, id };

    setToasts(prev => [...prev.slice(-3), toast]); // max 4 toasts visible
    setHistory(prev => [toast, ...prev]);
    setUnread(prev => prev + 1);

    // Auto-dismiss after 5s
    timerMap.current[id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    socket.on('notification', addToast);
    return () => socket.off('notification', addToast);
  }, [addToast]);

  const clearUnread = useCallback(() => setUnread(0), []);

  return (
    <NotifContext.Provider value={{ toasts, history, unread, clearUnread, dismissToast }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotif() {
  return useContext(NotifContext);
}
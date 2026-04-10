import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../socket';
import { useAuth } from './AuthContext';

const NotifContext = createContext(null);

export function NotifProvider({ children }) {
  const { user } = useAuth();

  const [toasts,  setToasts]  = useState([]);
  const [history, setHistory] = useState([]);
  const [unread,  setUnread]  = useState(0);

  // The groupId of the chat the user is currently viewing.
  // Set this via setActiveChatGroup() from GroupChat / GroupsPage.
  // When a chat notification arrives for this group, we skip the toast
  // (they can already see the messages) but still add to history.
  const [activeChatGroupId, setActiveChatGroupId] = useState(null);

  const timerMap = useRef({});

  // Join personal notification room whenever user changes
  useEffect(() => {
    if (!user) return;
    const uid = user.id || user._id;
    socket.emit('join_user', uid);
  }, [user]);

  const dismissToast = useCallback((id) => {
    clearTimeout(timerMap.current[id]);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addNotification = useCallback((notification) => {
    const id    = `${Date.now()}-${Math.random()}`;
    const entry = { ...notification, id };

    // Always add to history and increment unread
    setHistory(prev => [entry, ...prev]);
    setUnread(prev => prev + 1);

    // Suppress toast only if this is a chat message for the group currently open
    const isChatForActiveGroup =
      notification.type === 'chat_message' &&
      notification.groupId === activeChatGroupId;

    if (!isChatForActiveGroup) {
      setToasts(prev => [...prev.slice(-3), entry]);

      timerMap.current[id] = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    }
  }, [activeChatGroupId]);

  useEffect(() => {
    socket.on('notification', addNotification);
    return () => socket.off('notification', addNotification);
  }, [addNotification]);

  const clearUnread = useCallback(() => setUnread(0), []);

  return (
    <NotifContext.Provider value={{
      toasts,
      history,
      unread,
      clearUnread,
      dismissToast,
      activeChatGroupId,
      setActiveChatGroupId,
    }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotif() {
  return useContext(NotifContext);
}
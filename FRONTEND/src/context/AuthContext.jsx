import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { groupsAPI } from '../api';


const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    return JSON.parse(sessionStorage.getItem('fs_user') || 'null');
  });

  const [token, setToken] = useState(() => {
    return sessionStorage.getItem('fs_token') || null;
  });

  const [groups, setGroups] = useState([]);

  const refreshGroups = useCallback(async () => {
    if (!token) return;
    try {
      const data = await groupsAPI.getAll();
      if (data.success) {
        setGroups(data.data);
      }
    } catch (err) {
      console.error('Failed to refresh groups:', err);
    }
  }, [token]);

  // Handle initial load and re-fetches
  useEffect(() => {
    if (token) {
      refreshGroups();
    }
  }, [token, refreshGroups]);


  function login(data) {
    // ✅ store correctly
    sessionStorage.setItem('fs_token', data.token);
    sessionStorage.setItem('fs_user', JSON.stringify(data.user || data));

    setToken(data.token);
    setUser(data.user || data);
  }

  function logout() {
    sessionStorage.removeItem('fs_token');
    sessionStorage.removeItem('fs_user');

    setToken(null);
    setUser(null);
    setGroups([]);
  }

  const contextValue = useMemo(() => ({
    user, token, groups, setGroups, refreshGroups, login, logout
  }), [user, token, groups, setGroups, refreshGroups]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
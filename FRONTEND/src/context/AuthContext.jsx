import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    return JSON.parse(sessionStorage.getItem('fs_user') || 'null');
  });

  const [token, setToken] = useState(() => {
    return sessionStorage.getItem('fs_token') || null;
  });

  const [groups, setGroups] = useState([]);

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

  return (
    <AuthContext.Provider value={{ user, token, groups, setGroups, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
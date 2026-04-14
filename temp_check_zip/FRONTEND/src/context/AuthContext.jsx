import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(() => JSON.parse(sessionStorage.getItem('fs_user') || 'null'));
  const [token, setToken]   = useState(() => sessionStorage.getItem('fs_token') || null);
  const [groups, setGroups] = useState([]);

  function login(data) {
    sessionStorage.setItem('fs_token', data.token);
    sessionStorage.setItem('fs_user', JSON.stringify(data));
    setToken(data.token);
    setUser(data);
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
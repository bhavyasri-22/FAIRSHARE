import { api } from './client';

export const authAPI = {
  register: (name, email, password) => api.postPublic('/auth/register', { name, email, password }),
  login:    (email, password)       => api.postPublic('/auth/login',    { email, password }),
};

export const groupsAPI = {
  create: (name, currency) => api.post('/groups',      { name, currency }),
  join:   (inviteCode)     => api.post('/groups/join', { inviteCode }),
  getAll: ()               => api.get('/groups/my'),
};

export const expensesAPI = {
  add:            (payload) => api.post('/expenses',                payload),
  getForGroup:    (groupId) => api.get(`/expenses/${groupId}`),
  getSettlements: (groupId) => api.get(`/expenses/${groupId}/settle`),
};

export const settlementsAPI = {
  record:     (payload) => api.post('/settlements',           payload),
  getHistory: (groupId) => api.get(`/settlements/${groupId}`),
};


export const analyticsAPI = {
  get: (period = '6m') => api.get(`/analytics?period=${period}`),
};
const BASE = 'http://localhost:4000/api';

function getToken() {
  return sessionStorage.getItem('fs_token');
}

async function request(method, path, body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers['Authorization'] = `Bearer ${getToken()}`;

  try {
    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    return await res.json();
  } catch {
    return { success: false, message: 'Network error — is the server running?' };
  }
}

export const api = {
  get:        (path)       => request('GET',  path),
  post:       (path, body) => request('POST', path, body),
  postPublic: (path, body) => request('POST', path, body, false),
  del:        (path, body) => request('DELETE', path, body),
};
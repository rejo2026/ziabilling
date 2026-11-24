// ============================================================
// API Helper — centralised fetch calls
// ============================================================

const BASE = 'http://localhost:4200/api';

export const api = {
  get: <T>(path: string): Promise<T> =>
    fetch(`${BASE}${path}`).then(r => r.json()),

  post: <T>(path: string, body: unknown): Promise<T> =>
    fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => r.json()),

  patch: <T>(path: string, body: unknown): Promise<T> =>
    fetch(`${BASE}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => r.json()),

  del: <T>(path: string): Promise<T> =>
    fetch(`${BASE}${path}`, { method: 'DELETE' }).then(r => r.json()),
};

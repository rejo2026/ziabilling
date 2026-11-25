// Keeps the signed-in session token in memory and attaches it to every call
// made to the local Zia-Billing API, so the server can check who is calling.
let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

export function installAuthFetch() {
  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (authToken && url.startsWith('http://localhost:4200/')) {
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${authToken}`);
      return original(input, { ...init, headers });
    }
    return original(input, init);
  };
}

// Sidebar tabs a signed-in user may open ('*' means all).
export function canOpenTab(tabs: string[] | '*' | undefined, tab: string) {
  if (!tabs) return false;
  return tabs === '*' || tabs.includes(tab);
}

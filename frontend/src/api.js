let unauthorizedHandler = null;

export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

export async function api(method, path, body, opts = {}) {
  const fetchOpts = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined) {
    fetchOpts.headers['Content-Type'] = 'application/json';
    fetchOpts.body = JSON.stringify(body);
  }
  const res = await fetch(path, fetchOpts);
  if (res.status === 401) {
    if (!opts.silent401 && unauthorizedHandler) unauthorizedHandler();
    return null;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

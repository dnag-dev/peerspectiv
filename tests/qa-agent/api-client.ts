/**
 * Lightweight fetch wrapper with cookie jar for backend-only scenarios.
 */
import { BASE_URL } from './config';

export class ApiClient {
  cookies: Map<string, string> = new Map();

  private cookieHeader(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  private absorb(res: Response) {
    // Node's fetch only exposes set-cookie via getSetCookie()
    const anyHeaders = res.headers as any;
    const setCookies: string[] = typeof anyHeaders.getSetCookie === 'function' ? anyHeaders.getSetCookie() : [];
    for (const sc of setCookies) {
      const [pair] = sc.split(';');
      const eq = pair.indexOf('=');
      if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  async request(method: string, path: string, body?: any, extraHeaders: Record<string, string> = {}): Promise<{ status: number; ok: boolean; json: any; text: string }> {
    const headers: Record<string, string> = { ...extraHeaders };
    if (body !== undefined) headers['content-type'] = 'application/json';
    const cookie = this.cookieHeader();
    if (cookie) headers['cookie'] = cookie;
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    this.absorb(res);
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, ok: res.ok, json, text };
  }

  get(p: string) { return this.request('GET', p); }
  post(p: string, body?: any) { return this.request('POST', p, body); }
  put(p: string, body?: any) { return this.request('PUT', p, body); }
  patch(p: string, body?: any) { return this.request('PATCH', p, body); }
  del(p: string) { return this.request('DELETE', p); }

  async loginAs(role: 'admin' | 'client' | 'reviewer') {
    return this.post('/api/demo/login', { role });
  }
  async logout() {
    return this.del('/api/demo/login');
  }
}

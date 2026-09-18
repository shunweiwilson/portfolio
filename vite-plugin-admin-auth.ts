import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import crypto from 'node:crypto';

/**
 * Dev-server counterpart of /api/auth, so the password gate can be exercised
 * locally exactly as it behaves in production.
 *
 * The gate is opt-in locally: set ADMIN_PASSWORD in .env.local to turn it on.
 * With no ADMIN_PASSWORD the local tool stays unlocked, which is safe because
 * the dev server is only reachable from your own machine.
 *
 * Token format and signing match api/_lib.js so the client has one code path.
 */

const SESSION_HOURS = 12;

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const safeEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

const sign = (payload: string, secret: string): string =>
  crypto.createHmac('sha256', `session:${secret}`).update(payload).digest('base64url');

const createSession = (secret: string): string => {
  const exp = String(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  return `${exp}.${sign(exp, secret)}`;
};

const verifySession = (value: string, secret: string): boolean => {
  const [exp, signature] = String(value).split('.');
  if (!exp || !signature) return false;
  if (!safeEqual(signature, sign(exp, secret))) return false;
  return Number(exp) > Date.now();
};

export const adminPassword = (): string => process.env.ADMIN_PASSWORD || '';

/** True when the request may write. Always true locally if no password is configured. */
export const devAuthOk = (req: IncomingMessage): boolean => {
  const expected = adminPassword();
  if (!expected) return true;
  const sessionToken = String(req.headers['x-admin-token'] ?? '');
  const password = String(req.headers['x-admin-password'] ?? '');
  if (sessionToken) return verifySession(sessionToken, expected);
  return Boolean(password) && safeEqual(password, expected);
};

export function adminAuth(): Plugin {
  return {
    name: 'admin-auth',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/auth', async (req, res) => {
        const expected = adminPassword();

        if (req.method === 'GET') {
          json(res, 200, {
            required: Boolean(expected),
            configured: Boolean(expected),
            valid: !expected || devAuthOk(req),
          });
          return;
        }

        if (req.method !== 'POST') {
          json(res, 405, { error: 'Method not allowed' });
          return;
        }

        if (!expected) {
          // No local password configured: hand back a token anyway so the client
          // behaves identically whether or not the gate is switched on.
          json(res, 200, { ok: true, token: '', expiresInHours: SESSION_HOURS });
          return;
        }

        try {
          const { password } = JSON.parse(await readBody(req)) as { password?: string };
          if (!password || !safeEqual(password, expected)) {
            await new Promise((resolve) => setTimeout(resolve, 600));
            json(res, 401, { error: 'Wrong password.' });
            return;
          }
          json(res, 200, {
            ok: true,
            token: createSession(expected),
            expiresInHours: SESSION_HOURS,
          });
        } catch {
          json(res, 400, { error: 'Bad request.' });
        }
      });
    },
  };
}

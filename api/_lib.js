/**
 * Shared helpers for the serverless admin endpoints.
 *
 * Files prefixed with "_" are not routed by Vercel, so this is a private module.
 *
 * Required environment variables (set in the Vercel project, never committed):
 *   GITHUB_TOKEN   - fine-grained token with Contents: Read and write on BOTH
 *                    shunweiwilson/portfolio and shunweiwilson/image-storage
 *   ADMIN_PASSWORD - password the #edit tool must send to perform any write
 */

import crypto from 'node:crypto';

const API = 'https://api.github.com';

export const OWNER = 'shunweiwilson';
export const CONTENT_REPO = 'portfolio';
export const IMAGE_REPO = 'image-storage';
export const BRANCH = 'main';
export const DATA_PATH = 'src/data/projects.json';

export const json = (res, status, body) => {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(body));
};

export const token = () => process.env.GITHUB_TOKEN || '';

export const ghHeaders = () => ({
  Authorization: `Bearer ${token()}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'portfolio-add-project-tool',
});

/** Constant-time string compare, so a wrong password cannot be timed out character by character. */
export const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    // Still compare something of equal length to keep the timing flat.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
};

const SESSION_HOURS = 12;

const sign = (payload, secret) =>
  crypto.createHmac('sha256', `session:${secret}`).update(payload).digest('base64url');

/**
 * Issues an opaque "<expiry>.<signature>" token. The signing key is derived from
 * the password, so rotating the password revokes every outstanding session.
 */
export const createSession = (secret) => {
  const exp = String(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  return `${exp}.${sign(exp, secret)}`;
};

export const verifySession = (value, secret) => {
  const [exp, signature] = String(value).split('.');
  if (!exp || !signature) return false;
  if (!safeEqual(signature, sign(exp, secret))) return false;
  return Number(exp) > Date.now();
};

export const SESSION_HOURS_VALUE = SESSION_HOURS;

/**
 * Gates every write. Fails closed: if ADMIN_PASSWORD is not configured, nothing
 * can be written, rather than leaving the endpoint open to the world.
 *
 * Accepts either a session token from /api/auth (normal path) or the raw
 * password header (useful for scripts and curl).
 */
export const checkAuth = (req, res) => {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) {
    json(res, 503, {
      error: 'ADMIN_PASSWORD is not set on the server, so editing is disabled.',
    });
    return false;
  }

  const sessionToken = req.headers['x-admin-token'] || '';
  const suppliedPassword = req.headers['x-admin-password'] || '';
  const ok = sessionToken
    ? verifySession(sessionToken, expected)
    : suppliedPassword && safeEqual(suppliedPassword, expected);

  if (!ok) {
    json(res, 401, { error: 'Not signed in, or the session expired.' });
    return false;
  }
  if (!token()) {
    json(res, 503, { error: 'GITHUB_TOKEN is not set on the server.' });
    return false;
  }
  return true;
};

export const readBody = async (req) => {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

/** Returns { content, sha } for a repo file, or null when it does not exist. */
export const getFile = async (repo, path) => {
  const res = await fetch(
    `${API}/repos/${OWNER}/${repo}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`,
    { headers: ghHeaders() },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read failed (${res.status})`);
  const data = await res.json();
  return { content: Buffer.from(data.content, 'base64').toString('utf8'), sha: data.sha };
};

/** Creates or updates a repo file. Pass sha when replacing existing content. */
export const putFile = async (repo, path, contentBase64, message, sha) => {
  const res = await fetch(`${API}/repos/${OWNER}/${repo}/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: contentBase64, branch: BRANCH, ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    const hint =
      res.status === 401 || res.status === 403
        ? ' (does GITHUB_TOKEN have Contents: Read and write on this repo?)'
        : '';
    throw new Error(`GitHub write failed ${res.status}: ${detail.message ?? ''}${hint}`);
  }
  return res.json();
};

import { SESSION_HOURS_VALUE, createSession, json, readBody, safeEqual, verifySession } from './_lib.js';

/**
 * Login endpoint for the #edit tool's password gate.
 *
 *   GET  /api/auth                       -> { required, configured, valid }
 *   POST /api/auth  { password }         -> { ok, token, expiresInHours }
 *
 * The password is only ever sent here, once. Everything afterwards uses the
 * returned session token, which is an HMAC signed server-side and expires.
 */

export default async function handler(req, res) {
  const expected = process.env.ADMIN_PASSWORD || '';

  if (req.method === 'GET') {
    const supplied = req.headers['x-admin-token'] || '';
    json(res, 200, {
      required: true,
      configured: Boolean(expected),
      valid: Boolean(expected && supplied && verifySession(supplied, expected)),
    });
    return;
  }

  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (!expected) {
    json(res, 503, {
      error: 'ADMIN_PASSWORD is not set on this deployment, so editing is disabled.',
    });
    return;
  }

  try {
    const { password } = await readBody(req);
    if (!password || !safeEqual(password, expected)) {
      // Slow down guessing a little; serverless has no shared rate-limit state.
      await new Promise((resolve) => setTimeout(resolve, 600));
      json(res, 401, { error: 'Wrong password.' });
      return;
    }

    json(res, 200, {
      ok: true,
      token: createSession(expected),
      expiresInHours: SESSION_HOURS_VALUE,
    });
  } catch {
    json(res, 400, { error: 'Bad request.' });
  }
}

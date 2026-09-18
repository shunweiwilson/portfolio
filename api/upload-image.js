import { BRANCH, IMAGE_REPO, OWNER, checkAuth, getFile, json, putFile, readBody } from './_lib.js';

/**
 * Live (production) counterpart of the dev image-upload plugin.
 *
 *   GET  /api/upload-image -> { configured, owner, repo, branch }
 *   POST /api/upload-image -> { filename, url }   (requires x-admin-password)
 */

const MAX_BYTES = 25 * 1024 * 1024;

/** Keeps GitHub paths predictable: ascii-ish, no spaces, original extension preserved. */
const sanitizeFilename = (name) => {
  const dot = name.lastIndexOf('.');
  const base = (dot > 0 ? name.slice(0, dot) : name) || 'image';
  const ext = (dot > 0 ? name.slice(dot + 1) : 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanBase = base
    .trim()
    .replace(/[^\w.-]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[_.-]+|[_.-]+$/g, '')
    .slice(0, 80);
  return `${cleanBase || 'image'}.${ext || 'jpg'}`;
};

/** Never clobber an existing image: My_hero.jpg -> My_hero-2.jpg -> ... */
const findFreeName = async (filename) => {
  if (!(await getFile(IMAGE_REPO, filename))) return filename;
  const dot = filename.lastIndexOf('.');
  const base = filename.slice(0, dot);
  const ext = filename.slice(dot);
  for (let i = 2; i < 50; i++) {
    const candidate = `${base}-${i}${ext}`;
    if (!(await getFile(IMAGE_REPO, candidate))) return candidate;
  }
  return `${base}-${Date.now()}${ext}`;
};

export const config = { api: { bodyParser: { sizeLimit: '30mb' } } };

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      json(res, 200, {
        configured: Boolean(process.env.GITHUB_TOKEN),
        owner: OWNER,
        repo: IMAGE_REPO,
        branch: BRANCH,
      });
      return;
    }

    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }

    if (!checkAuth(req, res)) return;

    const { filename, content } = await readBody(req);
    if (!filename || !content) {
      json(res, 400, { error: 'Missing filename or content.' });
      return;
    }

    const bytes = Math.floor((content.length * 3) / 4);
    if (bytes > MAX_BYTES) {
      json(res, 413, {
        error: `Image is ${(bytes / 1024 / 1024).toFixed(1)} MB — keep it under 25 MB.`,
      });
      return;
    }

    const name = await findFreeName(sanitizeFilename(filename));
    await putFile(IMAGE_REPO, name, content, `Add ${name} via portfolio add-project tool`);

    json(res, 200, {
      filename: name,
      path: name,
      url: `https://github.com/${OWNER}/${IMAGE_REPO}/blob/${BRANCH}/${name}?raw=true`,
    });
  } catch (err) {
    json(res, 500, { error: err instanceof Error ? err.message : 'Upload failed' });
  }
}

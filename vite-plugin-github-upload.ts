import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Dev-only endpoint that uploads an image to the GitHub image-storage repo and
 * returns the embeddable URL, so the #add authoring tool can accept a drag-and-drop
 * file instead of a manually uploaded/pasted link.
 *
 * The token is read server-side (never bundled into the client). Provide it via
 * .env.local (gitignored) as GITHUB_TOKEN=..., or paste it into the tool's UI,
 * in which case it is only sent to this local dev server.
 *
 * Endpoints:
 *   GET  /__api/github-upload  -> { configured, owner, repo, branch }
 *   POST /__api/github-upload  -> { url, path, filename }
 */

const OWNER = 'shunweiwilson';
const REPO = 'image-storage';
const BRANCH = 'main';
const API = 'https://api.github.com';
const MAX_BYTES = 25 * 1024 * 1024;

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BYTES * 1.5) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

/** Keeps GitHub paths predictable: ascii-ish, no spaces, original extension preserved. */
const sanitizeFilename = (name: string): string => {
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

const ghHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'portfolio-add-project-tool',
});

const exists = async (path: string, token: string): Promise<boolean> => {
  const res = await fetch(
    `${API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`,
    { headers: ghHeaders(token) },
  );
  return res.status === 200;
};

/** Never clobber an existing image: My_hero.jpg -> My_hero-2.jpg -> My_hero-3.jpg ... */
const findFreeName = async (filename: string, token: string): Promise<string> => {
  if (!(await exists(filename, token))) return filename;
  const dot = filename.lastIndexOf('.');
  const base = filename.slice(0, dot);
  const ext = filename.slice(dot);
  for (let i = 2; i < 50; i++) {
    const candidate = `${base}-${i}${ext}`;
    if (!(await exists(candidate, token))) return candidate;
  }
  return `${base}-${Date.now()}${ext}`;
};

export function githubImageUpload(): Plugin {
  return {
    name: 'github-image-upload',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/__api/github-upload', async (req, res) => {
        const envToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

        if (req.method === 'GET') {
          json(res, 200, {
            configured: Boolean(envToken),
            owner: OWNER,
            repo: REPO,
            branch: BRANCH,
          });
          return;
        }

        if (req.method !== 'POST') {
          json(res, 405, { error: 'Method not allowed' });
          return;
        }

        try {
          const payload = JSON.parse(await readBody(req)) as {
            filename?: string;
            content?: string;
            token?: string;
          };
          const token = envToken || payload.token || '';

          if (!token) {
            json(res, 401, {
              error:
                'No GitHub token. Add GITHUB_TOKEN=... to .env.local and restart the dev server, or paste a token in the tool.',
            });
            return;
          }
          if (!payload.content || !payload.filename) {
            json(res, 400, { error: 'Missing filename or content.' });
            return;
          }

          const bytes = Math.floor((payload.content.length * 3) / 4);
          if (bytes > MAX_BYTES) {
            json(res, 413, {
              error: `Image is ${(bytes / 1024 / 1024).toFixed(1)} MB — keep it under 25 MB.`,
            });
            return;
          }

          const filename = await findFreeName(sanitizeFilename(payload.filename), token);

          const upload = await fetch(
            `${API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(filename)}`,
            {
              method: 'PUT',
              headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: `Add ${filename} via portfolio add-project tool`,
                content: payload.content,
                branch: BRANCH,
              }),
            },
          );

          if (!upload.ok) {
            const detail = (await upload.json().catch(() => ({}))) as { message?: string };
            const hint =
              upload.status === 401 || upload.status === 403
                ? ' (check the token has Contents: Read and write on the image-storage repo)'
                : '';
            json(res, upload.status, {
              error: `GitHub responded ${upload.status}: ${detail.message ?? 'upload failed'}${hint}`,
            });
            return;
          }

          json(res, 200, {
            filename,
            path: filename,
            // Matches the URL style already used throughout the explores data.
            url: `https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/${filename}?raw=true`,
          });
        } catch (err) {
          json(res, 500, { error: err instanceof Error ? err.message : 'Upload failed' });
        }
      });
    },
  };
}

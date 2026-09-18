import {
  BRANCH,
  CONTENT_REPO,
  DATA_PATH,
  checkAuth,
  getFile,
  json,
  putFile,
  readBody,
  token,
} from './_lib.js';

/**
 * Live (production) counterpart of the Vite dev plugin: reads and writes the
 * project list on the deployed site.
 *
 *   GET  /api/projects -> { items, live: true }
 *   PUT  /api/projects -> { ok, count, commit }   (requires x-admin-password)
 *
 * A write commits src/data/projects.json to the repo, which triggers a Vercel
 * redeploy, so the change appears on the site about a minute later.
 */

const asString = (value) => (typeof value === 'string' ? value.trim() : '');
const asStringArray = (value) => (Array.isArray(value) ? value.map(asString).filter(Boolean) : []);
const asRecord = (value) => (value && typeof value === 'object' ? value : {});

/**
 * Project links end up as an href on the public site, so only http(s) is kept.
 * Anything else (javascript:, data:, a bare word) is dropped to an empty string.
 */
const asUrl = (value) => {
  const url = asString(value);
  return /^https?:\/\//i.test(url) ? url : '';
};

/** Mirrors the dev plugin's sanitizer so both paths write identical shapes. */
const sanitizeItem = (raw, index) => {
  const item = asRecord(raw);
  const featured = asRecord(item.featured);
  const explore = asRecord(item.explore);
  const featuredTitle = asString(featured.title);
  const exploreSubtitle = asString(explore.subtitle);
  if (!featuredTitle && !exploreSubtitle) return null;

  return {
    id: asString(item.id) || `project-${index + 1}`,
    hidden: item.hidden === true,
    url: asUrl(item.url),
    chips: asStringArray(item.chips),
    img: asString(item.img),
    featured: { title: featuredTitle, desc: asString(featured.desc) },
    explore: {
      title: asString(explore.title),
      subtitle: exploreSubtitle,
      weight: explore.weight === 'font-semibold' ? 'font-semibold' : 'font-bold',
      lines: asStringArray(explore.lines),
    },
  };
};

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Without a token we cannot read the repo; the client falls back to the
      // bundled copy, which is correct for a freshly deployed site anyway.
      if (!token()) {
        json(res, 200, { items: null, live: false, reason: 'GITHUB_TOKEN not set' });
        return;
      }
      const file = await getFile(CONTENT_REPO, DATA_PATH);
      json(res, 200, { items: file ? JSON.parse(file.content) : null, live: true });
      return;
    }

    if (req.method === 'PUT') {
      if (!checkAuth(req, res)) return;

      const parsed = await readBody(req);
      if (!Array.isArray(parsed)) {
        json(res, 400, { error: 'Expected an array of projects.' });
        return;
      }

      const items = parsed.map(sanitizeItem).filter(Boolean);
      if (items.length !== parsed.length) {
        json(res, 400, { error: 'One or more projects were missing a name.' });
        return;
      }
      if (new Set(items.map((item) => item.id)).size !== items.length) {
        json(res, 400, { error: 'Duplicate project ids.' });
        return;
      }

      const current = await getFile(CONTENT_REPO, DATA_PATH);
      const content = `${JSON.stringify(items, null, 2)}\n`;
      const result = await putFile(
        CONTENT_REPO,
        DATA_PATH,
        Buffer.from(content, 'utf8').toString('base64'),
        `Update projects (${items.length} items) via #edit tool`,
        current?.sha,
      );

      json(res, 200, {
        ok: true,
        count: items.length,
        commit: result.commit?.sha?.slice(0, 7) ?? '',
        branch: BRANCH,
      });
      return;
    }

    json(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    json(res, 500, { error: err instanceof Error ? err.message : 'Request failed' });
  }
}

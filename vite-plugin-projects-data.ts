import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { adminPassword, devAuthOk } from './vite-plugin-admin-auth';

/**
 * Dev-only endpoint that lets the #add tool read and rewrite the projects data file
 * (src/data/projects.json). Writing the file triggers Vite HMR, so the live site
 * updates as soon as a project is added, edited, reordered or deleted.
 *
 * Position in the array decides the section: the first FEATURED_COUNT entries render
 * in "Featured projects", the rest in "Explore beyond".
 *
 *   GET /api/projects -> ProjectItem[]
 *   PUT /api/projects -> { ok: true, count }   (body: ProjectItem[])
 */

const DATA_FILE = 'src/data/projects.json';

interface ProjectItem {
  id: string;
  hidden: boolean;
  chips: string[];
  img: string;
  featured: { title: string; desc: string };
  explore: { title: string; subtitle: string; weight: string; lines: string[] };
}

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

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(asString).filter(Boolean) : [];

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

/** Normalizes untrusted input so a malformed request can never corrupt the data file. */
const sanitizeItem = (raw: unknown, index: number): ProjectItem | null => {
  const item = asRecord(raw);
  const featured = asRecord(item.featured);
  const explore = asRecord(item.explore);

  const featuredTitle = asString(featured.title);
  const exploreSubtitle = asString(explore.subtitle);
  // A card with no name in either section is almost certainly a bug, not an edit.
  if (!featuredTitle && !exploreSubtitle) return null;

  return {
    id: asString(item.id) || `project-${index + 1}`,
    hidden: item.hidden === true,
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

export function projectsData(): Plugin {
  return {
    name: 'projects-data',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      const file = path.resolve(server.config.root, DATA_FILE);

      server.middlewares.use('/api/projects', async (req, res) => {
        try {
          if (req.method === 'GET') {
            json(res, 200, {
              items: JSON.parse(await readFile(file, 'utf8')),
              live: false,
              authRequired: Boolean(adminPassword()),
            });
            return;
          }

          if (req.method === 'PUT') {
            if (!devAuthOk(req)) {
              json(res, 401, { error: 'Not signed in, or the session expired.' });
              return;
            }

            const parsed = JSON.parse(await readBody(req)) as unknown;
            if (!Array.isArray(parsed)) {
              json(res, 400, { error: 'Expected an array of projects.' });
              return;
            }

            const items = parsed
              .map(sanitizeItem)
              .filter((item): item is ProjectItem => item !== null);
            if (items.length !== parsed.length) {
              json(res, 400, { error: 'One or more projects were missing a name.' });
              return;
            }

            const ids = new Set(items.map((item) => item.id));
            if (ids.size !== items.length) {
              json(res, 400, { error: 'Duplicate project ids.' });
              return;
            }

            await writeFile(file, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
            json(res, 200, { ok: true, count: items.length });
            return;
          }

          json(res, 405, { error: 'Method not allowed' });
        } catch (err) {
          json(res, 500, { error: err instanceof Error ? err.message : 'Request failed' });
        }
      });
    },
  };
}

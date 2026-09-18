import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import initialProjects from './data/projects.json';

/**
 * Hidden authoring tool for the portfolio's project sections.
 *
 * Visit the site with the #add hash (e.g. http://localhost:5173/#add) to open it.
 * Add a project (dropped images upload straight to the GitHub image-storage repo),
 * or use the list underneath to reorder by dragging, edit and delete. Everything is
 * written to src/data/projects.json, which both sections of the site render from.
 *
 * Position decides the section: the first FEATURED_COUNT cards are "Featured
 * projects", the rest are "Explore beyond". Each card stores wording for both, so
 * dragging one across the divider never rewrites its text.
 *
 * Editing requires the Vite dev server: the endpoints below are dev-only, so on a
 * production build this page degrades to a read-only view.
 *
 * This page is intentionally not linked from anywhere in the UI.
 */

const DRAFT_KEY = 'portfolio-project-draft-v2';
const TOKEN_KEY = 'github-image-token-v1';
const PASSWORD_KEY = 'portfolio-admin-password-v1';
const UPLOAD_ENDPOINT = '/api/upload-image';
const DATA_ENDPOINT = '/api/projects';
const FEATURED_COUNT = 4;

export interface ProjectItem {
  id: string;
  /** Hidden cards stay in the list here but are not rendered on the site. */
  hidden?: boolean;
  chips: string[];
  img: string;
  featured: { title: string; desc: string };
  explore: { title: string; subtitle: string; weight: string; lines: string[] };
}

interface UploadTarget {
  configured: boolean;
  owner: string;
  repo: string;
  branch: string;
}

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; filename: string }
  | { status: 'done'; filename: string }
  | { status: 'error'; message: string };

type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved'; commit?: string }
  | { status: 'readonly' }
  | { status: 'error'; message: string };

interface Draft {
  id: string;
  chips: string;
  img: string;
  featuredTitle: string;
  featuredDesc: string;
  exploreTitle: string;
  exploreSubtitle: string;
  exploreWeight: 'font-bold' | 'font-semibold';
  exploreLine1: string;
  exploreLine2: string;
}

const EMPTY_DRAFT: Draft = {
  id: '',
  chips: '',
  img: '',
  featuredTitle: '',
  featuredDesc: '',
  exploreTitle: '',
  exploreSubtitle: '',
  exploreWeight: 'font-bold',
  exploreLine1: '',
  exploreLine2: '',
};

/** Turns a github.com/.../blob/... link into a directly embeddable image URL. */
const normalizeImageUrl = (raw: string): string => {
  const url = raw.trim();
  if (!url) return '';
  if (url.includes('github.com') && url.includes('/blob/') && !url.includes('raw=true')) {
    return `${url}${url.includes('?') ? '&' : '?'}raw=true`;
  }
  return url;
};

const parseChips = (raw: string): string[] =>
  raw
    .split(',')
    .map((chip) => chip.trim())
    .filter(Boolean);

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

const draftToItem = (draft: Draft): ProjectItem => {
  const exploreLines = [draft.exploreLine1.trim(), draft.exploreLine2.trim()].filter(Boolean);
  return {
    id: draft.id,
    chips: parseChips(draft.chips),
    img: normalizeImageUrl(draft.img),
    featured: {
      // Fall back to the explore wording so a promoted card is never blank.
      title:
        draft.featuredTitle.trim() ||
        [draft.exploreSubtitle.trim(), exploreLines[0] ?? ''].filter(Boolean).join(' '),
      desc: draft.featuredDesc.trim() || draft.exploreTitle.trim(),
    },
    explore: {
      title: draft.exploreTitle.trim(),
      subtitle: draft.exploreSubtitle.trim(),
      weight: draft.exploreWeight,
      lines: exploreLines,
    },
  };
};

const itemToDraft = (item: ProjectItem): Draft => ({
  id: item.id,
  chips: item.chips.join(', '),
  img: item.img,
  featuredTitle: item.featured.title,
  featuredDesc: item.featured.desc,
  exploreTitle: item.explore.title,
  exploreSubtitle: item.explore.subtitle,
  exploreWeight: item.explore.weight === 'font-semibold' ? 'font-semibold' : 'font-bold',
  exploreLine1: item.explore.lines[0] ?? '',
  exploreLine2: item.explore.lines.slice(1).join(' '),
});

const buildHandoff = (draft: Draft): string => {
  const item = draftToItem(draft);
  return [
    `chips: ${item.chips.join(', ')}`,
    `featured title: ${item.featured.title}`,
    `featured desc: ${item.featured.desc}`,
    `explore headline: ${item.explore.title}`,
    `explore subtitle: ${item.explore.subtitle}`,
    `explore lines: ${item.explore.lines.join(' / ')}`,
    `image: ${item.img}`,
  ].join('\n');
};

/** Reads a File into the bare base64 payload the GitHub contents API expects. */
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block mb-6">
      <span className="block text-[11px] uppercase tracking-wide font-medium text-[#111111] mb-2">
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs text-[#888888] mt-2 leading-[1.4em]">{hint}</span>}
    </label>
  );
}

function GroupHeading({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="mb-4 mt-2">
      <h3 className="text-[11px] uppercase tracking-wide font-semibold border-b border-[#111111] pb-2">
        {children}
      </h3>
      {note && <p className="text-xs text-[#888888] mt-2 leading-[1.4em]">{note}</p>}
    </div>
  );
}

const inputClass =
  'w-full border border-[#111111] rounded-[12px] bg-white px-4 py-3 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-all placeholder:text-[#bbbbbb]';

const pillClass =
  'h-10 px-5 inline-flex items-center gap-2 border border-[#111111] rounded-full text-xs font-medium uppercase tracking-wide hover:bg-[#111111] hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none';

const iconBtnClass =
  'w-8 h-8 inline-flex items-center justify-center border border-[#dddddd] rounded-full hover:border-[#111111] hover:bg-[#111111] hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none';

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API can be blocked (e.g. non-secure context); fall back to a manual select.
      const area = document.createElement('textarea');
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button type="button" onClick={copy} className={pillClass}>
      {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
      {copied ? 'Copied' : label}
    </button>
  );
}

export default function AddProject() {
  const [items, setItems] = useState<ProjectItem[]>(initialProjects as ProjectItem[]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [save, setSave] = useState<SaveState>({ status: 'idle' });
  const [draft, setDraft] = useState<Draft>(() => {
    if (typeof window === 'undefined') return EMPTY_DRAFT;
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      return saved ? { ...EMPTY_DRAFT, ...JSON.parse(saved) } : EMPTY_DRAFT;
    } catch {
      return EMPTY_DRAFT;
    }
  });

  // The site renders only visible cards, so section/layout maths must use the rank
  // among visible cards rather than the raw list index.
  const visibleRankOf = (index: number) =>
    items.slice(0, index).filter((item) => !item.hidden).length;
  const visibleCount = items.filter((item) => !item.hidden).length;
  const editingHidden = editingIndex !== null && Boolean(items[editingIndex]?.hidden);
  const position = editingIndex === null ? visibleCount : visibleRankOf(editingIndex);
  const isFeaturedSlot = position < FEATURED_COUNT && !editingHidden;
  const [previewMode, setPreviewMode] = useState<'featured' | 'explore'>(
    isFeaturedSlot ? 'featured' : 'explore',
  );
  const [variant, setVariant] = useState(Math.max(position - FEATURED_COUNT, 0) % 3);
  const topRef = useRef<HTMLDivElement>(null);

  // Password for the live serverless endpoints. Unused in dev (localhost writes
  // are unauthenticated), so the field only appears when the server asks for it.
  const [password, setPassword] = useState(() => {
    try {
      return window.localStorage.getItem(PASSWORD_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [needsPassword, setNeedsPassword] = useState(false);
  // True when saves go through the deployed API (a commit + redeploy) rather
  // than straight to a local file.
  const [isLive, setIsLive] = useState(false);

  // Pull the current data; falls back to the copy bundled at build time.
  useEffect(() => {
    fetch(DATA_ENDPOINT)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('unavailable'))))
      .then((data: { items: ProjectItem[] | null; live?: boolean }) => {
        if (data.items) setItems(data.items);
        setIsLive(Boolean(data.live));
      })
      .catch(() => setSave({ status: 'readonly' }));
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage may be unavailable (private mode); drafts just won't persist.
    }
  }, [draft]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PASSWORD_KEY, password);
    } catch {
      // Ignore storage failures; the password just won't be remembered.
    }
  }, [password]);

  const set = (key: keyof Draft) => (value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const authHeaders = () =>
    password ? { 'Content-Type': 'application/json', 'x-admin-password': password } : { 'Content-Type': 'application/json' };

  // --- Persistence ---
  const persist = async (next: ProjectItem[]) => {
    const previous = items;
    setItems(next);
    setSave({ status: 'saving' });
    try {
      const res = await fetch(DATA_ENDPOINT, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setItems(previous); // Roll back so the list never lies about what is stored.
        if (res.status === 401) setNeedsPassword(true);
        setSave({ status: 'error', message: data.error ?? `Save failed (${res.status}).` });
        return false;
      }
      const data = (await res.json().catch(() => ({}))) as { commit?: string };
      setNeedsPassword(false);
      setSave({ status: 'saved', commit: data.commit });
      setTimeout(() => setSave((s) => (s.status === 'saved' ? { status: 'idle' } : s)), 4000);
      return true;
    } catch {
      setItems(previous);
      setSave({
        status: 'error',
        message: 'Could not reach the save endpoint. Run `npm run dev` locally, or check the deployment.',
      });
      return false;
    }
  };

  // --- GitHub image upload ---
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const [target, setTarget] = useState<UploadTarget | null>(null);
  const [token, setToken] = useState(() => {
    try {
      return window.localStorage.getItem(TOKEN_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(UPLOAD_ENDPOINT)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setTarget(data as UploadTarget);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Ignore storage failures; the token just won't be remembered.
    }
  }, [token]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const clearLocalPreview = () =>
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUpload({ status: 'error', message: `"${file.name}" is not an image file.` });
      return;
    }

    // Show the picked image immediately; the GitHub URL swaps in when the upload lands.
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setUpload({ status: 'uploading', filename: file.name });

    try {
      const content = await fileToBase64(file);
      const res = await fetch(UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ filename: file.name, content, token: token || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        filename?: string;
        error?: string;
      };

      if (!res.ok || !data.url) {
        if (res.status === 401) setNeedsPassword(true);
        setUpload({ status: 'error', message: data.error ?? `Upload failed (${res.status}).` });
        return;
      }

      set('img')(data.url);
      setUpload({ status: 'done', filename: data.filename ?? file.name });
    } catch {
      setUpload({
        status: 'error',
        message:
          'Could not reach the upload endpoint. Run `npm run dev` locally, or check the deployment.',
      });
    }
  };

  // --- Form actions ---
  const resetForm = () => {
    setDraft(EMPTY_DRAFT);
    setEditingIndex(null);
    setUpload({ status: 'idle' });
    clearLocalPreview();
  };

  const submit = async () => {
    const item = draftToItem(draft);
    if (!item.id) {
      // Ids key the rows and drag operations, so they must be unique.
      const base = slugify(item.explore.subtitle || item.featured.title) || 'project';
      let candidate = base;
      let n = 2;
      const taken = new Set(items.map((i) => i.id));
      while (taken.has(candidate)) candidate = `${base}-${n++}`;
      item.id = candidate;
    }
    const next =
      editingIndex === null
        ? [...items, item]
        : items.map((existing, i) => (i === editingIndex ? item : existing));
    if (await persist(next)) resetForm();
  };

  const startEdit = (index: number) => {
    const rank = visibleRankOf(index);
    const featuredSlot = rank < FEATURED_COUNT && !items[index].hidden;
    setDraft(itemToDraft(items[index]));
    setEditingIndex(index);
    setPreviewMode(featuredSlot ? 'featured' : 'explore');
    setVariant(Math.max(rank - FEATURED_COUNT, 0) % 3);
    setUpload({ status: 'idle' });
    clearLocalPreview();
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void persist(next);
    if (editingIndex === from) setEditingIndex(to);
  };

  const remove = (index: number) => {
    const item = items[index];
    const name = item.explore.subtitle || item.featured.title;
    if (!window.confirm(`Delete "${name}"? This rewrites projects.json.`)) return;
    void persist(items.filter((_, i) => i !== index));
    if (editingIndex === index) resetForm();
  };

  /** Hiding keeps the card (and its position) but drops it from the live site. */
  const toggleHidden = (index: number) => {
    void persist(
      items.map((item, i) => (i === index ? { ...item, hidden: !item.hidden } : item)),
    );
  };

  // --- Drag and drop reordering ---
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const endDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDrop = (index: number) => {
    if (dragIndex !== null) move(dragIndex, index);
    endDrag();
  };

  const chips = parseChips(draft.chips);
  const img = normalizeImageUrl(draft.img);
  const handoff = useMemo(() => buildHandoff(draft), [draft]);
  const isComplete = Boolean(
    draft.exploreTitle && draft.exploreSubtitle && img && chips.length,
  );
  const isReadOnly = save.status === 'readonly';
  const previewSrc = img || localPreview || '';

  // --- Explore preview blocks: mirror the markup used by the Explore section ---
  const exploreNumber = Math.max(position - FEATURED_COUNT, 0) + 1;

  const TagsBlock = (
    <div className="flex flex-wrap items-center gap-1 mb-4">
      <span className="shrink-0 w-6 h-6 flex items-center justify-center text-[10px] sm:text-[11px] font-medium bg-[#111111] text-white rounded-full">
        {String(exploreNumber).padStart(2, '0')}
      </span>
      {chips.map((chip, i) => (
        <span
          key={i}
          className="px-2.5 py-[0.1rem] text-[9px] sm:text-[10px] uppercase font-medium border border-[#111111] text-[#111111] rounded-full shrink-0 tracking-wide"
        >
          {chip}
        </span>
      ))}
    </div>
  );

  const TitleBlock = (
    <h3 className="text-[clamp(1.3rem,2vw,1.6rem)] font-normal tracking-[-0.03em] leading-[1.2em] mb-3">
      <span className="inline bg-gradient-to-r from-yellow-300 to-yellow-300 bg-no-repeat bg-[position:0_95%] bg-[length:0%_30%] group-hover:bg-[length:100%_30%] transition-[background-size] duration-500 ease-out">
        {draft.exploreTitle || 'Your headline sentence goes here'}
      </span>
    </h3>
  );

  const DescBlock = (
    <p className="text-sm md:text-base text-[#333333] leading-[1.3em] mb-4">
      <span className={draft.exploreWeight}>{draft.exploreSubtitle || 'Project name'}</span>
      <br />
      {draft.exploreLine1 || 'Descriptor line'}
      {draft.exploreLine2 && (
        <>
          <br />
          {draft.exploreLine2}
        </>
      )}
    </p>
  );

  const ImageBlock = (
    <div className="block w-full overflow-hidden mb-4 rounded-[16px] border border-[#111111] bg-[#f2f2f2]">
      {previewSrc ? (
        <img
          src={previewSrc}
          className="w-full h-auto object-cover transform group-hover:scale-[1.03] transition-transform duration-700 ease-out"
          alt={draft.exploreTitle}
        />
      ) : (
        <div className="w-full aspect-[4/3] flex items-center justify-center text-xs text-[#888888]">
          Image preview
        </div>
      )}
    </div>
  );

  const exploreOrder =
    variant === 0
      ? [TagsBlock, TitleBlock, DescBlock, ImageBlock]
      : variant === 1
        ? [ImageBlock, TagsBlock, TitleBlock, DescBlock]
        : [TagsBlock, TitleBlock, ImageBlock, DescBlock];

  // --- Featured preview: mirrors the Projects grid card ---
  const FeaturedPreview = (
    <div className="group flex flex-col">
      <div className="block overflow-hidden w-full aspect-[16/10] mb-6 rounded-[16px] border border-[#111111] bg-[#f2f2f2]">
        {previewSrc ? (
          <img src={previewSrc} alt={draft.featuredTitle} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-[#888888]">
            Image preview
          </div>
        )}
      </div>
      <h3 className="text-[clamp(1.5rem,3vw,2.2rem)] font-normal tracking-[-0.03em] leading-[1.2em]">
        {draft.featuredTitle ||
          [draft.exploreSubtitle, draft.exploreLine1].filter(Boolean).join(' ') ||
          'Project name'}
      </h3>
      <p className="text-base md:text-lg text-[#111111] leading-[1.3em] mt-4 mb-2">
        {draft.featuredDesc || draft.exploreTitle || 'Tagline sentence'}
      </p>
      <div className="flex flex-wrap items-center gap-1 mt-4">
        <span className="shrink-0 w-6 h-6 flex items-center justify-center text-[10px] font-medium bg-[#111111] text-white rounded-full">
          {String(Math.min(position, FEATURED_COUNT - 1) + 1).padStart(2, '0')}
        </span>
        {chips.map((chip, i) => (
          <span
            key={i}
            className="px-2.5 py-[0.1rem] text-[9px] uppercase font-medium border border-[#111111] text-[#111111] rounded-full shrink-0 tracking-wide"
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );

  const saveLabel = {
    idle: '',
    saving: isLive ? 'Committing to GitHub…' : 'Saving…',
    saved: isLive
      ? `Committed${save.status === 'saved' && save.commit ? ` (${save.commit})` : ''} — Vercel is redeploying, live in ~1 min`
      : 'Saved to projects.json',
    readonly: 'Read-only — start `npm run dev`, or set ADMIN_PASSWORD on the deployment',
    error: '',
  }[save.status];

  return (
    <div className="min-h-screen bg-white text-[#111111] font-['Helvetica_Neue',-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif] antialiased">
      <div className="max-w-[1400px] mx-auto px-6 py-12">
        <div ref={topRef} className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-[clamp(2rem,4vw,3rem)] font-normal tracking-[-0.03em] leading-[1.2em]">
              {editingIndex === null
                ? 'Add a project'
                : `Editing ${isFeaturedSlot ? 'featured' : 'explore'} card #${String(position + 1).padStart(2, '0')}`}
            </h1>
            <p className="text-sm text-[#666666] mt-2">
              {editingIndex === null
                ? `New cards join “Explore beyond” at the end — drag it above the divider to feature it.`
                : editingHidden
                  ? 'This card is hidden — it is not rendered anywhere on the site.'
                  : isFeaturedSlot
                    ? 'This card is in the featured grid (top 4).'
                    : 'This card is in the Explore beyond masonry.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {editingIndex !== null && (
              <button type="button" onClick={resetForm} className={pillClass}>
                <X size={14} strokeWidth={2} />
                Cancel edit
              </button>
            )}
            <button type="button" onClick={resetForm} className={pillClass}>
              <Trash2 size={14} strokeWidth={2} />
              Clear
            </button>
            <a href="#more" className={pillClass}>
              <ArrowLeft size={14} strokeWidth={2} />
              Back to site
            </a>
          </div>
        </div>

        {/* Save status */}
        <div className="mb-8 h-5 text-xs">
          {save.status === 'saving' && (
            <span className="inline-flex items-center gap-2 text-[#666666]">
              <Loader2 size={13} className="animate-spin" /> {saveLabel}
            </span>
          )}
          {save.status === 'saved' && (
            <span className="inline-flex items-center gap-2 text-green-700">
              <Check size={13} strokeWidth={2} /> {saveLabel}
            </span>
          )}
          {save.status === 'readonly' && (
            <span className="inline-flex items-center gap-2 text-[#b45309]">
              <AlertCircle size={13} strokeWidth={2} /> {saveLabel}
            </span>
          )}
          {save.status === 'error' && (
            <span className="inline-flex items-center gap-2 text-red-700">
              <AlertCircle size={13} strokeWidth={2} /> {save.message}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* --- Form --- */}
          <div className="lg:col-span-5">
            <GroupHeading note="Shown in both sections.">Shared</GroupHeading>

            <Field label="Chips" hint="Comma separated, e.g. UX Design, Research, AI">
              <input
                className={inputClass}
                value={draft.chips}
                onChange={(e) => set('chips')(e.target.value)}
                placeholder="UX Design, Research, AI"
              />
            </Field>

            <Field
              label="Image"
              hint={
                target
                  ? `Uploads straight to github.com/${target.owner}/${target.repo} and fills in the link.`
                  : 'Upload endpoint unavailable (dev server only) — paste a URL below instead.'
              }
            >
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void uploadFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-[12px] border border-dashed p-5 text-center transition-colors ${
                  isDragging ? 'border-[#111111] bg-yellow-50' : 'border-[#cccccc] hover:bg-[#fafafa]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadFile(file);
                    e.target.value = '';
                  }}
                />
                {previewSrc ? (
                  <img
                    src={previewSrc}
                    alt="Selected"
                    className="max-h-40 w-auto mx-auto mb-3 rounded-[8px] border border-[#eeeeee]"
                  />
                ) : (
                  <UploadCloud size={22} strokeWidth={1.5} className="mx-auto mb-2 text-[#888888]" />
                )}
                <p className="text-xs text-[#666666]">
                  {upload.status === 'uploading' ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={13} className="animate-spin" />
                      Uploading {upload.filename}…
                    </span>
                  ) : (
                    <>
                      Drop an image here or <span className="underline">browse</span>
                    </>
                  )}
                </p>
              </div>
            </Field>

            {upload.status === 'done' && (
              <p className="-mt-4 mb-4 text-xs text-green-700 inline-flex items-center gap-2 break-all">
                <Check size={13} strokeWidth={2} />
                Uploaded as <span className="font-mono">{upload.filename}</span>
              </p>
            )}
            {upload.status === 'error' && (
              <p className="-mt-4 mb-4 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle size={13} strokeWidth={2} className="mt-[2px] shrink-0" />
                {upload.message}
              </p>
            )}

            {target && !target.configured && (
              <Field
                label="GitHub token"
                hint="Fine-grained token with Contents: Read and write on image-storage. Stored in this browser and only sent to your local dev server. Put GITHUB_TOKEN in .env.local to skip this field."
              >
                <input
                  type="password"
                  className={inputClass}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="github_pat_…"
                />
              </Field>
            )}

            <Field label="Image URL" hint="Filled in automatically after upload — or paste a link yourself.">
              <input
                className={inputClass}
                value={draft.img}
                onChange={(e) => set('img')(e.target.value)}
                placeholder="https://github.com/shunweiwilson/image-storage/blob/main/My_hero.jpg"
              />
            </Field>

            <GroupHeading note="Used while the card sits in the Explore beyond masonry.">
              Explore wording
            </GroupHeading>

            <Field label="Headline" hint="The big sentence on the explore card.">
              <textarea
                className={`${inputClass} min-h-[92px] resize-y`}
                value={draft.exploreTitle}
                onChange={(e) => set('exploreTitle')(e.target.value)}
                placeholder="Empowering older adults to navigate the digital information bubble"
              />
            </Field>

            <Field label="Project name (bold)" hint="Usually the project or client name.">
              <input
                className={inputClass}
                value={draft.exploreSubtitle}
                onChange={(e) => set('exploreSubtitle')(e.target.value)}
                placeholder="Fye"
              />
            </Field>

            <Field label="Descriptor" hint="The short line under the bold name.">
              <input
                className={inputClass}
                value={draft.exploreLine1}
                onChange={(e) => set('exploreLine1')(e.target.value)}
                placeholder="Fact Check AI-Agent"
              />
            </Field>

            <Field label="Extra line (optional)" hint="A third line, like the Lumi and Network Planner cards.">
              <input
                className={inputClass}
                value={draft.exploreLine2}
                onChange={(e) => set('exploreLine2')(e.target.value)}
                placeholder="Baby Monitor & AI Sleep Coaching"
              />
            </Field>

            <Field label="Name weight">
              <div className="flex gap-2">
                {(['font-bold', 'font-semibold'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => set('exploreWeight')(w)}
                    className={`h-10 px-5 rounded-full border border-[#111111] text-xs font-medium uppercase tracking-wide transition-colors ${
                      draft.exploreWeight === w ? 'bg-[#111111] text-white' : 'hover:bg-[#f2f2f2]'
                    }`}
                  >
                    {w === 'font-bold' ? 'Bold' : 'Semibold'}
                  </button>
                ))}
              </div>
            </Field>

            <GroupHeading note="Used while the card sits in the featured grid. Left blank, these fall back to the explore wording.">
              Featured wording
            </GroupHeading>

            <Field label="Featured title" hint="The big text on the featured card.">
              <input
                className={inputClass}
                value={draft.featuredTitle}
                onChange={(e) => set('featuredTitle')(e.target.value)}
                placeholder="Verily Retinal Camera"
              />
            </Field>

            <Field label="Featured tagline" hint="The sentence under the featured title.">
              <textarea
                className={`${inputClass} min-h-[72px] resize-y`}
                value={draft.featuredDesc}
                onChange={(e) => set('featuredDesc')(e.target.value)}
                placeholder="Prevent blindness by re-imagining retinal screening services"
              />
            </Field>
          </div>

          {/* --- Preview --- */}
          <div className="lg:col-span-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] uppercase tracking-wide font-medium">Live preview</h2>
              <div className="flex gap-1">
                {(['featured', 'explore'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPreviewMode(mode)}
                    className={`h-7 px-3 rounded-full border border-[#111111] text-[10px] uppercase tracking-wide font-medium transition-colors ${
                      previewMode === mode ? 'bg-[#111111] text-white' : 'hover:bg-[#f2f2f2]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-dashed border-[#cccccc] rounded-[16px] p-5">
              {previewMode === 'featured' ? (
                FeaturedPreview
              ) : (
                <div className="group">
                  {exploreOrder.map((block, i) => (
                    <React.Fragment key={i}>{block}</React.Fragment>
                  ))}
                </div>
              )}
            </div>

            {previewMode === 'explore' && (
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-[#888888] leading-[1.4em]">
                  Explore layout follows position ({Math.max(position - FEATURED_COUNT, 0)} % 3 ={' '}
                  {Math.max(position - FEATURED_COUNT, 0) % 3}).
                </p>
                <div className="flex gap-1">
                  {[0, 1, 2].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVariant(v)}
                      title={`Layout variant ${v}`}
                      className={`w-6 h-6 rounded-full border border-[#111111] text-[10px] font-medium transition-colors ${
                        variant === v ? 'bg-[#111111] text-white' : 'hover:bg-[#f2f2f2]'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* --- Actions --- */}
          <div className="lg:col-span-3">
            <h2 className="text-[11px] uppercase tracking-wide font-medium mb-4">Save</h2>

            {(isLive || needsPassword) && (
              <Field
                label="Admin password"
                hint="Required to write from the deployed site. Checked on the server; stored only in this browser."
              >
                <input
                  type="password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
            )}
            {!isComplete && (
              <p className="text-xs text-[#b45309] mb-4 leading-[1.4em]">
                Fill in chips, headline, project name and an image to enable saving.
              </p>
            )}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!isComplete || isReadOnly || save.status === 'saving'}
                className={`${pillClass} bg-[#111111] text-white border-[#111111] hover:bg-[#333333]`}
              >
                {editingIndex === null ? (
                  <>
                    <Plus size={14} strokeWidth={2} /> Add to site
                  </>
                ) : (
                  <>
                    <Save size={14} strokeWidth={2} /> Save changes
                  </>
                )}
              </button>
              <CopyButton value={handoff} label="Copy for chat" />
            </div>
            <p className="text-xs text-[#666666] leading-[1.5em]">
              Saving writes <span className="font-mono">src/data/projects.json</span> and the site
              hot-reloads immediately. Commit that file to publish.
            </p>
          </div>
        </div>

        {/* --- Manage list --- */}
        <div className="mt-16 border-t border-[#111111] pt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[clamp(1.4rem,2.5vw,2rem)] font-normal tracking-[-0.03em]">
              All projects <span className="text-[#aaaaaa]">({items.length})</span>
              {items.length !== visibleCount && (
                <span className="text-[#aaaaaa] text-base"> · {items.length - visibleCount} hidden</span>
              )}
            </h2>
            <p className="text-xs text-[#888888]">
              Drag rows to reorder. The top {FEATURED_COUNT} visible cards are the featured grid.
            </p>
          </div>

          <div className="flex flex-col border border-[#eeeeee] rounded-[16px] overflow-hidden">
            {items.map((item, index) => {
              const rank = visibleRankOf(index);
              const isHidden = Boolean(item.hidden);
              const isFeatured = !isHidden && rank < FEATURED_COUNT;
              // The divider marks where the featured grid ends on the live site, so it
              // sits before the 5th *visible* card regardless of hidden rows above it.
              const showDivider = !isHidden && rank === FEATURED_COUNT;

              return (
                <React.Fragment key={item.id}>
                  {showDivider && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-[#111111] text-white">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-medium">
                        Explore beyond
                      </span>
                      <span className="flex-1 h-px bg-white/30" />
                      <span className="text-[10px] text-white/60">
                        everything above is featured (max {FEATURED_COUNT})
                      </span>
                    </div>
                  )}

                  <div
                    draggable={!isReadOnly}
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setOverIndex(index);
                    }}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={endDrag}
                    className={`flex items-center gap-4 p-3 border-b border-[#eeeeee] last:border-b-0 transition-colors ${
                      dragIndex === index ? 'opacity-40' : ''
                    } ${isHidden ? 'bg-[#fbfbfb]' : ''} ${
                      overIndex === index && dragIndex !== null && dragIndex !== index
                        ? 'bg-yellow-50 ring-2 ring-inset ring-yellow-300'
                        : editingIndex === index
                          ? 'bg-yellow-50'
                          : 'hover:bg-[#fafafa]'
                    }`}
                  >
                    <GripVertical
                      size={16}
                      strokeWidth={2}
                      className={`shrink-0 text-[#bbbbbb] ${isReadOnly ? '' : 'cursor-grab active:cursor-grabbing'}`}
                    />

                    <span
                      className={`shrink-0 w-7 h-7 flex items-center justify-center text-[11px] font-medium rounded-full ${
                        isHidden
                          ? 'bg-[#eeeeee] text-[#aaaaaa]'
                          : isFeatured
                            ? 'bg-yellow-300 text-[#111111]'
                            : 'bg-[#111111] text-white'
                      }`}
                    >
                      {isHidden
                        ? '–'
                        : isFeatured
                          ? String(rank + 1).padStart(2, '0')
                          : String(rank - FEATURED_COUNT + 1).padStart(2, '0')}
                    </span>

                    <div
                      className={`shrink-0 w-16 h-12 rounded-[8px] overflow-hidden border border-[#eeeeee] bg-[#f2f2f2] ${
                        isHidden ? 'grayscale opacity-50' : ''
                      }`}
                    >
                      {item.img && (
                        <img
                          src={item.img}
                          alt={item.featured.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    <div className={`min-w-0 flex-1 ${isHidden ? 'opacity-50' : ''}`}>
                      <p className="text-sm font-medium truncate flex items-center gap-2">
                        {isFeatured && (
                          <Star size={12} strokeWidth={2} className="shrink-0 text-yellow-500" />
                        )}
                        {isHidden && (
                          <span className="shrink-0 px-2 py-[0.05rem] text-[9px] uppercase tracking-wide font-medium bg-[#eeeeee] text-[#888888] rounded-full">
                            Hidden
                          </span>
                        )}
                        <span className={isHidden ? 'line-through' : ''}>
                          {isFeatured ? item.featured.title : item.explore.subtitle}
                        </span>
                      </p>
                      <p className="text-xs text-[#666666] truncate">
                        {isFeatured ? item.featured.desc : item.explore.lines.join(' · ')}
                      </p>
                      <p className="text-xs text-[#aaaaaa] truncate">{item.explore.title}</p>
                    </div>

                    <div
                      className={`hidden xl:flex flex-wrap gap-1 max-w-[220px] justify-end ${
                        isHidden ? 'opacity-50' : ''
                      }`}
                    >
                      {item.chips.map((chip, i) => (
                        <span
                          key={i}
                          className="px-2 py-[0.1rem] text-[9px] uppercase font-medium border border-[#dddddd] text-[#666666] rounded-full"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      <button
                        type="button"
                        title={isHidden ? 'Show on the site' : 'Hide from the site'}
                        onClick={() => toggleHidden(index)}
                        disabled={isReadOnly}
                        className={`${iconBtnClass} ${isHidden ? 'border-[#111111] bg-[#111111] text-white' : ''}`}
                      >
                        {isHidden ? (
                          <EyeOff size={14} strokeWidth={2} />
                        ) : (
                          <Eye size={14} strokeWidth={2} />
                        )}
                      </button>
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => startEdit(index)}
                        className={iconBtnClass}
                      >
                        <Pencil size={14} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => remove(index)}
                        disabled={isReadOnly}
                        className={`${iconBtnClass} hover:bg-red-600 hover:border-red-600`}
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

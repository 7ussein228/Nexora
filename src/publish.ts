import type { SiteContent } from "./content";

/* ============================================================
   Image compression (client-side, before storing in draft)
   ============================================================ */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("unreadable image"));
    img.src = src;
  });
}

/** Downscale + JPEG-compress an image file. Returns a data URL. */
export async function compressImage(
  file: File,
  maxDim = 1280,
  quality = 0.82
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unavailable");
    ctx.drawImage(img, 0, 0, w, h);
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob(res, "image/jpeg", quality)
    );
    if (!blob) throw new Error("compress failed");
    // If still heavy, try once more smaller.
    if (blob.size > 900 * 1024 && maxDim > 960) {
      return compressImage(file, 960, 0.72);
    }
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(blob);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export const isDataUrlImage = (v: string) =>
  v.startsWith("data:image/");

async function dataUrlToB64(dataUrl: string): Promise<{ b64: string; ext: string }> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = blob.type.includes("png") ? "png" : "jpg";
  const full: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("encode failed"));
    reader.readAsDataURL(blob);
  });
  return { b64: full.split(",")[1] ?? "", ext };
}

/* ============================================================
   GitHub publish — makes CMS edits live on ALL devices.
   Pushes a commit to main → Vercel + GitHub Pages redeploy.
   Token needs the `public_repo` scope (repos are public).
   ============================================================ */

const TOKEN_KEY = "nexora_gh_token";
const REPO_KEY = "nexora_gh_repo";
const BRANCH_KEY = "nexora_gh_branch";
const LAST_PUBLISH_KEY = "nexora_last_publish";

export type GhSettings = { token: string; repo: string; branch: string };

export function loadGhSettings(): GhSettings {
  try {
    return {
      token: localStorage.getItem(TOKEN_KEY) ?? "",
      repo: localStorage.getItem(REPO_KEY) ?? "7ussein228/Nexora",
      branch: localStorage.getItem(BRANCH_KEY) ?? "main",
    };
  } catch {
    return { token: "", repo: "7ussein228/Nexora", branch: "main" };
  }
}

export function saveGhSettings(s: GhSettings) {
  try {
    if (s.token) localStorage.setItem(TOKEN_KEY, s.token);
    localStorage.setItem(REPO_KEY, s.repo);
    localStorage.setItem(BRANCH_KEY, s.branch);
  } catch {
    /* storage unavailable */
  }
}

export function clearGhToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function getLastPublish(): string {
  try {
    return localStorage.getItem(LAST_PUBLISH_KEY) ?? "";
  } catch {
    return "";
  }
}

function setLastPublish(v: string) {
  try {
    localStorage.setItem(LAST_PUBLISH_KEY, v);
  } catch {
    /* storage unavailable */
  }
}

function b64ToText(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function textToB64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function ghFetch(
  path: string,
  token: string,
  init?: RequestInit
): Promise<unknown> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as {
    message?: string;
    sha?: string;
    content?: string;
  };
  if (res.status === 401) throw new Error("Invalid token (401). Create a new token with `public_repo` scope.");
  if (res.status === 404) throw new Error("Repo or file not found (404). Check owner/name, branch and that the token can read it.");
  if (!res.ok) throw new Error(data.message ?? `GitHub error ${res.status}`);
  return data;
}

async function getFile(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token: string
): Promise<{ sha: string; text: string } | null> {
  try {
    const data = (await ghFetch(
      `/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`,
      token
    )) as { sha: string; content: string };
    return { sha: data.sha, text: b64ToText(data.content) };
  } catch (e) {
    if (e instanceof Error && e.message.includes("404")) return null;
    throw e;
  }
}

async function putFile(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token: string,
  b64: string,
  message: string,
  sha?: string
): Promise<string> {
  const body: Record<string, string> = { message, content: b64, branch };
  if (sha) body.sha = sha;
  const data = (await ghFetch(`/repos/${owner}/${repo}/contents/${path}`, token, {
    method: "PUT",
    body: JSON.stringify(body),
  })) as { commit: { sha: string } };
  return data.commit.sha;
}

const START_MARK = "// NEXORA-CONTENT-START";
const END_MARK = "// NEXORA-CONTENT-END";

function buildDefaultsBlock(content: SiteContent): string {
  return `${START_MARK} — managed by CMS "Publish online". Do not edit between markers by hand.\nexport const defaultContent: SiteContent = ${JSON.stringify(content, null, 2)};\n${END_MARK}`;
}

/** Upload data-URL project photos into the repo, return content with file paths. */
async function uploadProjectImages(
  content: SiteContent,
  owner: string,
  repo: string,
  branch: string,
  token: string,
  onStep: (msg: string) => void
): Promise<{ content: SiteContent; uploaded: number }> {
  const next: SiteContent = JSON.parse(JSON.stringify(content)) as SiteContent;
  let uploaded = 0;
  for (const p of next.projects) {
    if (!isDataUrlImage(p.image)) continue;
    onStep(`Uploading photo for ${p.name}…`);
    const { b64, ext } = await dataUrlToB64(p.image);
    if (!b64) continue;
    const fileName = `${p.id}-${Date.now().toString(36)}.${ext}`;
    const path = `public/projects/${fileName}`;
    const existing = await getFile(owner, repo, path, branch, token);
    await putFile(owner, repo, path, branch, token, b64, `chore(cms): project photo ${p.id}`, existing?.sha);
    p.image = `projects/${fileName}`;
    uploaded++;
  }
  return { content: next, uploaded };
}

export async function publishSiteContent(
  content: SiteContent,
  settings: GhSettings,
  onStep: (msg: string) => void
): Promise<{ commitSha: string; uploadedImages: number }> {
  const [owner, repo] = settings.repo.split("/");
  if (!settings.token) throw new Error("Missing GitHub token.");
  if (!owner || !repo) throw new Error("Repo must look like owner/name.");
  const branch = settings.branch || "main";

  onStep("Preparing photos…");
  const { content: withFiles, uploaded } = await uploadProjectImages(
    content, owner, repo, branch, settings.token, onStep
  );

  onStep("Reading src/content.ts…");
  const file = await getFile(owner, repo, "src/content.ts", branch, settings.token);
  if (!file) throw new Error("src/content.ts not found on this branch.");
  if (!file.text.includes(START_MARK) || !file.text.includes(END_MARK)) {
    throw new Error("Publish markers missing in src/content.ts — pull latest main first.");
  }
  const pattern = new RegExp(`${START_MARK}[\\s\\S]*?${END_MARK}`);
  const updated = file.text.replace(pattern, () => buildDefaultsBlock(withFiles));
  if (updated === file.text) throw new Error("Nothing to publish — content identical.");

  onStep("Pushing commit…");
  const commitSha = await putFile(
    owner, repo, "src/content.ts", branch, settings.token,
    textToB64(updated),
    `chore(cms): publish site content${uploaded ? ` + ${uploaded} photo(s)` : ""}`,
    file.sha
  );
  setLastPublish(`${new Date().toISOString()}|${settings.repo}@${branch}|${commitSha.slice(0, 7)}`);
  return { commitSha, uploadedImages: uploaded };
}

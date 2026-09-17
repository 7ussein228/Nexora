import { useEffect, useMemo, useState } from "react";
import type { Bi, ProjectItem, ServiceItem, SiteContent, StatItem, TierItem } from "./content";
import { defaultContent, exportContent, exportContentTs, resetContent } from "./content";
import type { Dict, Lang } from "./i18n";
import { loadSubmissions, deleteSubmission, clearSubmissions, exportCSV, setSubmissionRead, markAllRead, type FormSubmission } from "./forms";
import { compressImage, isDataUrlImage, loadGhSettings, saveGhSettings, clearGhToken, getLastPublish, publishSiteContent, type GhSettings } from "./publish";

type Tab = "overview" | "hero" | "stats" | "services" | "projects" | "tiers" | "pricing" | "contact" | "forms" | "data";

const tabs: Array<[Tab, string, string]> = [
  ["overview", "Overview", "نظرة عامة"],
  ["hero", "Hero & About", "الرئيسية ومن نحن"],
  ["stats", "Statistics", "الإحصائيات"],
  ["services", "Services", "الخدمات"],
  ["projects", "Projects", "المشاريع"],
  ["tiers", "Pricing Tiers", "باقات الأسعار"],
  ["pricing", "Quote Calculator", "حاسبة الأسعار"],
  ["contact", "Contact Info", "بيانات التواصل"],
  ["forms", "Forms", "الرسائل"],
  ["data", "Data & Backup", "البيانات والنسخ"],
];

/** Sidebar grouping — turns 10 flat pills into 4 clear sections. */
const navGroups: Array<{ en: string; ar: string; ids: Tab[] }> = [
  { en: "Content", ar: "المحتوى", ids: ["hero", "stats", "services", "projects"] },
  { en: "Sales", ar: "المبيعات", ids: ["tiers", "pricing", "forms"] },
  { en: "Settings", ar: "الإعدادات", ids: ["contact", "data"] },
];

const tabLabel = (id: Tab, lang: Lang) => {
  const found = tabs.find(([t]) => t === id);
  return found ? (lang === "ar" ? found[2] : found[1]) : id;
};

/* ---------- small reusable field components ---------- */

const ICON_OPTIONS = [
  ["code", "Code — Websites"],
  ["store", "Store — E-commerce"],
  ["app", "App — Dashboards"],
  ["pen", "Pen — UI/UX"],
  ["mega", "Megaphone — Social"],
  ["palette", "Palette — Branding"],
  ["chart", "Chart — SEO"],
  ["bot", "Bot — AI"],
] as const;

const GRADIENT_OPTIONS = [
  "from-cyan-300 to-blue-500",
  "from-fuchsia-300 to-violet-500",
  "from-emerald-300 to-teal-500",
  "from-amber-200 to-orange-500",
  "from-pink-300 to-rose-500",
  "from-indigo-300 to-sky-500",
  "from-lime-300 to-green-500",
  "from-violet-300 to-cyan-400",
] as const;

function Select({ label, value, onChange, options, hint }: { label: string; value: string; onChange: (v: string) => void; options: ReadonlyArray<readonly [string, string] | string>; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-300">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-cyan-300">
        {options.map((o) => {
          const v = Array.isArray(o) ? o[0] : o;
          const l = Array.isArray(o) ? o[1] : o;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

function Field({ label, value, onChange, type = "text", hint }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-300">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-cyan-300" />
      {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

function Area({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-300">{label}</span>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-cyan-300" />
    </label>
  );
}

/** Paired EN/AR inputs — the core editing primitive for bilingual content. */
function BiField({ label, value, onChange, area = false, rows = 3 }: { label: string; value: Bi; onChange: (v: Bi) => void; area?: boolean; rows?: number }) {
  const C = area ? Area : Field;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div dir="ltr"><C label={`${label} (EN)`} value={value.en} onChange={(v) => onChange({ ...value, en: v })} rows={rows} /></div>
      <div dir="rtl"><C label={`${label} (AR)`} value={value.ar} onChange={(v) => onChange({ ...value, ar: v })} rows={rows} /></div>
    </div>
  );
}

function Stat({ label, value, sub, hot }: { label: string; value: string; sub?: string; hot?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${hot ? "border-amber-300/30 bg-amber-300/[0.05]" : "border-white/10 bg-white/[0.04]"}`}>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-[clamp(1.5rem,4vw,2.1rem)] font-black leading-none text-white" dir="ltr">{value}</p>
      {sub ? <p className="mt-2 text-xs leading-5 text-slate-500">{sub}</p> : null}
    </div>
  );
}

function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setErr("");
    if (!file.type.startsWith("image/")) { setErr("Please choose an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { setErr("Max 8MB per photo."); return; }
    setBusy(true);
    try {
      onChange(await compressImage(file));
    } catch {
      setErr("Could not read this image.");
    }
    setBusy(false);
  };
  return (
    <div className="space-y-3">
      <span className="block text-sm text-slate-300">Project photo</span>
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-white/10">
          <img src={value} alt="" className="h-40 w-full object-cover" loading="lazy" />
          {isDataUrlImage(value) ? (
            <span className="absolute start-2 top-2 rounded-full bg-cyan-300 px-2.5 py-1 text-[0.7rem] font-bold text-slate-950">Uploaded — publishes with content</span>
          ) : null}
          <button onClick={() => onChange("")} className="absolute end-2 top-2 rounded-full border border-red-500/40 bg-slate-950/80 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20">Remove</button>
        </div>
      ) : null}
      <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-slate-950 px-3 py-3 text-sm text-slate-300 transition hover:border-cyan-300/60 hover:text-white ${busy ? "pointer-events-none opacity-50" : ""}`}>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
        {busy ? "Compressing…" : value ? "Replace photo (upload)" : "Upload photo"}
      </label>
      <Field label="…or paste image URL" value={isDataUrlImage(value) ? "" : value} onChange={onChange} hint="Upload preferred — URL images stay as links" />
      {err ? <p role="alert" className="text-xs text-red-400">{err}</p> : null}
    </div>
  );
}

function Card({ title, children, onDelete }: { title: string; children: React.ReactNode; onDelete?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04]">
      <div className="flex items-center justify-between gap-3 p-4">
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex flex-1 items-center gap-3 text-start">
          <span className={`text-cyan-300 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden="true">▸</span>
          <span className="font-semibold text-white">{title}</span>
        </button>
        {onDelete ? <button onClick={onDelete} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10">Delete</button> : null}
      </div>
      {open ? <div className="space-y-4 border-t border-white/10 p-4">{children}</div> : null}
    </div>
  );
}

/* ---------- main dashboard ---------- */

export default function AdminDashboard({
  content, setContent, onLogout, onExit, t, lang,
}: {
  content: SiteContent;
  setContent: (c: SiteContent) => void;
  onLogout: () => void;
  onExit: () => void;
  t: Dict;
  lang: Lang;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [saved, setSaved] = useState("");
  const [forms, setForms] = useState<FormSubmission[]>(() => loadSubmissions());
  const [draft, setDraft] = useState<SiteContent>(content);
  // forms inbox filters
  const [fq, setFq] = useState("");
  const [fService, setFService] = useState("all");
  const [fStatus, setFStatus] = useState<"all" | "unread" | "read">("all");
  const [fSort, setFSort] = useState<"new" | "old">("new");
  // pricing add-row inputs
  const [newTypeK, setNewTypeK] = useState("");
  const [newTypeV, setNewTypeV] = useState("10000");
  const [newFeatK, setNewFeatK] = useState("");
  const [newFeatV, setNewFeatV] = useState("5000");
  const [newLevelK, setNewLevelK] = useState("");
  const [newLevelV, setNewLevelV] = useState("1.5");
  // online publish (GitHub → all devices)
  const [gh, setGh] = useState<GhSettings>(() => loadGhSettings());
  const [pubState, setPubState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [pubMsg, setPubMsg] = useState("");
  const [lastPub, setLastPub] = useState(() => getLastPublish());
  useEffect(() => setDraft(content), [content]);
  useEffect(() => {
    const onUpdate = () => setForms(loadSubmissions());
    window.addEventListener("nexora:forms-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("nexora:forms-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const flash = (msg: string) => { setSaved(msg); window.setTimeout(() => setSaved(""), 2600); };
  const isDirty = JSON.stringify(draft) !== JSON.stringify(content);
  const save = () => { setContent(draft); flash(lang === "ar" ? "تم الحفظ - اضغط View site للمشاهدة" : "Saved - click View site to see"); };
  const patchDraft = (partial: Partial<SiteContent>) => setDraft({ ...draft, ...partial });
  const resetDraft = () => setDraft(content);

  const updateList = <T extends { id: string }>(list: T[], id: string, changes: Partial<T>) =>
    list.map((item) => (item.id === id ? { ...item, ...changes } : item));

  const emptyBi: Bi = { en: "", ar: "" };

  const moveService = (id: string, dir: -1 | 1) => {
    const i = draft.services.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= draft.services.length) return;
    const next = [...draft.services];
    const [it] = next.splice(i, 1);
    next.splice(j, 0, it);
    patchDraft({ services: next });
  };
  const duplicateService = (id: string) => {
    const src = draft.services.find((s) => s.id === id);
    if (!src) return;
    const copy: ServiceItem = { ...src, id: `sv${Date.now()}`, name: { en: `${src.name.en} (copy)`, ar: `${src.name.ar} (نسخة)` } };
    patchDraft({ services: [...draft.services, copy] });
  };

  const renameKey = (obj: Record<string, number>, oldK: string, newK: string) => {
    const clean = newK.trim();
    if (!clean || clean === oldK || obj[clean] !== undefined) return obj;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj)) out[k === oldK ? clean : k] = v;
    return out;
  };

  const filteredForms = useMemo(() => {
    const q = fq.trim().toLowerCase();
    let list = forms.filter((f) => {
      if (fStatus === "unread" && f.read) return false;
      if (fStatus === "read" && !f.read) return false;
      if (fService !== "all" && f.service !== fService) return false;
      if (!q) return true;
      return [f.id, f.name, f.email, f.phone, f.company, f.business, f.service, f.budget, f.description].join(" ").toLowerCase().includes(q);
    });
    list = [...list].sort((a, b) => (fSort === "new" ? +new Date(b.createdAt) - +new Date(a.createdAt) : +new Date(a.createdAt) - +new Date(b.createdAt)));
    return list;
  }, [forms, fq, fService, fStatus, fSort]);
  const unreadCount = forms.filter((f) => !f.read).length;
  const serviceNames = useMemo(() => Array.from(new Set(forms.map((f) => f.service).filter(Boolean))), [forms]);
  const visibleServices = draft.services.filter((s) => s.visible !== false).length;
  const featuredProjects = draft.projects.filter((p) => p.featured).length;
  const quoteCap = draft.pricing.maxQuote > 0 ? draft.pricing.maxQuote : 30000;
  const recentForms = useMemo(
    () => [...forms].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 5),
    [forms]
  );

  const badges: Partial<Record<Tab, string>> = {
    forms: unreadCount ? String(unreadCount) : "",
    services: `${visibleServices}/${draft.services.length}`,
  };

  const SubmitBar = () => (
    <div className="sticky bottom-4 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-300/30 bg-slate-900/95 p-4 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl">
      <p className="flex items-center gap-2 text-sm text-slate-300">
        <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${isDirty ? "animate-pulse bg-amber-300" : "bg-emerald-400"}`} />
        {isDirty ? (lang==="ar" ? "لديك تعديلات غير محفوظة" : "You have unsaved changes") : (lang==="ar" ? "كل التعديلات محفوظة" : "All changes saved")}
      </p>
      <div className="flex gap-2">
        <button onClick={resetDraft} disabled={!isDirty} className="rounded-full border border-white/15 px-5 py-2.5 text-sm disabled:opacity-40 hover:bg-white/10">{lang==="ar" ? "تراجع" : "Discard"}</button>
        <button onClick={save} disabled={!isDirty} className="rounded-full bg-gradient-to-r from-cyan-300 to-violet-300 px-7 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 disabled:opacity-40 hover:scale-[1.02]">{lang==="ar" ? "حفظ (Submit)" : "Submit / Save"}</button>
      </div>
    </div>
  );

  const NavButtons = ({ vertical = false }: { vertical?: boolean }) => (
    <>
      <button
        onClick={() => setTab("overview")}
        aria-current={tab === "overview"}
        className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm transition ${vertical ? "w-full text-start" : "whitespace-nowrap"} ${tab === "overview" ? "bg-cyan-300 font-bold text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
      >
        <span aria-hidden="true">◉</span>{tabLabel("overview", lang)}
      </button>
      {navGroups.map((g) => (
        <div key={g.en} className={vertical ? "mt-4" : ""}>
          {vertical ? (
            <p className="mb-1.5 px-3.5 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-slate-500">{lang === "ar" ? g.ar : g.en}</p>
          ) : null}
          <div className={`flex gap-1.5 ${vertical ? "flex-col" : ""}`}>
            {g.ids.map((id) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={tab === id}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm transition ${vertical ? "w-full justify-between text-start" : "whitespace-nowrap"} ${tab === id ? "bg-cyan-300 font-bold text-slate-950" : "border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"}`}
              >
                <span>{tabLabel(id, lang)}</span>
                {badges[id] ? (
                  <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${tab === id ? "bg-slate-950/15 text-slate-950" : "bg-cyan-300/15 text-cyan-200"}`} dir="ltr">{badges[id]}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-violet-400 text-sm font-black text-slate-950" dir="ltr">N</span>
            <div>
              <p className="text-[0.7rem] uppercase tracking-[0.2em] text-cyan-300">{t.admin.console}</p>
              <h1 className="text-lg font-black leading-tight" dir="ltr">NEXORA CMS <span className="ms-2 hidden text-xs font-normal text-slate-500 sm:inline">/ {tabLabel(tab, lang)}</span></h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isDirty ? (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-300/15 px-3 py-1.5 text-xs font-semibold text-amber-200">
                <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />{lang === "ar" ? "غير محفوظ" : "Unsaved"}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-300">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{lang === "ar" ? "محفوظ" : "Saved"}
              </span>
            )}
            {saved ? <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-300">{saved}</span> : null}
            <button onClick={onExit} className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10">
              {lang === "ar" ? "عرض الموقع" : "View site"}
            </button>
            <button onClick={onLogout} className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20">
              {t.cta.logout}
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="mx-auto max-w-7xl overflow-x-auto px-4 pb-3 md:px-8 lg:hidden">
          <div className="flex gap-1.5">
            <NavButtons />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl items-start gap-6 px-4 py-6 md:px-8 md:py-8">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-24 hidden w-60 shrink-0 rounded-3xl border border-white/10 bg-white/[0.03] p-3 lg:block">
          <NavButtons vertical />
          <div className="mt-4 rounded-2xl bg-slate-900/80 p-3 text-xs leading-5 text-slate-400">
            {lang === "ar"
              ? "الحفظ للمعاينة في متصفحك. للنشر لكل الزوار استخدم تبويب البيانات والنسخ."
              : "Saving previews in your browser. Publish for everyone via Data & Backup."}
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-5">
        {/* ---------------- OVERVIEW ---------------- */}
        {tab === "overview" && (
          <section className="space-y-5">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">{lang === "ar" ? "لوحة التحكم" : "Dashboard"}</h2>
              <p className="mt-1 text-sm text-slate-400">{lang === "ar" ? "نبض الموقع في نظرة واحدة — الرسائل، الخدمات، الأسعار والنشر." : "Site health at a glance — inbox, services, pricing and publishing."}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label={lang === "ar" ? "الرسائل" : "Leads"} value={String(forms.length)} sub={unreadCount ? (lang === "ar" ? `${unreadCount} غير مقروءة` : `${unreadCount} unread`) : (lang === "ar" ? "لا جديد غير مقروء" : "Inbox zero")} hot={unreadCount > 0} />
              <Stat label={lang === "ar" ? "خدمات ظاهرة" : "Live services"} value={`${visibleServices}/${draft.services.length}`} sub={lang === "ar" ? "تُعرض على الموقع" : "Shown on site"} />
              <Stat label={lang === "ar" ? "مشاريع معروضة" : "Featured work"} value={`${featuredProjects}/${draft.projects.length}`} sub={lang === "ar" ? "في قسم الأعمال" : "In portfolio"} />
              <Stat label={lang === "ar" ? "سقف الحاسبة" : "Quote cap"} value={quoteCap.toLocaleString("en-EG")} sub={lang === "ar" ? "جنيه — أقصى تقدير" : "EGP — max estimate"} />
            </div>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-bold">{lang === "ar" ? "أحدث الرسائل" : "Latest inquiries"}</h3>
                  <button onClick={() => setTab("forms")} className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">{lang === "ar" ? "عرض الكل ←" : "View all →"}</button>
                </div>
                {recentForms.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-500">{lang === "ar" ? "لا رسائل بعد." : "No inquiries yet."}</p>
                ) : (
                  <div className="space-y-2">
                    {recentForms.map((f) => (
                      <button key={f.id} onClick={() => setTab("forms")} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-start text-sm transition hover:border-cyan-300/40">
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 font-semibold text-white">
                            {!f.read ? <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-amber-300" /> : null}
                            <span className="truncate">{f.name || f.email}</span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">{f.service || "—"} · {new Date(f.createdAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}</span>
                        </span>
                        <span className="shrink-0 text-xs text-cyan-300" dir="ltr">{f.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <h3 className="mb-3 font-bold">{lang === "ar" ? "إجراءات سريعة" : "Quick actions"}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setTab("services")} className="rounded-2xl border border-white/10 px-3 py-3 text-sm hover:bg-white/10">{lang === "ar" ? "الخدمات" : "Services"}</button>
                    <button onClick={() => setTab("pricing")} className="rounded-2xl border border-white/10 px-3 py-3 text-sm hover:bg-white/10">{lang === "ar" ? "الحاسبة" : "Calculator"}</button>
                    <button onClick={() => setTab("projects")} className="rounded-2xl border border-white/10 px-3 py-3 text-sm hover:bg-white/10">{lang === "ar" ? "المشاريع" : "Projects"}</button>
                    <button onClick={() => setTab("data")} className="rounded-2xl border border-white/10 px-3 py-3 text-sm hover:bg-white/10">{lang === "ar" ? "النشر" : "Publish"}</button>
                  </div>
                </div>
                <div className={`rounded-3xl border p-5 ${isDirty ? "border-amber-300/30 bg-amber-300/[0.05]" : "border-emerald-500/20 bg-emerald-500/[0.05]"}`}>
                  <h3 className="font-bold">{lang === "ar" ? "حالة النشر" : "Publish status"}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {isDirty
                      ? (lang === "ar" ? "عندك تعديلات للمعاينة فقط — دوس حفظ ثم نزّل ملف النشر من تبويب البيانات." : "You have preview-only edits — hit Submit, then download the publish file from Data & Backup.")
                      : (lang === "ar" ? "كل حاجة محفوظة ومتناسقة مع الموقع." : "Everything saved and in sync with the site.")}
                  </p>
                  {isDirty ? <button onClick={save} className="mt-3 w-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-300 px-5 py-2.5 text-sm font-bold text-slate-950">{lang === "ar" ? "حفظ الآن" : "Save now"}</button> : null}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ---------------- HERO & ABOUT ---------------- */}
        {tab === "hero" && (
          <section className="space-y-6">
            <h2 className="text-2xl font-bold">{lang === "ar" ? "القسم الرئيسي" : "Hero Section"}</h2>
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <BiField label="Headline" value={draft.hero.title} onChange={(v) => patchDraft({ hero: { ...draft.hero, title: v } })} area rows={2} />
              <BiField label="Sub-headline" value={draft.hero.sub} onChange={(v) => patchDraft({ hero: { ...draft.hero, sub: v } })} area rows={3} />
            </div>
            <h2 className="text-2xl font-bold">{lang === "ar" ? "من نحن" : "About Section"}</h2>
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <BiField label="Title" value={draft.about.title} onChange={(v) => patchDraft({ about: { ...draft.about, title: v } })} area rows={2} />
              <BiField label="Body" value={draft.about.copy} onChange={(v) => patchDraft({ about: { ...draft.about, copy: v } })} area rows={5} />
            </div>
            <SubmitBar />
          </section>
        )}

        {/* ---------------- STATS ---------------- */}
        {tab === "stats" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{lang === "ar" ? "الإحصائيات" : "Statistics"}</h2>
              <button onClick={() => patchDraft({ stats: [...draft.stats, { id: `s${Date.now()}`, label: { ...emptyBi }, value: 0, suffix: "+" }] })} className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">+ Add</button>
            </div>
            {draft.stats.map((s: StatItem) => (
              <Card key={s.id} title={s.label.en || "Untitled stat"} onDelete={() => patchDraft({ stats: draft.stats.filter((x) => x.id !== s.id) })}>
                <BiField label="Label" value={s.label} onChange={(v) => patchDraft({ stats: updateList(draft.stats, s.id, { label: v }) })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Value" type="number" value={s.value} onChange={(v) => patchDraft({ stats: updateList(draft.stats, s.id, { value: Number(v) }) })} />
                  <Field label="Suffix" value={s.suffix} onChange={(v) => patchDraft({ stats: updateList(draft.stats, s.id, { suffix: v }) })} hint="e.g. + or %" />
                </div>
              </Card>
            ))}
            <SubmitBar />
          </section>
        )}

        {/* ---------------- SERVICES ---------------- */}
        {tab === "services" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">{lang === "ar" ? "الخدمات" : "Services"}</h2>
                <p className="mt-1 text-sm text-slate-400">{draft.services.filter((s) => s.visible !== false).length} / {draft.services.length} {lang === "ar" ? "ظاهرة على الموقع" : "visible on site"} · {lang === "ar" ? "رتب بالأسهم، وكرر، وأخفِ بدون حذف" : "Reorder, duplicate, hide without deleting"}</p>
              </div>
              <button onClick={() => patchDraft({ services: [...draft.services, { id: `sv${Date.now()}`, name: { ...emptyBi }, blurb: { ...emptyBi }, price: { ...emptyBi }, highlights: { ...emptyBi }, badge: { ...emptyBi }, visible: true, accent: "from-cyan-300 to-blue-500", icon: "code" }] })} className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">+ Add</button>
            </div>
            {draft.services.map((s: ServiceItem, idx: number) => (
              <Card key={s.id} title={`${s.visible === false ? "🚫 " : ""}${s.name.en || "Untitled service"}`} onDelete={() => patchDraft({ services: draft.services.filter((x) => x.id !== s.id) })}>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => moveService(s.id, -1)} disabled={idx === 0} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs disabled:opacity-30 hover:bg-white/10">↑ {lang === "ar" ? "فوق" : "Up"}</button>
                  <button onClick={() => moveService(s.id, 1)} disabled={idx === draft.services.length - 1} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs disabled:opacity-30 hover:bg-white/10">↓ {lang === "ar" ? "تحت" : "Down"}</button>
                  <button onClick={() => duplicateService(s.id)} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/10">{lang === "ar" ? "تكرار" : "Duplicate"}</button>
                  <label className="ms-auto flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" checked={s.visible !== false} onChange={(e) => patchDraft({ services: updateList(draft.services, s.id, { visible: e.target.checked }) })} className="h-4 w-4 accent-cyan-300" />
                    {lang === "ar" ? "ظاهرة على الموقع" : "Visible"}
                  </label>
                </div>
                <BiField label="Name" value={s.name} onChange={(v) => patchDraft({ services: updateList(draft.services, s.id, { name: v }) })} />
                <BiField label="Description" value={s.blurb} onChange={(v) => patchDraft({ services: updateList(draft.services, s.id, { blurb: v }) })} area />
                <BiField label="Deliverables (one per line)" value={s.highlights} onChange={(v) => patchDraft({ services: updateList(draft.services, s.id, { highlights: v }) })} area rows={4} />
                <BiField label="Starting price (leave blank for 'Custom scope')" value={s.price} onChange={(v) => patchDraft({ services: updateList(draft.services, s.id, { price: v }) })} />
                <BiField label="Badge (optional, e.g. Most requested)" value={s.badge ?? { en: "", ar: "" }} onChange={(v) => patchDraft({ services: updateList(draft.services, s.id, { badge: v }) })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select label="Icon" value={s.icon} onChange={(v) => patchDraft({ services: updateList(draft.services, s.id, { icon: v }) })} options={ICON_OPTIONS} hint="Professional SVG icon shown on the site" />
                  <Select label="Gradient" value={s.accent} onChange={(v) => patchDraft({ services: updateList(draft.services, s.id, { accent: v }) })} options={GRADIENT_OPTIONS} hint="Card accent gradient" />
                </div>
                <div className={`rounded-xl border border-white/10 bg-gradient-to-br ${s.accent} p-[1px]`}>
                  <div className="rounded-[0.7rem] bg-slate-950/90 p-3 text-sm">
                    <p className="text-xs text-slate-500">{lang === "ar" ? "معاينة حية" : "Live preview"}</p>
                    <p className="mt-1 font-bold text-white">{s.name[lang] || s.name.en || "—"}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">{s.blurb[lang] || s.blurb.en || "—"}</p>
                    <p className="mt-1 text-xs font-semibold text-cyan-300">{s.price[lang] || s.price.en || (lang === "ar" ? "نطاق مخصص" : "Custom scope")}</p>
                  </div>
                </div>
              </Card>
            ))}
            <SubmitBar />
          </section>
        )}

        {/* ---------------- PROJECTS ---------------- */}
        {tab === "projects" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{lang === "ar" ? "المشاريع" : "Projects"}</h2>
              <button onClick={() => patchDraft({ projects: [...draft.projects, { id: `p${Date.now()}`, name: "New Project", url: "", image: "", featured: true, client: { ...emptyBi }, industry: { ...emptyBi }, services: { ...emptyBi }, tech: "", budget: "", duration: { ...emptyBi }, result: { ...emptyBi }, quote: { ...emptyBi }, author: { ...emptyBi }, problem: { ...emptyBi }, solution: { ...emptyBi }, features: { ...emptyBi } }] })} className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">+ Add</button>
            </div>
            {draft.projects.map((p: ProjectItem) => (
              <Card key={p.id} title={p.name || "Untitled project"} onDelete={() => patchDraft({ projects: draft.projects.filter((x) => x.id !== p.id) })}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Project name" value={p.name} onChange={(v) => patchDraft({ projects: updateList(draft.projects, p.id, { name: v }) })} />
                  <Field label="Live URL" value={p.url} onChange={(v) => patchDraft({ projects: updateList(draft.projects, p.id, { url: v }) })} hint="Shows a 'Visit site' button when filled" />
                </div>
                <ImageField value={p.image} onChange={(v) => patchDraft({ projects: updateList(draft.projects, p.id, { image: v }) })} />
                <BiField label="Client" value={p.client} onChange={(v) => patchDraft({ projects: updateList(draft.projects, p.id, { client: v }) })} />
                <BiField label="Industry" value={p.industry} onChange={(v) => patchDraft({ projects: updateList(draft.projects, p.id, { industry: v }) })} />
                <BiField label="Services provided" value={p.services} onChange={(v) => patchDraft({ projects: updateList(draft.projects, p.id, { services: v }) })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Technologies" value={p.tech} onChange={(v) => patchDraft({ projects: updateList(draft.projects, p.id, { tech: v }) })} />
                  <Field label="Budget range" value={p.budget} onChange={(v) => patchDraft({ projects: updateList(draft.projects, p.id, { budget: v }) })} />
                </div>
                <BiField label="Duration" value={p.duration} onChange={(v) => patchDraft({ projects: updateList(draft.projects, p.id, { duration: v }) })} />
                <BiField label="Result" value={p.result} onChange={(v) => patchDraft({ projects: updateList(draft.projects, p.id, { result: v }) })} area rows={2} />
                <BiField label="Client problem" value={p.problem} onChange={(v) => patchDraft({ projects: updateList(draft.projects, p.id, { problem: v }) })} area rows={3} />
                <BiField label="Our solution" value={p.solution} onChange={(v) => patchDraft({ projects: updateList(draft.projects, p.id, { solution: v }) })} area rows={3} />
                <BiField label="Features" value={p.features} onChange={(v) => patchDraft({ projects: updateList(draft.projects, p.id, { features: v }) })} area rows={2} />
                <BiField label="Testimonial" value={p.quote} onChange={(v) => patchDraft({ projects: updateList(draft.projects, p.id, { quote: v }) })} area rows={3} />
                <BiField label="Testimonial author" value={p.author} onChange={(v) => patchDraft({ projects: updateList(draft.projects, p.id, { author: v }) })} />
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input type="checkbox" checked={p.featured} onChange={(e) => patchDraft({ projects: updateList(draft.projects, p.id, { featured: e.target.checked }) })} className="h-4 w-4 accent-cyan-300" />
                  Show on homepage
                </label>
              </Card>
            ))}
            <SubmitBar />
          </section>
        )}

        {/* ---------------- TIERS ---------------- */}
        {tab === "tiers" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{lang === "ar" ? "باقات الأسعار" : "Pricing Tiers"}</h2>
              <button onClick={() => patchDraft({ tiers: [...draft.tiers, { id: `t${Date.now()}`, name: "NEW", price: { ...emptyBi }, desc: { ...emptyBi }, highlight: false }] })} className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">+ Add</button>
            </div>
            {draft.tiers.map((tier: TierItem) => (
              <Card key={tier.id} title={tier.name} onDelete={() => patchDraft({ tiers: draft.tiers.filter((x) => x.id !== tier.id) })}>
                <Field label="Tier name" value={tier.name} onChange={(v) => patchDraft({ tiers: updateList(draft.tiers, tier.id, { name: v }) })} />
                <BiField label="Price" value={tier.price} onChange={(v) => patchDraft({ tiers: updateList(draft.tiers, tier.id, { price: v }) })} />
                <BiField label="Description" value={tier.desc} onChange={(v) => patchDraft({ tiers: updateList(draft.tiers, tier.id, { desc: v }) })} area rows={2} />
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input type="checkbox" checked={tier.highlight} onChange={(e) => patchDraft({ tiers: updateList(draft.tiers, tier.id, { highlight: e.target.checked }) })} className="h-4 w-4 accent-cyan-300" />
                  Highlight this tier
                </label>
              </Card>
            ))}
            <SubmitBar />
          </section>
        )}

        {/* ---------------- QUOTE CALCULATOR ---------------- */}
        {tab === "pricing" && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold">{lang === "ar" ? "حاسبة الأسعار" : "Quote Calculator"}</h2>
                <p className="mt-1 text-sm text-slate-400">{lang === "ar" ? "كل الأسعار بالجنيه المصري. زوّد / احذف / غيّر الاسم والسعر — الحاسبة في الموقع تتحدث تلقائياً." : "All values in EGP. Add / delete / rename — the public calculator updates automatically."}</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-slate-300">{Object.keys(draft.pricing.websiteTypes).length} types · {Object.keys(draft.pricing.features).length} features</span>
            </div>

            <div className="rounded-2xl border border-amber-300/30 bg-amber-300/[0.05] p-5">
              <h3 className="mb-1 font-bold">{lang === "ar" ? "سقف التقدير (الحد الأقصى)" : "Estimate cap"}</h3>
              <p className="mb-4 text-xs leading-5 text-slate-400">{lang === "ar" ? `مهما كانت الاختيارات، أي تقدير فوق ${draft.pricing.maxQuote.toLocaleString("en-EG")} ج يظهر للزائر "سعر خاص" مع زرار الفيسبوك.` : `Any estimate above ${draft.pricing.maxQuote.toLocaleString("en-EG")} EGP shows as "Private Price" with a Facebook button.`}</p>
              <div className="max-w-xs">
                <Field label={lang === "ar" ? "الحد الأقصى (جنيه)" : "Max quote (EGP)"} type="number" value={draft.pricing.maxQuote ?? 30000} onChange={(v) => patchDraft({ pricing: { ...draft.pricing, maxQuote: Math.max(1000, Number(v) || 30000) } })} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="mb-1 font-bold">Website types</h3>
              <p className="mb-4 text-xs text-slate-500">{lang === "ar" ? "غيّر الاسم الإنجليزي وسيظهر كما هو للزائر (مع ترجمة تلقائية إن وجدت)." : "Rename the English key; it shows as-is with auto-translation when available."}</p>
              <div className="space-y-2">
                {Object.entries(draft.pricing.websiteTypes).map(([k, v]) => (
                  <div key={k} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_40px]">
                    <input value={k} onChange={(e) => patchDraft({ pricing: { ...draft.pricing, websiteTypes: renameKey(draft.pricing.websiteTypes, k, e.target.value) } })} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300" />
                    <input type="number" min={0} value={v} onChange={(e) => patchDraft({ pricing: { ...draft.pricing, websiteTypes: { ...draft.pricing.websiteTypes, [k]: Number(e.target.value) } } })} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300" dir="ltr" />
                    <button onClick={() => { const o = { ...draft.pricing.websiteTypes }; delete o[k]; patchDraft({ pricing: { ...draft.pricing, websiteTypes: o } }); }} className="rounded-xl border border-red-500/30 px-2 text-red-300 hover:bg-red-500/10" aria-label={`Delete ${k}`}>×</button>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
                <input value={newTypeK} onChange={(e) => setNewTypeK(e.target.value)} placeholder={lang === "ar" ? "اسم نوع جديد…" : "New type name…"} className="w-full rounded-xl border border-dashed border-white/20 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300" />
                <input type="number" min={0} value={newTypeV} onChange={(e) => setNewTypeV(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300" dir="ltr" />
                <button onClick={() => { const k = newTypeK.trim(); if (!k || draft.pricing.websiteTypes[k] !== undefined) return; patchDraft({ pricing: { ...draft.pricing, websiteTypes: { ...draft.pricing.websiteTypes, [k]: Number(newTypeV) || 0 } } }); setNewTypeK(""); }} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950">+ {lang === "ar" ? "إضافة" : "Add"}</button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="mb-4 font-bold">Per extra page</h3>
              <Field label="Price per page" type="number" value={draft.pricing.pagePrice} onChange={(v) => patchDraft({ pricing: { ...draft.pricing, pagePrice: Number(v) } })} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="mb-1 font-bold">Features</h3>
              <p className="mb-4 text-xs text-slate-500">{lang === "ar" ? "أي feature جديدة تظهر فوراً في حاسبة الموقع." : "New features appear instantly in the public calculator."}</p>
              <div className="space-y-2">
                {Object.entries(draft.pricing.features).map(([k, v]) => (
                  <div key={k} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_40px]">
                    <input value={k} onChange={(e) => patchDraft({ pricing: { ...draft.pricing, features: renameKey(draft.pricing.features, k, e.target.value) } })} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300" />
                    <input type="number" min={0} value={v} onChange={(e) => patchDraft({ pricing: { ...draft.pricing, features: { ...draft.pricing.features, [k]: Number(e.target.value) } } })} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300" dir="ltr" />
                    <button onClick={() => { const o = { ...draft.pricing.features }; delete o[k]; patchDraft({ pricing: { ...draft.pricing, features: o } }); }} className="rounded-xl border border-red-500/30 px-2 text-red-300 hover:bg-red-500/10" aria-label={`Delete ${k}`}>×</button>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
                <input value={newFeatK} onChange={(e) => setNewFeatK(e.target.value)} placeholder={lang === "ar" ? "ميزة جديدة…" : "New feature…"} className="w-full rounded-xl border border-dashed border-white/20 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300" />
                <input type="number" min={0} value={newFeatV} onChange={(e) => setNewFeatV(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300" dir="ltr" />
                <button onClick={() => { const k = newFeatK.trim(); if (!k || draft.pricing.features[k] !== undefined) return; patchDraft({ pricing: { ...draft.pricing, features: { ...draft.pricing.features, [k]: Number(newFeatV) || 0 } } }); setNewFeatK(""); }} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950">+ {lang === "ar" ? "إضافة" : "Add"}</button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="mb-1 font-bold">Design level multipliers</h3>
              <p className="mb-4 text-xs text-slate-500">Multiplier, e.g. 1.35</p>
              <div className="space-y-2">
                {Object.entries(draft.pricing.designLevels).map(([k, v]) => (
                  <div key={k} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_40px]">
                    <input value={k} onChange={(e) => patchDraft({ pricing: { ...draft.pricing, designLevels: renameKey(draft.pricing.designLevels, k, e.target.value) } })} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300" />
                    <input type="number" min={0} step="0.05" value={v} onChange={(e) => patchDraft({ pricing: { ...draft.pricing, designLevels: { ...draft.pricing.designLevels, [k]: Number(e.target.value) } } })} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300" dir="ltr" />
                    <button onClick={() => { const o = { ...draft.pricing.designLevels }; delete o[k]; patchDraft({ pricing: { ...draft.pricing, designLevels: o } }); }} className="rounded-xl border border-red-500/30 px-2 text-red-300 hover:bg-red-500/10" aria-label={`Delete ${k}`}>×</button>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
                <input value={newLevelK} onChange={(e) => setNewLevelK(e.target.value)} placeholder={lang === "ar" ? "مستوى جديد…" : "New level…"} className="w-full rounded-xl border border-dashed border-white/20 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300" />
                <input type="number" min={0} step="0.05" value={newLevelV} onChange={(e) => setNewLevelV(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300" dir="ltr" />
                <button onClick={() => { const k = newLevelK.trim(); if (!k || draft.pricing.designLevels[k] !== undefined) return; patchDraft({ pricing: { ...draft.pricing, designLevels: { ...draft.pricing.designLevels, [k]: Number(newLevelV) || 1 } } }); setNewLevelK(""); }} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950">+ {lang === "ar" ? "إضافة" : "Add"}</button>
              </div>
            </div>
            <SubmitBar />
          </section>
        )}

        {/* ---------------- CONTACT ---------------- */}
        {tab === "contact" && (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">{lang === "ar" ? "بيانات التواصل" : "Contact Info"}</h2>
            <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Email" value={draft.contact.email} onChange={(v) => patchDraft({ contact: { ...draft.contact, email: v } })} />
                <Field label="Phone / WhatsApp" value={draft.contact.phone} onChange={(v) => patchDraft({ contact: { ...draft.contact, phone: v } })} />
              </div>
              <BiField label="Business hours" value={draft.contact.hours} onChange={(v) => patchDraft({ contact: { ...draft.contact, hours: v } })} />
              <BiField label="Location" value={draft.contact.location} onChange={(v) => patchDraft({ contact: { ...draft.contact, location: v } })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="LinkedIn" value={draft.contact.linkedin} onChange={(v) => patchDraft({ contact: { ...draft.contact, linkedin: v } })} />
                <Field label="Instagram" value={draft.contact.instagram} onChange={(v) => patchDraft({ contact: { ...draft.contact, instagram: v } })} />
                <Field label="Behance" value={draft.contact.behance} onChange={(v) => patchDraft({ contact: { ...draft.contact, behance: v } })} />
                <Field label="Facebook" value={draft.contact.facebook} onChange={(v) => patchDraft({ contact: { ...draft.contact, facebook: v } })} />
              </div>
            </div>
            <SubmitBar />
          </section>
        )}

        {/* ---------------- FORMS ---------------- */}
        {tab === "forms" && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold">{lang === "ar" ? "الرسائل والنماذج" : "Form Submissions"} <span className="ms-2 rounded-full bg-cyan-300 px-2.5 py-1 text-xs text-slate-950">{filteredForms.length}/{forms.length}</span>
                {unreadCount ? <span className="ms-2 rounded-full bg-amber-300 px-2.5 py-1 text-xs font-bold text-slate-950">{unreadCount} {lang === "ar" ? "غير مقروءة" : "unread"}</span> : null}
              </h2>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { markAllRead(); setForms(loadSubmissions()); flash(lang === "ar" ? "تم تعليم الكل كمقروء" : "All marked read"); }} className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10">{lang === "ar" ? "تعليم الكل كمقروء" : "Mark all read"}</button>
                <button
                  onClick={() => {
                    if (!filteredForms.length) return;
                    const csv = exportCSV(filteredForms);
                    const blob = new Blob([csv], { type: "text/csv" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `nexora-forms-${new Date().toISOString().slice(0,10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
                >
                  {lang === "ar" ? "تصدير CSV (المفلترة)" : "Export CSV (filtered)"}
                </button>
                <button
                  onClick={() => { if (confirm(lang==="ar" ? "مسح كل الرسائل؟" : "Clear all submissions?")) { clearSubmissions(); setForms([]); flash(lang==="ar" ? "تم المسح" : "Cleared"); } }}
                  className="rounded-full border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
                >
                  {lang === "ar" ? "مسح الكل" : "Clear all"}
                </button>
              </div>
            </div>
            <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-2 lg:grid-cols-4">
              <input value={fq} onChange={(e) => setFq(e.target.value)} placeholder={lang === "ar" ? "بحث بالاسم / الإيميل / الهاتف…" : "Search name / email / phone…"} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300 sm:col-span-2" />
              <select value={fService} onChange={(e) => setFService(e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300">
                <option value="all">{lang === "ar" ? "كل الخدمات" : "All services"}</option>
                {serviceNames.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select value={fStatus} onChange={(e) => setFStatus(e.target.value as "all" | "unread" | "read")} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300">
                  <option value="all">{lang === "ar" ? "الكل" : "All"}</option>
                  <option value="unread">{lang === "ar" ? "غير مقروءة" : "Unread"}</option>
                  <option value="read">{lang === "ar" ? "مقروءة" : "Read"}</option>
                </select>
                <select value={fSort} onChange={(e) => setFSort(e.target.value as "new" | "old")} className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300">
                  <option value="new">{lang === "ar" ? "الأحدث" : "Newest"}</option>
                  <option value="old">{lang === "ar" ? "الأقدم" : "Oldest"}</option>
                </select>
              </div>
            </div>
            {filteredForms.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center text-slate-400">{forms.length === 0 ? (lang==="ar" ? "لا توجد رسائل بعد. أي فورم يملأه العميل من صفحة About أو Contact هيظهر هنا." : "No submissions yet. Any form filled on About or Contact will appear here.") : (lang === "ar" ? "لا توجد نتائج مطابقة للبحث." : "No matching results.")}</p>
            ) : (
              <div className="space-y-3">
                {filteredForms.map((f) => (
                  <div key={f.id} className={`rounded-2xl border p-4 ${f.read ? "border-white/10 bg-white/[0.04]" : "border-amber-300/30 bg-amber-300/[0.04]"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-cyan-200">{!f.read ? <span className="me-2 inline-block h-2 w-2 rounded-full bg-amber-300" /> : null}{f.id} <span className="ms-2 text-xs font-normal text-slate-400">{new Date(f.createdAt).toLocaleString(lang==="ar" ? "ar-EG" : "en-US")}</span></p>
                      <div className="flex gap-2">
                        <button onClick={() => { setSubmissionRead(f.id, !f.read); setForms(loadSubmissions()); }} className="rounded-full border border-white/15 px-3 py-1 text-xs hover:bg-white/10">{f.read ? (lang === "ar" ? "تعليم غير مقروءة" : "Mark unread") : (lang === "ar" ? "تعليم مقروءة" : "Mark read")}</button>
                        <button onClick={() => { deleteSubmission(f.id); setForms(loadSubmissions()); flash(lang==="ar" ? "تم الحذف" : "Deleted"); }} className="rounded-full border border-red-500/30 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10">{lang==="ar" ? "حذف" : "Delete"}</button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <p><span className="text-slate-400">Name:</span> <span className="text-white">{f.name}</span></p>
                      <p><span className="text-slate-400">Email:</span> <a href={`mailto:${f.email}`} className="text-cyan-300 underline" dir="ltr">{f.email}</a></p>
                      <p><span className="text-slate-400">Phone:</span> <a href={`tel:${f.phone}`} className="text-cyan-300 underline" dir="ltr">{f.phone}</a></p>
                      <p><span className="text-slate-400">Company:</span> {f.company}</p>
                      <p><span className="text-slate-400">Business:</span> {f.business}</p>
                      <p><span className="text-slate-400">Service:</span> {f.service}</p>
                      <p><span className="text-slate-400">Budget:</span> {f.budget}</p>
                      <p><span className="text-slate-400">Deadline:</span> {f.deadline}</p>
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      <p><span className="text-slate-400">Description:</span> <span className="text-slate-200">{f.description}</span></p>
                      <p><span className="text-slate-400">References:</span> <span dir="ltr" className="text-slate-200">{f.references}</span></p>
                      <p><span className="text-slate-400">Features:</span> <span className="text-slate-200">{f.features}</span></p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href={`mailto:${f.email}?subject=Re: ${f.id} - NEXORA`} className="rounded-full bg-cyan-300 px-4 py-1.5 text-xs font-bold text-slate-950">Reply via Email</a>
                      <a href={`https://wa.me/${f.phone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-emerald-500/30 px-4 py-1.5 text-xs text-emerald-300">WhatsApp</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="rounded-xl bg-slate-900 p-3 text-xs text-slate-400">{lang==="ar" ? "الرسائل محفوظة في متصفحك (localStorage). للإيميل التلقائي اربط الفورم بـ EmailJS أو Webhook في الكود." : "Submissions are stored in this browser (localStorage). For auto-email, connect the form to EmailJS or a webhook."}</p>
          </section>
        )}

        {/* ---------------- DATA ---------------- */}
        {tab === "data" && (
          <section className="space-y-5">
            <h2 className="text-2xl font-bold">{lang === "ar" ? "البيانات والنسخ الاحتياطي" : "Data & Backup"}</h2>

            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.05] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-emerald-200">{lang === "ar" ? "النشر أونلاين (كل الأجهزة)" : "Publish online (all devices)"}</h3>
                {lastPub ? <span className="rounded-full bg-white/10 px-3 py-1 text-[0.7rem] text-slate-300" dir="ltr">last: {lastPub}</span> : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {lang === "ar"
                  ? "بينشر تعديلاتك المحفوظة على GitHub، والموقع يتحدث تلقائياً على كل الأجهزة خلال دقيقة أو دقيقتين (Vercel + GitHub Pages). الصور المرفوعة تترفع مع النشر."
                  : "Pushes your saved edits to GitHub — the site rebuilds on all devices in a minute or two (Vercel + GitHub Pages). Uploaded photos go up with it."}
              </p>
              {isDirty ? (
                <p className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-200">
                  {lang === "ar" ? "عندك تعديلات غير محفوظة — دوس حفظ (Submit) من أي تبويب الأول." : "You have unsaved changes — hit Submit in any tab first."}
                </p>
              ) : null}
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <label className="block text-sm">
                  <span className="text-slate-300">{lang === "ar" ? "GitHub Token (يُحفظ في متصفحك فقط)" : "GitHub Token (stored in this browser only)"}</span>
                  <input type="password" value={gh.token} onChange={(e) => setGh({ ...gh, token: e.target.value.trim() })} placeholder="ghp_…" dir="ltr" className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-cyan-300" />
                </label>
                <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
                  <label className="block text-sm">
                    <span className="text-slate-300">Repo</span>
                    <input value={gh.repo} onChange={(e) => setGh({ ...gh, repo: e.target.value.trim() })} placeholder="owner/name" dir="ltr" className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-cyan-300" />
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-300">Branch</span>
                    <input value={gh.branch} onChange={(e) => setGh({ ...gh, branch: e.target.value.trim() || "main" })} dir="ltr" className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-white outline-none transition focus:border-cyan-300" />
                  </label>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => { saveGhSettings(gh); flash(lang === "ar" ? "تم حفظ الإعدادات" : "Settings saved"); }}
                  className="rounded-full border border-white/20 px-5 py-2.5 text-sm hover:bg-white/10"
                >
                  {lang === "ar" ? "حفظ الإعدادات" : "Save settings"}
                </button>
                {gh.token ? (
                  <button
                    onClick={() => { clearGhToken(); setGh({ ...gh, token: "" }); flash(lang === "ar" ? "تم مسح التوكن" : "Token removed"); }}
                    className="rounded-full border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
                  >
                    {lang === "ar" ? "مسح التوكن" : "Remove token"}
                  </button>
                ) : null}
                <a href="https://github.com/settings/tokens/new?scopes=public_repo&description=NEXORA%20CMS%20publish" target="_blank" rel="noopener noreferrer" className="text-sm text-cyan-300 underline underline-offset-4">
                  {lang === "ar" ? "إنشاء توكن (صلاحية public_repo)" : "Create a token (public_repo scope)"}
                </a>
              </div>
              <button
                disabled={pubState === "working" || isDirty || !gh.token}
                onClick={() => {
                  setPubState("working");
                  setPubMsg(lang === "ar" ? "جارٍ النشر…" : "Publishing…");
                  void publishSiteContent(content, gh, (m) => setPubMsg(m))
                    .then(({ commitSha, uploadedImages }) => {
                      setPubState("done");
                      setLastPub(getLastPublish());
                      const msg = lang === "ar"
                        ? `تم النشر (${commitSha.slice(0, 7)}${uploadedImages ? ` + ${uploadedImages} صور` : ""}) — الموقع يتحدث خلال دقيقتين`
                        : `Published (${commitSha.slice(0, 7)}${uploadedImages ? ` + ${uploadedImages} photo(s)` : ""}) — live in ~2 min`;
                      setPubMsg(msg);
                      flash(msg);
                    })
                    .catch((e: unknown) => {
                      setPubState("error");
                      setPubMsg(e instanceof Error ? e.message : "Publish failed");
                    });
                }}
                className="mt-4 w-full rounded-full bg-emerald-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-8"
              >
                {pubState === "working" ? (lang === "ar" ? "جارٍ النشر…" : "Publishing…") : (lang === "ar" ? "نشر أونلاين الآن" : "Publish online now")}
              </button>
              {pubMsg ? (
                <p className={`mt-3 rounded-xl p-3 text-sm ${pubState === "error" ? "border border-red-500/30 bg-red-500/10 text-red-300" : "bg-slate-900 text-slate-300"}`} dir="ltr">{pubMsg}</p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-cyan-300/30 bg-cyan-300/[0.06] p-5">
              <h3 className="font-bold text-cyan-200">{lang === "ar" ? "النشر لكل الزوار (مهم)" : "Publish for all visitors (important)"}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {lang === "ar"
                  ? "زر الحفظ (Submit) يحفظ في متصفحك فقط للمعاينة. عشان التعديلات تظهر لكل الناس: ١) دوس تنزيل content.ts ٢) استبدل defaultContent في ملف src/content.ts ٣) اعمل commit + deploy."
                  : "Submit saves to your browser only for preview. To publish for everyone: 1) Download content.ts 2) Replace defaultContent in src/content.ts 3) Commit + deploy."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([exportContentTs(draft)], { type: "text/plain;charset=utf-8" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `content-publish-${new Date().toISOString().slice(0, 10)}.ts`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                    flash(lang === "ar" ? "تم تنزيل ملف النشر" : "Publish file downloaded");
                  }}
                  className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:scale-[1.02]"
                >
                  {lang === "ar" ? "تنزيل content.ts للنشر" : "Download content.ts to publish"}
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([exportContent(draft)], { type: "application/json" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `nexora-content-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                  className="rounded-full border border-white/20 px-5 py-2.5 text-sm hover:bg-white/10"
                >
                  {lang === "ar" ? "تنزيل JSON (نسخة احتياطية)" : "Download JSON (backup)"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="font-bold">{lang === "ar" ? "استيراد المحتوى" : "Import content"}</h3>
              <p className="mt-2 text-sm text-slate-400">{lang === "ar" ? "ارفع ملف JSON سبق تصديره." : "Upload a previously exported JSON file."}</p>
              <input
                type="file" accept="application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    try {
                      const parsed = JSON.parse(String(reader.result));
                      const merged = { ...defaultContent, ...parsed };
                      setContent(merged);
                      setDraft(merged);
                      flash(lang === "ar" ? "تم الاستيراد" : "Imported");
                    } catch {
                      flash(lang === "ar" ? "ملف غير صالح" : "Invalid file");
                    }
                  };
                  reader.readAsText(file);
                }}
                className="mt-4 w-full rounded-xl border border-dashed border-white/20 bg-slate-950 px-3 py-2.5 text-sm text-slate-300 file:me-3 file:rounded-full file:border-0 file:bg-cyan-300 file:px-4 file:py-1.5 file:text-slate-950"
              />
            </div>

            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
              <h3 className="font-bold text-red-300">{lang === "ar" ? "إعادة التعيين" : "Reset to defaults"}</h3>
              <p className="mt-2 text-sm text-slate-400">{lang === "ar" ? "سيتم مسح كل تعديلاتك نهائياً." : "This permanently discards all your edits."}</p>
              <button
                onClick={() => { resetContent(); setContent(defaultContent); flash(lang === "ar" ? "تمت إعادة التعيين" : "Reset complete"); }}
                className="mt-4 rounded-full border border-red-500/40 px-5 py-2.5 font-semibold text-red-300 hover:bg-red-500/10"
              >
                {lang === "ar" ? "إعادة تعيين كل المحتوى" : "Reset all content"}
              </button>
            </div>
          </section>
        )}
        </main>
      </div>
    </div>
  );
}

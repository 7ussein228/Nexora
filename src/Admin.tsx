import { useEffect, useState } from "react";
import type { Bi, ProjectItem, ServiceItem, SiteContent, StatItem, TierItem } from "./content";
import { defaultContent, exportContent, resetContent } from "./content";
import type { Dict, Lang } from "./i18n";
import { loadSubmissions, deleteSubmission, clearSubmissions, exportCSV, type FormSubmission } from "./forms";

type Tab = "hero" | "stats" | "services" | "projects" | "tiers" | "pricing" | "contact" | "forms" | "data";

const tabs: Array<[Tab, string, string]> = [
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

/* ---------- small reusable field components ---------- */

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
  const [tab, setTab] = useState<Tab>("hero");
  const [saved, setSaved] = useState("");
  const [forms, setForms] = useState<FormSubmission[]>(() => loadSubmissions());
  const [draft, setDraft] = useState<SiteContent>(content);
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

  const SubmitBar = () => (
    <div className="sticky bottom-0 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-300/30 bg-slate-900/90 p-4 backdrop-blur-xl">
      <p className="text-sm text-slate-300">{isDirty ? (lang==="ar" ? "لديك تعديلات غير محفوظة" : "You have unsaved changes") : (lang==="ar" ? "كل التعديلات محفوظة" : "All changes saved")}</p>
      <div className="flex gap-2">
        <button onClick={resetDraft} disabled={!isDirty} className="rounded-full border border-white/15 px-5 py-2.5 text-sm disabled:opacity-40 hover:bg-white/10">{lang==="ar" ? "تراجع" : "Discard"}</button>
        <button onClick={save} disabled={!isDirty} className="rounded-full bg-gradient-to-r from-cyan-300 to-violet-300 px-7 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-40 hover:scale-[1.02]">{lang==="ar" ? "حفظ (Submit)" : "Submit / Save"}</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 backdrop-blur-xl">
        <div className="safe-x mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div>
            <p className="text-xs text-cyan-300">{t.admin.console}</p>
            <h1 className="text-xl font-black" dir="ltr">NEXORA CMS</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {saved ? <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-300">{saved}</span> : null}
            <button onClick={onExit} className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10">
              {lang === "ar" ? "عرض الموقع" : "View site"}
            </button>
            <button onClick={onLogout} className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300 hover:bg-red-500/20">
              {t.cta.logout}
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div className="safe-x mx-auto max-w-7xl overflow-x-auto px-4 pb-3 md:px-8">
          <div className="flex gap-2">
            {tabs.map(([id, en, ar]) => (
              <button key={id} onClick={() => setTab(id)} aria-current={tab === id} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm transition ${tab === id ? "bg-cyan-300 font-semibold text-slate-950" : "border border-white/10 text-slate-300 hover:bg-white/10"}`}>
                {lang === "ar" ? ar : en}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="safe-x mx-auto max-w-5xl px-4 py-8 md:px-8">

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
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{lang === "ar" ? "الخدمات" : "Services"}</h2>
              <button onClick={() => patchDraft({ services: [...draft.services, { id: `sv${Date.now()}`, name: { ...emptyBi }, blurb: { ...emptyBi }, price: { ...emptyBi }, accent: "from-cyan-300 to-blue-500", icon: "new" }] })} className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">+ Add</button>
            </div>
            {draft.services.map((s: ServiceItem) => (
              <Card key={s.id} title={s.name.en || "Untitled service"} onDelete={() => patchDraft({ services: draft.services.filter((x) => x.id !== s.id) })}>
                <BiField label="Name" value={s.name} onChange={(v) => patchDraft({ services: updateList(draft.services, s.id, { name: v }) })} />
                <BiField label="Description" value={s.blurb} onChange={(v) => patchDraft({ services: updateList(draft.services, s.id, { blurb: v }) })} area />
                <BiField label="Starting price (leave blank for 'Custom scope')" value={s.price} onChange={(v) => patchDraft({ services: updateList(draft.services, s.id, { price: v }) })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Icon text" value={s.icon} onChange={(v) => patchDraft({ services: updateList(draft.services, s.id, { icon: v }) })} hint="Short label shown in the 3D tile" />
                  <Field label="Gradient" value={s.accent} onChange={(v) => patchDraft({ services: updateList(draft.services, s.id, { accent: v }) })} hint="Tailwind: from-cyan-300 to-blue-500" />
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
                <Field label="Preview image URL" value={p.image} onChange={(v) => patchDraft({ projects: updateList(draft.projects, p.id, { image: v }) })} />
                {p.image ? <img src={p.image} alt="" className="h-32 w-full rounded-xl object-cover" loading="lazy" /> : null}
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
            <h2 className="text-2xl font-bold">{lang === "ar" ? "حاسبة الأسعار" : "Quote Calculator"}</h2>
            <p className="text-sm text-slate-400">{lang === "ar" ? "كل الأسعار بالجنيه المصري. الحاسبة في الموقع تستخدم هذه القيم مباشرة." : "All values in EGP. The public calculator reads these directly."}</p>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="mb-4 font-bold">Website types</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(draft.pricing.websiteTypes).map(([k, v]) => (
                  <Field key={k} label={k} type="number" value={v} onChange={(nv) => patchDraft({ pricing: { ...draft.pricing, websiteTypes: { ...draft.pricing.websiteTypes, [k]: Number(nv) } } })} />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="mb-4 font-bold">Per extra page</h3>
              <Field label="Price per page" type="number" value={draft.pricing.pagePrice} onChange={(v) => patchDraft({ pricing: { ...draft.pricing, pagePrice: Number(v) } })} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="mb-4 font-bold">Features</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(draft.pricing.features).map(([k, v]) => (
                  <Field key={k} label={k} type="number" value={v} onChange={(nv) => patchDraft({ pricing: { ...draft.pricing, features: { ...draft.pricing.features, [k]: Number(nv) } } })} />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="mb-4 font-bold">Design level multipliers</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(draft.pricing.designLevels).map(([k, v]) => (
                  <Field key={k} label={k} type="number" value={v} onChange={(nv) => patchDraft({ pricing: { ...draft.pricing, designLevels: { ...draft.pricing.designLevels, [k]: Number(nv) } } })} hint="Multiplier, e.g. 1.35" />
                ))}
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
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="LinkedIn" value={draft.contact.linkedin} onChange={(v) => patchDraft({ contact: { ...draft.contact, linkedin: v } })} />
                <Field label="Instagram" value={draft.contact.instagram} onChange={(v) => patchDraft({ contact: { ...draft.contact, instagram: v } })} />
                <Field label="Behance" value={draft.contact.behance} onChange={(v) => patchDraft({ contact: { ...draft.contact, behance: v } })} />
              </div>
            </div>
            <SubmitBar />
          </section>
        )}

        {/* ---------------- FORMS ---------------- */}
        {tab === "forms" && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold">{lang === "ar" ? "الرسائل والنماذج" : "Form Submissions"} <span className="ms-2 rounded-full bg-cyan-300 px-2.5 py-1 text-xs text-slate-950">{forms.length}</span></h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!forms.length) return;
                    const csv = exportCSV(forms);
                    const blob = new Blob([csv], { type: "text/csv" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `nexora-forms-${new Date().toISOString().slice(0,10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
                >
                  {lang === "ar" ? "تصدير CSV" : "Export CSV"}
                </button>
                <button
                  onClick={() => { if (confirm(lang==="ar" ? "مسح كل الرسائل؟" : "Clear all submissions?")) { clearSubmissions(); setForms([]); flash(lang==="ar" ? "تم المسح" : "Cleared"); } }}
                  className="rounded-full border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
                >
                  {lang === "ar" ? "مسح الكل" : "Clear all"}
                </button>
              </div>
            </div>
            {forms.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center text-slate-400">{lang==="ar" ? "لا توجد رسائل بعد. أي فورم يملأه العميل من صفحة About أو Contact هيظهر هنا." : "No submissions yet. Any form filled on About or Contact will appear here."}</p>
            ) : (
              <div className="space-y-3">
                {forms.map((f) => (
                  <div key={f.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-cyan-200">{f.id} <span className="ms-2 text-xs text-slate-400">{new Date(f.createdAt).toLocaleString(lang==="ar" ? "ar-EG" : "en-US")}</span></p>
                      <button onClick={() => { deleteSubmission(f.id); setForms(loadSubmissions()); flash(lang==="ar" ? "تم الحذف" : "Deleted"); }} className="rounded-full border border-red-500/30 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10">{lang==="ar" ? "حذف" : "Delete"}</button>
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
                    <div className="mt-3 flex gap-2">
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

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <h3 className="font-bold">{lang === "ar" ? "تصدير المحتوى" : "Export content"}</h3>
              <p className="mt-2 text-sm text-slate-400">{lang === "ar" ? "نزّل نسخة JSON من كل محتوى الموقع." : "Download a JSON snapshot of all site content."}</p>
              <button
                onClick={() => {
                  const blob = new Blob([exportContent(content)], { type: "application/json" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = `nexora-content-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
                className="mt-4 rounded-full bg-cyan-300 px-5 py-2.5 font-semibold text-slate-950"
              >
                {lang === "ar" ? "تنزيل JSON" : "Download JSON"}
              </button>
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
                      setContent({ ...defaultContent, ...JSON.parse(String(reader.result)) });
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

            <p className="rounded-xl bg-slate-900 p-4 text-xs text-slate-400">
              {lang === "ar"
                ? "ملاحظة: التعديلات محفوظة في متصفحك فقط (localStorage). لنشرها لكل الزوار، صدّر ملف JSON واستبدل القيم الافتراضية في src/content.ts، أو اربط اللوحة بواجهة برمجية على الخادم."
                : "Note: edits are saved in this browser only (localStorage). To publish them for all visitors, export the JSON and replace the defaults in src/content.ts, or connect this panel to a backend API."}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

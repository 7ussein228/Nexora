import { FormEvent, Suspense, lazy, useCallback, useEffect, useMemo, memo, useRef, useState, type ReactElement } from "react";
import { dict, fmtMoney, fmtNum, type Dict, type Lang } from "./i18n";
import { loadContent, saveContent, FACEBOOK_URL, type Bi, type ProjectItem, type ServiceItem, type SiteContent, type TierItem } from "./content";
import { saveSubmission } from "./forms";

const AdminDashboard = lazy(() => import("./Admin"));

function SectionLoader() {
  return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" /></div>;
}

type User = { username: string; name: string; role: "admin" | "user" };

const ADMIN_CREDENTIALS = { username: "Nexora Admin", password: "1752007" };

const techs = ["React", "Next.js", "Node.js", "TypeScript", "JavaScript", "Python", "PHP", "Laravel", "PostgreSQL", "MySQL", "MongoDB", "REST APIs", "GraphQL", "Cloud Infrastructure", "AI APIs"];

/** Pick the active language string from a bilingual pair. */
const bi = (v: Bi, lang: Lang) => (lang === "ar" ? v.ar : v.en) || v.en;

function useVisible<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { threshold: 0.25 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function AnimatedNumber({ value, suffix, lang }: { value: number; suffix: string; lang: Lang }) {
  const { ref, visible } = useVisible<HTMLSpanElement>();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!visible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setCount(value); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1200, 1);
      setCount(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible, value]);
  return <span ref={ref}>{fmtNum(count, lang)}{suffix}</span>;
}

function SectionTitle({ label, title, copy }: { label: string; title: string; copy?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center md:mb-16">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">{label}</p>
      <h2 className="text-[clamp(1.6rem,5vw,3rem)] font-semibold leading-tight tracking-tight text-white">{title}</h2>
      {copy ? <p className="mt-5 text-base leading-7 text-slate-300 md:text-lg">{copy}</p> : null}
    </div>
  );
}

const SERVICE_ICONS: Record<string, ReactElement> = {
  code: (<><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>),
  store: (<><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>),
  app: (<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></>),
  pen: (<><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></>),
  mega: (<><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>),
  palette: (<><circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.68-.75 1.68-1.68 0-.44-.16-.84-.44-1.14-.28-.3-.44-.7-.44-1.14A1.68 1.68 0 0 1 14.48 16h2.24A5.28 5.28 0 0 0 22 10.75C21.99 5.9 17.5 2 12 2z" /></>),
  chart: (<><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M7 13l3 3 7-7" /></>),
  bot: (<><path d="M12 8V4H8" /><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></>),
};

function ServiceGlyph({ icon }: { icon: string }) {
  const key = (icon || "").toLowerCase();
  const body =
    SERVICE_ICONS[key] ??
    SERVICE_ICONS[
      key.includes("code") || key.includes("</") ? "code"
      : key.includes("bag") || key.includes("store") || key.includes("shop") ? "store"
      : key.includes("app") || key.includes("dash") ? "app"
      : key.includes("ux") || key.includes("pen") || key.includes("design") ? "pen"
      : key.includes("soc") || key.includes("mega") || key.includes("share") ? "mega"
      : key.includes("brand") || key.includes("palette") || key.includes("id") ? "palette"
      : key.includes("seo") || key.includes("chart") || key.includes("search") ? "chart"
      : key.includes("ai") || key.includes("bot") ? "bot"
      : "code"
    ];
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
      {body}
    </svg>
  );
}

function ServiceBadge({ accent, icon }: { accent: string; icon: string }) {
  return (
    <div className="icon-3d relative h-16 w-16 shrink-0 rounded-2xl bg-white/10 p-[1px] shadow-2xl shadow-cyan-950/40">
      <div className={`flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-slate-950`} dir="ltr">
        <ServiceGlyph icon={icon} />
      </div>
    </div>
  );
}

/** Tier prices like "Custom"/"Private"/"خاص" mean: talk to us instead of a fixed number. */
function isCustomPrice(tier: TierItem): boolean {
  return /custom|private|خاص|مخصص/i.test(`${tier.price.en} ${tier.price.ar}`);
}

function FacebookIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.9 3.77-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.45 2.9h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}
/** Split bilingual highlights textarea into clean bullet lines. */
function highlightLines(v: Bi, lang: Lang): string[] {
  const raw = bi(v, lang);
  return raw.split(/\r?\n|·|•/).map((s) => s.trim()).filter(Boolean).slice(0, 5);
}

const HeroVisual = memo(function HeroVisual({ t }: { t: Dict }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    const q = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)");
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setInteractive(q.matches && !m.matches);
    sync(); q.addEventListener("change", sync); m.addEventListener("change", sync);
    return () => { q.removeEventListener("change", sync); m.removeEventListener("change", sync); };
  }, []);

  const move = (cx: number, cy: number) => {
    if (!interactive) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ x: (cx - r.left) / r.width - 0.5, y: (cy - r.top) / r.height - 0.5 });
  };

  return (
    <div ref={ref} className="hero-orbit relative min-h-[470px] overflow-hidden md:min-h-[620px]" onMouseMove={(e) => move(e.clientX, e.clientY)} style={interactive ? { transform: `perspective(1200px) rotateX(${pos.y * -6}deg) rotateY(${pos.x * 8}deg)` } : undefined} role="img" aria-label={t.hero.visualAlt}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(34,211,238,.26),transparent_38%),radial-gradient(circle_at_60%_60%,rgba(168,85,247,.18),transparent_30%)]" />
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20 bg-cyan-300/10 blur-[1px] md:h-80 md:w-80" />
      <div className="float-slow absolute left-[12%] top-[12%] w-64 rounded-3xl border border-white/15 bg-slate-950/60 p-4 shadow-2xl shadow-cyan-950/60 backdrop-blur-xl sm:w-80">
        <div className="mb-4 flex gap-2"><span className="h-2 w-2 rounded-full bg-rose-400" /><span className="h-2 w-2 rounded-full bg-amber-300" /><span className="h-2 w-2 rounded-full bg-emerald-300" /></div>
        <div className="h-24 rounded-2xl bg-gradient-to-br from-cyan-300/30 to-violet-500/20" />
        <div className="mt-4 grid grid-cols-3 gap-2"><span className="h-10 rounded-xl bg-white/10" /><span className="h-10 rounded-xl bg-white/10" /><span className="h-10 rounded-xl bg-white/10" /></div>
      </div>
      <div className="float-medium absolute right-[7%] top-[18%] w-48 rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl sm:w-60">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-200">{t.hero.revenue}</p>
        <div className="mt-5 flex h-28 items-end gap-2">{[32, 54, 40, 76, 92, 68].map((h, i) => <span key={i} className="flex-1 rounded-t-lg bg-gradient-to-t from-cyan-400 to-white/80" style={{ height: `${h}%` }} />)}</div>
      </div>
      <div className="float-fast absolute bottom-[14%] left-[18%] rounded-3xl border border-white/15 bg-slate-950/70 p-4 backdrop-blur-xl" dir="ltr">
        <pre className="text-xs leading-6 text-cyan-100"><code>{`const growth = await NEXORA.launch({\n  brand, platform, aiAutomation\n});`}</code></pre>
      </div>
      <div className="float-medium absolute bottom-[17%] right-[18%] w-52 rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl">
        <div className="flex items-center gap-3"><ServiceBadge accent="from-pink-300 to-cyan-300" icon="bot" /><div><p className="text-sm font-semibold text-white">{t.hero.bot}</p><p className="text-xs text-slate-300">{t.hero.botSub}</p></div></div>
      </div>
    </div>
  );
});

function QuoteBuilder({ content, t, lang }: { content: SiteContent; t: Dict; lang: Lang }) {
  const rules = content.pricing;
  const [type, setType] = useState(Object.keys(rules.websiteTypes)[1]);
  const [pages, setPages] = useState(5);
  const [features, setFeatures] = useState<string[]>(["SEO optimization"]);
  const [design, setDesign] = useState("Professional");

  const cap = rules.maxQuote > 0 ? rules.maxQuote : 30000;
  const rawTotal = useMemo(() => {
    const base = rules.websiteTypes[type] ?? 0;
    const feat = features.reduce((s, i) => s + (rules.features[i] ?? 0), 0);
    return Math.round((base + Math.max(pages - 1, 0) * rules.pagePrice + feat) * (rules.designLevels[design] ?? 1));
  }, [design, features, pages, rules, type]);
  const capped = rawTotal > cap;
  const total = Math.min(rawTotal, cap);
  const pct = Math.max(4, Math.min(100, Math.round((total / cap) * 100)));

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)] lg:gap-6">
      <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl sm:rounded-[2rem] sm:p-6 md:p-8">
        <div className="grid gap-8">
          <fieldset>
            <legend className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">{t.builder.s1}</legend>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Object.keys(rules.websiteTypes).map((i) => (
              <button key={i} type="button" aria-pressed={type === i} onClick={() => setType(i)} className={`rounded-2xl border p-4 text-start text-sm transition ${type === i ? "border-cyan-300 bg-cyan-300/15 text-white" : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/30"}`}>{t.types[i as keyof Dict["types"]] ?? i}</button>
            ))}</div>
          </fieldset>
          <fieldset>
            <legend className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">{t.builder.s2}</legend>
            <input aria-label={t.builder.s2} type="range" min="1" max="60" value={pages} onChange={(e) => setPages(Number(e.target.value))} className="w-full accent-cyan-300" />
            <div className="mt-3 flex justify-between text-sm text-slate-300"><span>{t.builder.onePage}</span><strong className="text-white">{fmtNum(pages, lang)} {t.builder.pages}</strong><span>{t.builder.maxPages}</span></div>
          </fieldset>
          <fieldset>
            <legend className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">{t.builder.s3}</legend>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Object.keys(rules.features).map((i) => (
              <label key={i} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300 transition hover:border-cyan-300/50">
                <input type="checkbox" checked={features.includes(i)} onChange={() => setFeatures((p) => p.includes(i) ? p.filter((x) => x !== i) : [...p, i])} className="h-4 w-4 accent-cyan-300" />
                {t.feats[i as keyof Dict["feats"]] ?? i}
              </label>
            ))}</div>
          </fieldset>
          <fieldset>
            <legend className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">{t.builder.s4}</legend>
            <div className="grid gap-3 sm:grid-cols-4">{Object.keys(rules.designLevels).map((i) => (
              <button key={i} type="button" aria-pressed={design === i} onClick={() => setDesign(i)} className={`rounded-2xl border p-4 text-sm font-semibold transition ${design === i ? "border-violet-300 bg-violet-300/15 text-white" : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/30"}`}>{t.levels[i as keyof Dict["levels"]] ?? i}</button>
            ))}</div>
          </fieldset>
        </div>
      </div>
      <aside className="h-fit rounded-3xl border border-cyan-300/20 bg-slate-950/70 p-5 shadow-2xl shadow-cyan-950/40 backdrop-blur-2xl sm:rounded-[2rem] sm:p-6 md:p-8 lg:sticky lg:top-28">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200 sm:text-sm">{t.builder.estimate}</p>
        {capped ? (
          <>
            <p className="mt-4 text-[clamp(1.75rem,6vw,3rem)] font-black leading-none tracking-tight text-white sm:mt-5">{lang === "ar" ? "سعر خاص" : "Private Price"}</p>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              {lang === "ar"
                ? "مشروعك أكبر من الباقات القياسية (٥٬٠٠٠ – ٣٠٬٠٠٠ ج) — تواصل معنا مباشرة لسعر خاص."
                : "Your project exceeds standard packages (EGP 5,000 – 30,000) — contact us directly for a private price."}
            </p>
            <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="magnetic mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1877F2] px-6 py-4 font-bold text-white transition hover:brightness-110">
              <FacebookIcon />{lang === "ar" ? "تواصل معنا على فيسبوك" : "Contact us on Facebook"}
            </a>
            <a href="#contact" className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-white/20 px-6 py-4 font-semibold text-white transition hover:bg-white/10">{t.cta.request}</a>
          </>
        ) : (
          <>
            <p className="mt-4 text-[clamp(1.75rem,6vw,3rem)] font-black leading-none tracking-tight text-white sm:mt-5">{fmtMoney(total, lang)}</p>
            <p className="mt-3 text-xs text-slate-500">{lang === "ar" ? `الحد الأقصى ${fmtMoney(cap, lang)}` : `Max ${fmtMoney(cap, lang)}`}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t.builder.estimate}>
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-300 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{t.builder.note}</p>
            <a href="#contact" className="magnetic mt-8 inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-4 font-semibold text-slate-950 transition hover:bg-cyan-200">{t.cta.request}</a>
          </>
        )}
      </aside>
    </div>
  );
}

function ContactForm({ onSubmit, t }: { onSubmit: (id: string) => void; t: Dict }) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const entry = saveSubmission({
      name: String(fd.get("name") || ""),
      company: String(fd.get("company") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      business: String(fd.get("business") || ""),
      service: String(fd.get("service") || ""),
      budget: String(fd.get("budget") || ""),
      deadline: String(fd.get("deadline") || ""),
      description: String(fd.get("description") || ""),
      references: String(fd.get("references") || ""),
      features: String(fd.get("features") || ""),
    });
    onSubmit(entry.id);
    e.currentTarget.reset();
  };
  const f = t.contact.fields;
  return (
    <form onSubmit={submit} className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl sm:grid-cols-2 sm:rounded-[2rem] sm:p-6 md:p-8">
      <label className="text-sm text-slate-300">{f.name}<input name="name" required type="text" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300" /></label>
      <label className="text-sm text-slate-300">{f.company}<input name="company" type="text" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300" /></label>
      <label className="text-sm text-slate-300">{f.email}<input name="email" required type="email" dir="ltr" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300" /></label>
      <label className="text-sm text-slate-300">{f.phone}<input name="phone" required type="tel" dir="ltr" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300" /></label>
      <label className="text-sm text-slate-300">{f.biz}<input name="business" required type="text" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300" /></label>
      <label className="text-sm text-slate-300">{f.service}<input name="service" required type="text" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300" /></label>
      <label className="text-sm text-slate-300">{f.budget}<input name="budget" required type="text" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300" /></label>
      <label className="text-sm text-slate-300">{f.deadline}<input name="deadline" required type="text" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300" /></label>
      <label className="text-sm text-slate-300 sm:col-span-2">{f.desc}<textarea name="description" required rows={5} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300" /></label>
      <label className="text-sm text-slate-300">{f.refs}<input name="references" type="text" dir="ltr" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300" /></label>
      <label className="text-sm text-slate-300">{f.feats}<input name="features" type="text" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300" /></label>
      <label className="text-sm text-slate-300 sm:col-span-2">{f.files}<input type="file" multiple className="mt-2 w-full rounded-2xl border border-dashed border-white/20 bg-slate-950/70 px-4 py-3 text-slate-300 file:me-4 file:rounded-full file:border-0 file:bg-cyan-200 file:px-4 file:py-2 file:text-slate-950" /></label>
      <button className="magnetic rounded-full bg-gradient-to-r from-cyan-200 to-violet-200 px-7 py-4 font-bold text-slate-950 transition hover:scale-[1.02] sm:col-span-2">{t.cta.start}</button>
    </form>
  );
}

function CustomerPortal({ t, email, onPay }: { t: Dict; email: string; onPay: () => void }) {
  const [ticket, setTicket] = useState("");
  const [msg, setMsg] = useState("");
  const mailTo = (subject: string, body: string) =>
    `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return (
    <main className="safe-x min-h-screen bg-slate-950 px-4 pb-16 pt-24 text-white sm:pt-28 md:px-8">
      <div className="shell">
        <p className="text-cyan-200">{t.portal.label}</p>
        <h1 className="text-[clamp(1.9rem,6vw,3.75rem)] font-black leading-tight">{t.portal.title}</h1>
        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)] lg:gap-6">
          <aside className="h-fit rounded-3xl border border-white/10 bg-white/[0.06] p-5 sm:rounded-[2rem] sm:p-6">
            <h2 className="text-xl font-bold" dir="ltr">Maison Attire</h2>
            <ol className="mt-6 space-y-3">{t.portal.statuses.map((s, i) => <li key={s} className="flex items-center gap-3"><span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full ${i <= 3 ? "bg-cyan-300" : "bg-white/20"}`} /><span className={i <= 3 ? "text-white" : "text-slate-500"}>{s}</span></li>)}</ol>
          </aside>
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 sm:rounded-3xl sm:p-6"><h3 className="font-bold">{t.portal.invoices}</h3><p className="mt-2 text-slate-300">{t.portal.invoiceVal}</p><button onClick={onPay} className="mt-5 w-full rounded-full bg-cyan-200 px-5 py-3 font-bold text-slate-950 sm:w-auto">{t.portal.pay}</button></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 sm:rounded-3xl sm:p-6"><h3 className="font-bold">{t.portal.milestones}</h3><p className="mt-2 text-slate-300">{t.portal.milestoneVal}</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 sm:rounded-3xl sm:p-6">
              <h3 className="font-bold">{t.portal.messages}</h3>
              <textarea aria-label={t.portal.messages} value={msg} onChange={(e) => setMsg(e.target.value)} className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 p-3" placeholder={t.portal.msgPlaceholder} />
              <a href={mailTo("Project message", msg)} className="mt-3 inline-block w-full rounded-full bg-white px-5 py-3 text-center font-bold text-slate-950 sm:w-auto">{t.portal.messages}</a>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 sm:rounded-3xl sm:p-6">
              <h3 className="font-bold">{t.portal.ticket}</h3>
              <input aria-label={t.portal.subject} value={ticket} onChange={(e) => setTicket(e.target.value)} className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 p-3" placeholder={t.portal.subject} />
              <a href={mailTo(`Support ticket: ${ticket || t.portal.subject}`, "")} className="mt-3 inline-block w-full rounded-full border border-white/20 px-5 py-3 text-center sm:w-auto">{t.portal.createTicket}</a>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function PaymentStatus({ status, t }: { status: "success" | "failed" | "pending"; t: Dict }) {
  const c = t.payment[status];
  return (
    <main className="safe-x flex min-h-[100dvh] items-center justify-center bg-slate-950 p-4 py-24 text-white sm:p-6">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-center sm:rounded-[2rem] sm:p-8">
        <p className="text-cyan-200">{t.payment.arch}</p>
        <h1 className="mt-4 text-[clamp(1.75rem,6vw,2.25rem)] font-black">{c[0]}</h1>
        <p className="mt-4 text-slate-300">{c[1]}</p>
        <p className="mt-6 rounded-2xl bg-slate-900 p-4 text-sm text-slate-400">{t.payment.note}</p>
        <a href="#home" className="mt-8 inline-flex rounded-full bg-white px-6 py-3 font-bold text-slate-950">{t.payment.back}</a>
      </div>
    </main>
  );
}

function LoginPage({ onLogin, onSwitchToSignup, onCancel, t, lang }: { onLogin: (u: User) => void; onSwitchToSignup: () => void; onCancel: () => void; t: Dict; lang: Lang }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    setTimeout(() => {
      if (username.trim() === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        onLogin({ username, name: "Nexora Admin", role: "admin" }); return;
      }
      const users = JSON.parse(localStorage.getItem("nexora_users") || "[]");
      const found = users.find((u: { email: string; password: string; name: string }) => u.email === username && u.password === password);
      if (found) onLogin({ username: found.email, name: found.name, role: "user" });
      else setError(t.auth.invalid);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="safe-x flex min-h-[100dvh] items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl sm:rounded-[2rem] sm:p-8">
        <div className="text-center">
          <p className="text-[clamp(2rem,9vw,2.25rem)] font-black tracking-[-0.08em] text-white" dir="ltr">NEXORA</p>
          <p className="mt-2 text-sm text-cyan-300">{t.auth.adminAccess}</p>
        </div>
        <form onSubmit={submit} className="mt-7 space-y-5 sm:mt-8">
          <div>
            <label className="text-sm text-slate-300" htmlFor="u">{t.auth.username}</label>
            <input id="u" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300" placeholder={t.auth.enterUser} required autoFocus />
          </div>
          <div>
            <label className="text-sm text-slate-300" htmlFor="p">{t.auth.password}</label>
            <input id="p" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-300" placeholder={t.auth.enterPass} required />
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-full bg-gradient-to-r from-cyan-200 to-violet-200 px-7 py-4 font-bold text-slate-950 transition hover:scale-[1.02] disabled:opacity-50">{loading ? t.auth.verifying : t.auth.signIn}</button>
        </form>
        <div className="mt-6 space-y-2 text-center text-xs text-slate-500">
          <p>{t.auth.secure}</p>
          <button onClick={onSwitchToSignup} className="text-cyan-300 underline">{t.auth.register}</button>
          <br />
          <button onClick={onCancel} className="text-slate-400 underline">{lang === "ar" ? "العودة للموقع" : "Back to site"}</button>
        </div>
      </div>
    </div>
  );
}

function SignupPage({ onSwitchToLogin, t }: { onSwitchToLogin: () => void; t: Dict }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "" });
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) { setError(t.auth.pwShort); return; }
    const users = JSON.parse(localStorage.getItem("nexora_users") || "[]");
    if (users.find((u: { email: string }) => u.email === form.email)) { setError(t.auth.emailTaken); return; }
    users.push({ id: Date.now(), ...form, role: "user", createdAt: new Date().toISOString() });
    localStorage.setItem("nexora_users", JSON.stringify(users));
    setDone(true);
  };

  if (done) return (
    <div className="safe-x flex min-h-[100dvh] items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center backdrop-blur-xl sm:rounded-[2rem] sm:p-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20"><svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
        <h2 className="text-2xl font-bold text-white">{t.auth.regOk}</h2>
        <p className="mt-3 text-slate-300">{t.auth.regOkCopy}</p>
        <button onClick={onSwitchToLogin} className="mt-6 rounded-full border border-white/20 px-6 py-3 text-white hover:bg-white/10">{t.auth.back}</button>
      </div>
    </div>
  );

  return (
    <div className="safe-x flex min-h-[100dvh] items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl sm:rounded-[2rem] sm:p-8">
        <div className="text-center"><p className="text-[clamp(2rem,9vw,2.25rem)] font-black tracking-[-0.08em] text-white" dir="ltr">NEXORA</p><p className="mt-2 text-sm text-cyan-300">{t.auth.createAccount}</p></div>
        <form onSubmit={submit} className="mt-7 space-y-4 sm:mt-8">
          <div><label className="text-sm text-slate-300" htmlFor="n">{t.auth.fullName}</label><input id="n" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-300" required /></div>
          <div><label className="text-sm text-slate-300" htmlFor="e">{t.auth.emailLabel}</label><input id="e" type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-300" required /></div>
          <div><label className="text-sm text-slate-300" htmlFor="pw">{t.auth.password}</label><input id="pw" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-300" required minLength={6} /><p className="mt-1 text-xs text-slate-500">{t.auth.minChars}</p></div>
          <div><label className="text-sm text-slate-300" htmlFor="c">{t.auth.companyLabel}</label><input id="c" type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-300" /></div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="w-full rounded-full bg-gradient-to-r from-cyan-200 to-violet-200 px-7 py-4 font-bold text-slate-950 transition hover:scale-[1.02]">{t.auth.createAccount}</button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">{t.auth.approval}<br /><button onClick={onSwitchToLogin} className="mt-2 text-cyan-300 underline">{t.auth.haveAccount}</button></p>
      </div>
    </div>
  );
}

function ServiceModal({ s, index, onClose, t, lang }: { s: ServiceItem; index: number; onClose: () => void; t: Dict; lang: Lang }) {
  const lines = highlightLines(s.highlights, lang);
  const badge = bi(s.badge ?? { en: "", ar: "" }, lang).trim();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={bi(s.name, lang)} onClick={onClose} className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-950/90 p-3 backdrop-blur-xl sm:p-4">
      <article onClick={(e) => e.stopPropagation()} className="mx-auto my-4 max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-5 text-white shadow-2xl sm:my-8 sm:rounded-[2rem] sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <ServiceBadge accent={s.accent} icon={s.icon} />
          <button onClick={onClose} className="rounded-full border border-white/20 px-5 py-2.5 text-sm hover:bg-white/10">{t.cta.close}</button>
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">
          {String(index + 1).padStart(2, "0")} — {t.nav.services}{badge ? ` · ${badge}` : ""}
        </p>
        <h2 className="mt-2 text-[clamp(1.6rem,5vw,2.5rem)] font-black leading-tight">{bi(s.name, lang)}</h2>
        <p className="mt-3 leading-relaxed text-slate-300">{bi(s.blurb, lang)}</p>
        {lines.length ? (
          <ul className="mt-6 space-y-2.5">
            {lines.map((l) => (
              <li key={l} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
                <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-black text-emerald-300">✓</span>
                {l}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900/80 p-4">
          <p className="font-bold text-cyan-200">{bi(s.price, lang) || t.services.customScope}</p>
          <a href="#contact" onClick={onClose} className="rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200">{t.cta.request}</a>
        </div>
      </article>
    </div>
  );
}

function CaseStudy({ p, onClose, t, lang }: { p: ProjectItem; onClose: () => void; t: Dict; lang: Lang }) {
  const f = t.portfolio.fields;
  const rows: Array<[string, string]> = [
    [f.problem, bi(p.problem, lang)],
    [f.solution, bi(p.solution, lang)],
    [f.features, bi(p.features, lang)],
    [f.tech, p.tech],
    [f.results, bi(p.result, lang)],
    [f.duration, bi(p.duration, lang)],
    [f.budget, p.budget],
    [f.feedback, `“${bi(p.quote, lang)}” — ${bi(p.author, lang)}`],
  ];
  return (
    <div role="dialog" aria-modal="true" aria-label={p.name} className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-950/90 p-3 backdrop-blur-xl sm:p-4">
      <article className="mx-auto my-4 max-w-5xl rounded-3xl border border-white/10 bg-slate-950 p-5 text-white shadow-2xl sm:my-8 sm:rounded-[2rem] sm:p-6 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={onClose} className="rounded-full border border-white/20 px-5 py-3">{t.cta.close}</button>
          {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="rounded-full bg-cyan-300 px-5 py-3 font-bold text-slate-950">{lang === "ar" ? "زيارة الموقع ↗" : "Visit live site ↗"}</a> : null}
        </div>
        {p.image ? <img src={p.image} alt="" className="mt-6 aspect-[16/9] w-full rounded-2xl object-cover" loading="lazy" /> : null}
        <p className="mt-6 text-cyan-200">{bi(p.industry, lang)} — {t.portfolio.caseStudy}</p>
        <h2 className="mt-2 text-[clamp(1.8rem,6vw,3.75rem)] font-black leading-tight" dir="ltr">{p.name}</h2>
        <p className="mt-2 text-slate-400">{bi(p.client, lang)} · {bi(p.services, lang)}</p>
        <div className="mt-7 grid gap-4 sm:gap-6 md:grid-cols-2">
          {rows.map(([title, body]) => (
            <section key={title} className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 sm:rounded-3xl sm:p-6">
              <h3 className="text-lg font-bold sm:text-xl">{title}</h3>
              <p className="mt-3 leading-relaxed text-slate-300">{body}</p>
            </section>
          ))}
        </div>
        <a href="#contact" onClick={onClose} className="mt-8 inline-flex rounded-full bg-cyan-200 px-6 py-4 font-bold text-slate-950">{t.cta.similar}</a>
      </article>
    </div>
  );
}

function CustomCursor() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setOn(q.matches);
    sync(); q.addEventListener("change", sync);
    return () => q.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!on) return;
    const m = (e: MouseEvent) => { if (ref.current) ref.current.style.transform = `translate3d(${e.clientX - 10}px, ${e.clientY - 10}px, 0)`; };
    window.addEventListener("mousemove", m);
    return () => window.removeEventListener("mousemove", m);
  }, [on]);
  if (!on) return null;
  return <div ref={ref} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[60] h-5 w-5 rounded-full border border-cyan-200 mix-blend-difference transition-transform duration-75" />;
}

function LangToggle({ lang, setLang, t }: { lang: Lang; setLang: (l: Lang) => void; t: Dict }) {
  return (
    <button onClick={() => setLang(lang === "en" ? "ar" : "en")} lang={lang === "en" ? "ar" : "en"} aria-label={lang === "en" ? "التبديل إلى العربية" : "Switch to English"} className="rounded-full border border-white/15 px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-300 hover:text-white">
      {t.cta.langLabel}
    </button>
  );
}

const TopNav = memo(function TopNav({ items, menu, setMenu, go, user, onLogout, t, lang, setLang }: { items: Array<[string, string]>; menu: boolean; setMenu: (v: boolean) => void; go: (id: string) => void; user: User | null; onLogout: () => void; t: Dict; lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4 md:px-8">
      <nav className="shell flex items-center justify-between gap-3 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2.5 text-white shadow-2xl shadow-slate-950/40 backdrop-blur-2xl sm:py-3">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="shrink-0 text-lg font-black tracking-[-0.08em] sm:text-xl" dir="ltr">NEXORA</button>
        <div className="hidden items-center gap-4 md:flex xl:gap-6">{items.map(([id, l]) => <button key={id} onClick={() => go(id)} className="text-[0.8rem] text-slate-300 transition hover:text-white xl:text-sm">{l}</button>)}</div>
        <div className="hidden items-center gap-2 md:flex xl:gap-3">
          <LangToggle lang={lang} setLang={setLang} t={t} />
          {user ? <button onClick={onLogout} className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 hover:bg-red-500/20">{t.cta.logout}</button> : null}
          <a href="#contact" className="magnetic whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 xl:px-5 xl:py-3 xl:text-sm">{t.cta.start}</a>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <LangToggle lang={lang} setLang={setLang} t={t} />
          <button aria-label={menu ? "Close menu" : "Open menu"} aria-expanded={menu} onClick={() => setMenu(!menu)} className="rounded-full border border-white/10 p-3">
            <span className="block h-0.5 w-6 bg-white" /><span className="mt-1.5 block h-0.5 w-6 bg-white" />
          </button>
        </div>
      </nav>
      {menu && (
        <div className="shell mt-3 max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain rounded-3xl border border-white/10 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur-2xl sm:rounded-[2rem] sm:p-5 md:hidden">
          {items.map(([id, l]) => <button key={id} onClick={() => { go(id); setMenu(false); }} className="block w-full rounded-2xl px-4 py-3 text-start text-slate-200 hover:bg-white/10">{l}</button>)}
          {user ? <button onClick={() => { setMenu(false); onLogout(); }} className="block w-full rounded-2xl px-4 py-3 text-start text-red-300 hover:bg-white/10">{t.cta.logout}</button> : null}
          <a href="#contact" onClick={() => setMenu(false)} className="mt-2 block w-full rounded-2xl bg-white px-4 py-3 text-center font-bold text-slate-950">{t.cta.start}</a>
        </div>
      )}
    </header>
  );
});

export default function App() {
  const [lang, setLangState] = useState<Lang>(() => {
    const s = typeof localStorage !== "undefined" ? localStorage.getItem("nexora_lang") : null;
    if (s === "ar" || s === "en") return s;
    return typeof navigator !== "undefined" && navigator.language?.startsWith("ar") ? "ar" : "en";
  });
  const t = dict[lang] as unknown as Dict;

  const [content, setContentState] = useState<SiteContent>(() => loadContent());
  const setContent = useCallback((c: SiteContent) => { setContentState(c); saveContent(c); }, []);

  const [view, setView] = useState<"home" | "portal" | "success" | "failed" | "pending">("home");
  const [authView, setAuthView] = useState<"none" | "login" | "signup" | "admin">("none");
  const [user, setUser] = useState<User | null>(null);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [activeCase, setActiveCase] = useState<ProjectItem | null>(null);
  const [activeService, setActiveService] = useState<{ s: ServiceItem; i: number } | null>(null);

  const setLang = useCallback((n: Lang) => {
    setLangState(n);
    try { localStorage.setItem("nexora_lang", n); } catch { /* unavailable */ }
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang; html.dir = t.dir; html.style.scrollBehavior = "smooth";
    document.title = lang === "ar" ? "نكسورا | وكالة رقمية متميزة" : "NEXORA | Premium Digital Agency";
    const d = document.querySelector("meta[name='description']") ?? document.head.appendChild(Object.assign(document.createElement("meta"), { name: "description" }));
    d.setAttribute("content", lang === "ar" ? "نكسورا تبني مواقع ومتاجر وتطبيقات ويب وحلول ذكاء اصطناعي وهوية بصرية وتحسين محركات بحث للشركات النامية." : "NEXORA builds premium websites, e-commerce, web applications, AI solutions, branding and SEO for growing businesses.");
  }, [lang, t.dir]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 4500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const items: Array<[string, string]> = [["home", t.nav.home], ["services", t.nav.services], ["solutions", t.nav.solutions], ["portfolio", t.nav.portfolio], ["pricing", t.nav.pricing], ["about", t.nav.about], ["contact", t.nav.contact]];
  const go = (id: string) => { setMenu(false); setView("home"); window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 20); };
  const logout = () => { setUser(null); setAuthView("none"); setView("home"); };

  if (authView === "login") return <LoginPage t={t} lang={lang} onLogin={(u) => { setUser(u); setAuthView("admin"); }} onSwitchToSignup={() => setAuthView("signup")} onCancel={() => setAuthView("none")} />;
  if (authView === "signup") return <SignupPage t={t} onSwitchToLogin={() => setAuthView("login")} />;
  if (authView === "admin" && user) return <Suspense fallback={<SectionLoader />}><AdminDashboard content={content} setContent={setContent} onLogout={logout} onExit={() => setAuthView("none")} t={t} lang={lang} /></Suspense>;

  const chrome = <TopNav items={items} menu={menu} setMenu={setMenu} go={go} user={user} onLogout={logout} t={t} lang={lang} setLang={setLang} />;
  if (view === "portal") return <>{chrome}<CustomerPortal t={t} email={content.contact.email} onPay={() => setView("pending")} /></>;
  if (view !== "home") return <>{chrome}<PaymentStatus status={view} t={t} /></>;

  const shown = content.projects.filter((p) => p.featured);
  const visibleServices = content.services.filter((s) => s.visible !== false);

  return (
    <div id="home" className="min-h-screen overflow-hidden bg-slate-950 text-white selection:bg-cyan-200 selection:text-slate-950">
      <CustomCursor />
      {chrome}
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden pt-24 sm:pt-28 lg:min-h-screen">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(34,211,238,.18),transparent_32%),radial-gradient(circle_at_85%_15%,rgba(168,85,247,.2),transparent_28%),linear-gradient(180deg,#020617_0%,#07111f_55%,#020617_100%)]" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.25)_1px,transparent_1px)] [background-size:44px_44px] sm:[background-size:72px_72px]" />
          <div className="safe-x relative mx-auto grid max-w-[1800px] items-center gap-6 px-4 sm:gap-8 sm:px-6 lg:min-h-[calc(100vh-7rem)] lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] lg:px-10 xl:px-16">
            <div className="z-10 max-w-3xl pb-6 pt-6 sm:pt-10 lg:pb-24">
              <p className="mb-4 text-[clamp(2.5rem,11vw,6rem)] font-black leading-[0.95] tracking-[-0.08em] text-white sm:mb-6" dir="ltr">NEXORA</p>
              <h1 className="text-[clamp(1.85rem,6vw,4.5rem)] font-semibold leading-[1.15] tracking-tight text-white">{bi(content.hero.title, lang)}</h1>
              <p className="mt-5 max-w-2xl text-[clamp(1rem,2.2vw,1.25rem)] leading-relaxed text-slate-300 sm:mt-6">{bi(content.hero.sub, lang)}</p>
              <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:gap-4">
                <a className="magnetic rounded-full bg-white px-6 py-3.5 text-center font-bold text-slate-950 transition hover:bg-cyan-200 sm:px-7 sm:py-4" href="#contact">{t.cta.start}</a>
                <a className="rounded-full border border-white/20 px-6 py-3.5 text-center font-bold text-white transition hover:border-cyan-200 hover:bg-white/10 sm:px-7 sm:py-4" href="#portfolio">{t.cta.explore}</a>
              </div>
            </div>
            <HeroVisual t={t} />
          </div>
        </section>

        {/* STATS */}
        <section className="border-y border-white/10 bg-white/[0.03] py-8 sm:py-10">
          <div className="safe-x shell grid grid-cols-2 gap-x-4 gap-y-7 px-4 sm:gap-6 md:grid-cols-4 md:px-8">
            {content.stats.map((s) => (
              <div key={s.id} className="text-center">
                <p className="text-[clamp(2rem,7vw,3.75rem)] font-black leading-none text-white"><AnimatedNumber value={s.value} suffix={s.suffix} lang={lang} /></p>
                <p className="mt-2 text-[0.68rem] uppercase tracking-[0.18em] text-slate-400 sm:text-sm">{bi(s.label, lang)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SERVICES */}
        <section id="services" className="section-pad safe-x">
          <div className="shell">
            <SectionTitle label={t.services.label} title={t.services.title} copy={t.services.copy} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {visibleServices.map((s, i) => {
                const badge = bi(s.badge ?? { en: "", ar: "" }, lang).trim();
                const pts = highlightLines(s.highlights, lang).slice(0, 3);
                return (
                  <article key={s.id} className="service-card group relative flex flex-col rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl transition duration-300 hover:-translate-y-2 hover:border-cyan-300/40 hover:bg-white/[0.08] hover:shadow-2xl hover:shadow-cyan-950/50 sm:rounded-[2rem] sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <ServiceBadge accent={s.accent} icon={s.icon} />
                      <span className="text-xs font-black text-slate-600" dir="ltr">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    {badge ? (
                      <span className="mt-4 w-fit rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[0.7rem] font-bold text-cyan-200">{badge}</span>
                    ) : null}
                    <h3 className="mt-4 text-xl font-bold sm:text-2xl">{bi(s.name, lang)}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{bi(s.blurb, lang)}</p>
                    {pts.length ? (
                      <ul className="mt-4 space-y-1.5">
                        {pts.map((p) => (
                          <li key={p} className="flex items-start gap-2 text-[0.83rem] leading-5 text-slate-300">
                            <span aria-hidden="true" className="mt-0.5 text-emerald-300">✓</span><span className="flex-1">{p}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-auto pt-4">
                      {bi(s.price, lang) ? <p className="font-semibold text-cyan-200">{bi(s.price, lang)}</p> : <p className="text-slate-500">{t.services.customScope}</p>}
                      <button onClick={() => setActiveService({ s, i })} className="mt-4 inline-block text-sm font-bold text-white underline decoration-cyan-300/40 underline-offset-8 transition group-hover:text-cyan-200">{t.cta.exploreService}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* SOLUTIONS */}
        <section id="solutions" className="section-pad safe-x">
          <div className="shell">
            <SectionTitle label={t.solutions.label} title={t.solutions.title} copy={t.solutions.copy} />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-300/10 to-transparent p-6 sm:rounded-[2rem] sm:p-8">
                <h3 className="text-xl font-bold sm:text-2xl">{t.solutions.pay}</h3>
                <p className="mt-4 text-slate-300">{t.solutions.payCopy}</p>
                <div className="mt-6 flex flex-wrap gap-2 sm:gap-3">
                  <button onClick={() => setView("success")} className="rounded-full bg-white px-4 py-2.5 text-sm font-bold text-slate-950">{t.solutions.success}</button>
                  <button onClick={() => setView("pending")} className="rounded-full border border-white/20 px-4 py-2.5 text-sm">{t.solutions.pending}</button>
                  <button onClick={() => setView("failed")} className="rounded-full border border-white/20 px-4 py-2.5 text-sm">{t.solutions.failed}</button>
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 sm:rounded-[2rem] sm:p-8">
                <h3 className="text-xl font-bold sm:text-2xl">{t.solutions.auth}</h3>
                <p className="mt-4 text-slate-300">{t.solutions.authCopy}</p>
                <button onClick={() => setView("portal")} className="mt-6 rounded-full bg-cyan-200 px-5 py-3 font-bold text-slate-950">{t.solutions.openPortal}</button>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 sm:rounded-[2rem] sm:p-8 md:col-span-2 lg:col-span-1">
                <h3 className="text-xl font-bold sm:text-2xl">{t.solutions.admin}</h3>
                <p className="mt-4 text-slate-300">{t.solutions.adminCopy}</p>
                <p className="mt-6 text-xs text-slate-500">{t.solutions.adminNote}</p>
              </div>
            </div>
          </div>
        </section>

        {/* QUOTE BUILDER */}
        <section id="pricing" className="section-pad safe-x">
          <div className="shell">
            <SectionTitle label={t.builder.label} title={t.builder.title} copy={t.builder.copy} />
            <QuoteBuilder content={content} t={t} lang={lang} />
          </div>
        </section>

        {/* TIERS */}
        <section className="section-pad safe-x">
          <div className="shell">
            <SectionTitle label={t.tiers.label} title={t.tiers.title} />
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
              {content.tiers.map((tier) => (
                <div key={tier.id} className={`flex flex-col rounded-3xl border p-6 sm:rounded-[2rem] sm:p-7 ${tier.highlight ? "border-cyan-300/50 bg-cyan-300/10 shadow-2xl shadow-cyan-950/50" : "border-white/10 bg-white/[0.05]"}`}>
                  <p className="text-xs font-bold tracking-[0.25em] text-cyan-200 sm:text-sm" dir="ltr">{tier.name}</p>
                  <h3 className="mt-5 text-[clamp(1.4rem,4.5vw,2rem)] font-black sm:mt-6">{bi(tier.price, lang)}</h3>
                  <p className="mt-4 flex-1 text-slate-300">{bi(tier.desc, lang)}</p>
                  {isCustomPrice(tier) ? (
                    <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#1877F2] px-5 py-3 font-bold text-white transition hover:brightness-110 sm:mt-7">
                      <FacebookIcon />{lang === "ar" ? "تواصل معنا" : "Contact us"}
                    </a>
                  ) : (
                    <a href="#contact" className="mt-6 inline-flex justify-center rounded-full border border-white/20 px-5 py-3 font-bold transition hover:bg-white hover:text-slate-950 sm:mt-7">{t.cta.quote}</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PORTFOLIO */}
        <section id="portfolio" className="section-pad safe-x">
          <div className="shell">
            <SectionTitle label={t.portfolio.label} title={t.portfolio.title} copy={t.portfolio.copy} />
            <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
              {shown.map((p) => (
                <article key={p.id} className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.05] transition duration-300 hover:border-cyan-300/40 sm:rounded-[2rem]">
                  <div className="relative aspect-[16/10] overflow-hidden sm:aspect-[16/9]">
                    {p.image
                      ? <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      : <div className="h-full w-full bg-gradient-to-br from-cyan-300/30 via-fuchsia-400/10 to-slate-950" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                    {p.url ? <span className="absolute end-4 top-4 rounded-full bg-emerald-400/90 px-3 py-1 text-xs font-bold text-slate-950">{lang === "ar" ? "مباشر" : "LIVE"}</span> : null}
                  </div>
                  <div className="flex flex-1 flex-col p-5 sm:p-7">
                    <p className="text-sm text-cyan-200">{bi(p.industry, lang)}</p>
                    <h3 className="mt-1.5 text-[clamp(1.4rem,4vw,1.875rem)] font-bold" dir="ltr">{p.name}</h3>
                    <p className="mt-3 font-medium text-emerald-300">{bi(p.result, lang)}</p>
                    <p className="mt-3 text-sm text-slate-400">{bi(p.services, lang)}</p>
                    <p className="mt-1.5 text-sm text-slate-500" dir="ltr">{p.tech}</p>
                    <blockquote className="mt-5 flex-1 border-s-2 border-cyan-300 ps-4 text-slate-300">
                      “{bi(p.quote, lang)}”
                      <footer className="mt-2 text-sm text-slate-500">— {bi(p.author, lang)}</footer>
                    </blockquote>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <button onClick={() => setActiveCase(p)} className="rounded-full bg-white px-5 py-3 font-bold text-slate-950">{t.cta.viewCase}</button>
                      {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-cyan-300/40 px-5 py-3 font-bold text-cyan-200 transition hover:bg-cyan-300/10">{lang === "ar" ? "زيارة الموقع ↗" : "Visit site ↗"}</a> : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* SOCIAL PACKAGES */}
        <section className="section-pad safe-x">
          <div className="shell">
            <SectionTitle label={t.social.label} title={t.social.title} copy={t.social.copy} />
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
              {["BASIC", "GROWTH", "PREMIUM", "CUSTOM"].map((pkg, i) => (
                <div key={pkg} className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.05] p-6 sm:rounded-[2rem] sm:p-7">
                  <h3 className="text-xl font-black sm:text-2xl" dir="ltr">{pkg}</h3>
                  <p className="mt-3 text-cyan-200">{i === 3 ? t.social.customPrice : `${t.social.from} ${fmtMoney((i + 1) * 6500, lang)}${t.social.perMonth}`}</p>
                  <p className="mt-4 flex-1 text-slate-300">{fmtNum(i + 1, lang)} {t.social.deliver}</p>
                  {i === 3 ? (
                    <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#1877F2] px-5 py-3 text-sm font-bold text-white transition hover:brightness-110">
                      <FacebookIcon />{lang === "ar" ? "تواصل معنا" : "Contact us"}
                    </a>
                  ) : (
                    <a href="#contact" className="mt-6 inline-flex justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-bold transition hover:bg-white hover:text-slate-950">{t.cta.quote}</a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROCESS */}
        <section className="section-pad safe-x">
          <div className="shell max-w-4xl">
            <SectionTitle label={t.process.label} title={t.process.title} />
            <ol className="relative ms-4 space-y-10 border-s border-cyan-300/30 ps-8 sm:ms-5 sm:ps-10">
              {t.process.steps.map((step, i) => (
                <li key={step} className="timeline-item relative">
                  <span aria-hidden="true" className="timeline-badge absolute top-0 flex h-9 w-9 items-center justify-center rounded-full bg-cyan-200 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/20">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="text-xl font-bold sm:text-2xl">{step}</h3>
                  <p className="mt-2 text-slate-300">{t.process.desc[i]}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* TECH */}
        <section className="section-pad safe-x">
          <div className="shell">
            <SectionTitle label={t.techs.label} title={t.techs.title} />
            <div className="tech-cloud" dir="ltr">{techs.map((i, k) => <span key={i} style={{ animationDelay: `${k * .08}s` }} className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-xs text-slate-200 backdrop-blur-xl sm:px-5 sm:py-3 sm:text-sm">{i}</span>)}</div>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" className="section-pad safe-x">
          <div className="shell max-w-4xl text-center">
            <p className="text-cyan-200">{t.about.label}</p>
            <h2 className="mt-4 text-[clamp(1.9rem,6vw,3.75rem)] font-black leading-tight tracking-tight">{bi(content.about.title, lang)}</h2>
            <p className="mt-6 text-[clamp(1rem,2.2vw,1.125rem)] leading-relaxed text-slate-300">{bi(content.about.copy, lang)}</p>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="section-pad safe-x">
          <div className="shell grid gap-8 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
            <div>
              <p className="text-cyan-200">{t.contact.label}</p>
              <h2 className="mt-4 text-[clamp(1.9rem,6vw,3.75rem)] font-black leading-tight">{t.contact.title}</h2>
              <div className="mt-8 space-y-3 text-slate-300 sm:space-y-4">
                <p>{t.contact.email}: <a className="underline decoration-cyan-300/40 underline-offset-4" href={`mailto:${content.contact.email}`} dir="ltr">{content.contact.email}</a></p>
                <p>{t.contact.whatsapp}: <a className="underline decoration-cyan-300/40 underline-offset-4" href={`tel:${content.contact.phone.replace(/\s/g, "")}`} dir="ltr">{content.contact.phone}</a></p>
                <p>{t.contact.hours}: {bi(content.contact.hours, lang)}</p>
                <p>{t.contact.location}: {bi(content.contact.location, lang)}</p>
                <p>{lang === "ar" ? "فيسبوك" : "Facebook"}: <a className="underline decoration-cyan-300/40 underline-offset-4" href={content.contact.facebook} target="_blank" rel="noopener noreferrer" dir="ltr">{content.contact.facebook.replace("https://www.", "")}</a></p>
              </div>
            </div>
            <ContactForm t={t} onSubmit={(id) => setToast(t.contact.received(id))} />
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="safe-x border-t border-white/10 px-4 py-12 sm:py-16 md:px-8">
        <div className="shell grid gap-9 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] md:gap-10">
          <div>
            <h2 className="text-[clamp(2.25rem,8vw,3rem)] font-black tracking-[-0.08em]" dir="ltr">NEXORA</h2>
            <p className="mt-4 text-lg text-slate-300 sm:text-xl">{t.footer.tagline}</p>
          </div>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            <div>
              <h3 className="font-bold text-white">{t.footer.cols.nav}</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-400">
                {items.slice(0, 4).map(([id, l]) => <button key={id} onClick={() => go(id)} className="block text-start hover:text-white">{l}</button>)}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-white">{t.footer.cols.services}</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-400">
                {visibleServices.slice(0, 4).map((s) => <button key={s.id} onClick={() => go("services")} className="block text-start hover:text-white">{bi(s.name, lang)}</button>)}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-white">{t.footer.cols.social}</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-400" dir="ltr">
                <a href={content.contact.linkedin} target="_blank" rel="noopener noreferrer" className="block hover:text-white">LinkedIn</a>
                <a href={content.contact.instagram} target="_blank" rel="noopener noreferrer" className="block hover:text-white">Instagram</a>
                <a href={content.contact.behance} target="_blank" rel="noopener noreferrer" className="block hover:text-white">Behance</a>
                <a href={content.contact.facebook} target="_blank" rel="noopener noreferrer" className="block hover:text-white">Facebook</a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar — admin entry lives here, at the very bottom */}
        <div className="shell mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-center text-xs text-slate-500 sm:text-start">{t.footer.copyright}</p>
          <button
            onClick={() => setAuthView("login")}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-slate-500 transition hover:border-cyan-300/40 hover:text-cyan-300"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {lang === "ar" ? "لوحة الإدارة" : "Admin Panel"}
          </button>
        </div>
      </footer>

      {toast ? <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-2xl border border-cyan-300/30 bg-slate-950/95 p-4 text-center text-cyan-100 shadow-2xl backdrop-blur-xl">{toast}</div> : null}
      {activeCase ? <CaseStudy p={activeCase} onClose={() => setActiveCase(null)} t={t} lang={lang} /> : null}
      {activeService ? <ServiceModal s={activeService.s} index={activeService.i} onClose={() => setActiveService(null)} t={t} lang={lang} /> : null}
    </div>
  );
}

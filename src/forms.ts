export type FormSubmission = {
  id: string;
  createdAt: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  business: string;
  service: string;
  budget: string;
  deadline: string;
  description: string;
  references: string;
  features: string;
  read?: boolean;
};

const KEY = "nexora_forms";

export function loadSubmissions(): FormSubmission[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveSubmission(data: Omit<FormSubmission, "id" | "createdAt" | "read">): FormSubmission {
  const entry: FormSubmission = {
    id: `NX-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`,
    createdAt: new Date().toISOString(),
    read: false,
    ...data,
  };
  const all = loadSubmissions();
  all.unshift(entry);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    // also dispatch event for admin live update
    window.dispatchEvent(new CustomEvent("nexora:forms-updated"));
  } catch {
    /* quota */
  }
  return entry;
}

export function deleteSubmission(id: string): void {
  const all = loadSubmissions().filter((x) => x.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent("nexora:forms-updated"));
  } catch {}
}

export function setSubmissionRead(id: string, read: boolean): void {
  const all = loadSubmissions().map((x) => (x.id === id ? { ...x, read } : x));
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent("nexora:forms-updated"));
  } catch {}
}

export function markAllRead(): void {
  const all = loadSubmissions().map((x) => ({ ...x, read: true }));
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent("nexora:forms-updated"));
  } catch {}
}

export function clearSubmissions(): void {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent("nexora:forms-updated"));
  } catch {}
}

export function exportCSV(submissions: FormSubmission[]): string {
  const headers = ["id","createdAt","name","company","email","phone","business","service","budget","deadline","description","references","features"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = submissions.map(s => headers.map(h => esc((s as unknown as Record<string, unknown>)[h])).join(","));
  return [headers.join(","), ...rows].join("\n");
}

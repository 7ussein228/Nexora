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

export function saveSubmission(data: Omit<FormSubmission, "id" | "createdAt">): FormSubmission {
  const entry: FormSubmission = {
    id: `NX-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`,
    createdAt: new Date().toISOString(),
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

export function clearSubmissions(): void {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent("nexora:forms-updated"));
  } catch {}
}

export function exportCSV(submissions: FormSubmission[]): string {
  const headers = ["id","createdAt","name","company","email","phone","business","service","budget","deadline","description","references","features"];
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = submissions.map(s => headers.map(h => esc((s as Record<string,string>)[h] || "")).join(","));
  return [headers.join(","), ...rows].join("\n");
}

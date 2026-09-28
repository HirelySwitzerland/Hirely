"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  BarChart3, Bell, Briefcase, CalendarClock, ChevronsUpDown, LayoutDashboard, Library, LogOut, Menu, Plug, Search, Settings, Sparkles, Users, Workflow, X, Send, Loader2, ArrowUpRight, Copy,
} from "lucide-react";
import { Avatar, Logo } from "./ui";
import { cn, ago } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };
const ICONS = { dashboard: LayoutDashboard, jobs: Briefcase, candidates: Users, interviews: CalendarClock, pool: Library, analytics: BarChart3, automations: Workflow, integrations: Plug, settings: Settings };

function isActive(pathname: string, href: string) {
  return href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({ items, orgName, orgs, currentOrgId, switchAction, footer }: { items: NavItem[]; orgName: string; orgs: { id: string; name: string }[]; currentOrgId: string; switchAction: (fd: FormData) => void; footer?: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/app"><Logo /></Link>
        <button className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <OrgSwitcher orgName={orgName} orgs={orgs} currentOrgId={currentOrgId} switchAction={switchAction} />
      <div className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {items.map((it) => {
          const Icon = ICONS[it.icon];
          const active = isActive(pathname, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-[14px] font-medium transition",
                active ? "bg-white text-ink shadow-card ring-1 ring-slate-200" : "text-slate-600 hover:bg-white/70 hover:text-ink",
              )}
            >
              <Icon className={cn("h-[18px] w-[18px]", active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600")} />
              <span className="flex-1">{it.label}</span>
              {it.badge ? <span className="rounded-full bg-brand-600 px-1.5 py-px text-[11px] font-semibold text-white">{it.badge}</span> : null}
            </Link>
          );
        })}
      </div>
      {footer && <div className="border-t border-slate-200/80 p-3">{footer}</div>}
    </nav>
  );
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200/80 bg-slate-50 lg:block">{nav}</aside>
      <button className="fixed left-3 top-3 z-40 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-slate-50 shadow-pop">{nav}</aside>
        </div>
      )}
    </>
  );
}

function OrgSwitcher({ orgName, orgs, currentOrgId, switchAction }: { orgName: string; orgs: { id: string; name: string }[]; currentOrgId: string; switchAction: (fd: FormData) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative px-3">
      <button onClick={() => orgs.length > 1 && setOpen((o) => !o)} className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left shadow-sm">
        <Avatar name={orgName} size={24} className="rounded-md" />
        <span className="flex-1 truncate text-[13px] font-semibold text-ink">{orgName}</span>
        {orgs.length > 1 && <ChevronsUpDown className="h-4 w-4 text-slate-400" />}
      </button>
      {open && (
        <div className="absolute left-3 right-3 top-full z-10 mt-1 rounded-lg border border-slate-200 bg-white p-1 shadow-pop">
          {orgs.map((o) => (
            <form key={o.id} action={switchAction}>
              <input type="hidden" name="orgId" value={o.id} />
              <button className={cn("w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-slate-50", o.id === currentOrgId && "font-semibold text-brand-700")}>{o.name}</button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}

export function MobileTabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const pick = items.filter((i) => ["dashboard", "candidates", "interviews", "jobs"].includes(i.icon)).slice(0, 4);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {pick.map((it) => {
        const Icon = ICONS[it.icon];
        const active = isActive(pathname, it.href);
        return (
          <Link key={it.href} href={it.href} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-brand-600" : "text-slate-500")}>
            <Icon className="h-5 w-5" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function GlobalSearch() {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <form
      className="relative hidden w-full max-w-md md:block"
      onSubmit={(e) => {
        e.preventDefault();
        const q = ref.current?.value.trim();
        if (q) router.push(`/app/candidates?q=${encodeURIComponent(q)}`);
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input ref={ref} className="input h-9 pl-9 pr-14" placeholder="Search candidates, skills, jobs…" aria-label="Search" />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">⌘K</span>
    </form>
  );
}

type Notif = { id: string; title: string; body?: string | null; link?: string | null; severity: string; readAt: string | null; createdAt: string };

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { items: Notif[]; unread: number };
      setItems(d.items);
      setUnread(d.unread);
    } catch {
      /* offline — keep last state */
    }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);
  const markAll = async () => {
    await fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ all: true }) });
    load();
  };
  const dot: Record<string, string> = { error: "bg-rose-500", warning: "bg-amber-500", success: "bg-emerald-500", info: "bg-brand-500" };
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-ink" aria-label={`Notifications (${unread} unread)`}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-ink">Notifications</p>
              <button onClick={markAll} className="text-xs font-medium text-brand-600 hover:underline">Mark all read</button>
            </div>
            <div className="scrollbar-thin max-h-[420px] overflow-y-auto">
              {items.length === 0 && <p className="px-4 py-10 text-center text-sm text-slate-500">You're all caught up.</p>}
              {items.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "/app/notifications"}
                  onClick={async () => {
                    setOpen(false);
                    if (!n.readAt) await fetch("/api/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: n.id }) });
                    load();
                  }}
                  className={cn("flex gap-3 border-b border-slate-50 px-4 py-3 hover:bg-slate-50", !n.readAt && "bg-brand-50/40")}
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-slate-200" : dot[n.severity] ?? dot.info)} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-ink">{n.title}</span>
                    {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{n.body}</span>}
                    <span className="mt-1 block text-[11px] text-slate-400">{ago(n.createdAt)}</span>
                  </span>
                </Link>
              ))}
            </div>
            <Link href="/app/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-2.5 text-center text-xs font-medium text-slate-600 hover:bg-slate-50">
              View all notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export function UserMenu({ name, email, role, logoutAction }: { name: string; email: string; role: string; logoutAction: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100" aria-label="Account menu">
        <Avatar name={name} size={30} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-pop">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold text-ink">{name}</p>
              <p className="truncate text-xs text-slate-500">{email}</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-brand-600">{role.replace("_", " ")}</p>
            </div>
            <div className="my-1 h-px bg-slate-100" />
            <Link href="/app/settings/profile" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Profile & security</Link>
            <Link href="/app/notifications" onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">Notifications</Link>
            <form action={logoutAction}>
              <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────── AI assistant panel ───────────────

type Item = { title: string; subtitle?: string; href?: string; badge?: string };
type Reply = { text: string; items?: Item[]; draft?: { subject?: string; body: string }; suggestions?: string[] };
type Msg = { role: "user" | "assistant"; text: string; reply?: Reply };

export function AssistantButton({ suggestions }: { suggestions: string[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
        <Sparkles className="h-4 w-4 text-brand-600" />
        <span className="hidden sm:inline">Ask Hirely</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/20" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="flex items-center gap-2 font-semibold text-ink"><Sparkles className="h-4 w-4 text-brand-600" />Recruiter assistant</p>
                <p className="text-xs text-slate-500">Answers use only data you have access to. It suggests — you decide.</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close assistant"><X className="h-5 w-5" /></button>
            </div>
            <AssistantChat suggestions={suggestions} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

export function AssistantChat({ suggestions, onNavigate }: { suggestions: string[]; onNavigate?: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs, busy]);
  const ask = async (q: string) => {
    if (!q.trim() || busy) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q }) });
      const d = (await r.json()) as Reply & { error?: string };
      setMsgs((m) => [...m, { role: "assistant", text: d.error ?? d.text, reply: d.error ? undefined : d }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "The assistant is unreachable right now. Please try again." }]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {msgs.length === 0 && (
          <div>
            <p className="text-sm text-slate-600">Try asking:</p>
            <div className="mt-3 flex flex-col gap-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => ask(s)} className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:border-brand-300 hover:bg-brand-50/50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2 text-sm text-white">{m.text}</div>
          ) : (
            <div key={i} className="max-w-[95%] space-y-2">
              <p className="text-sm leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: escapeMd(m.text) }} />
              {m.reply?.items && m.reply.items.length > 0 && (
                <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                  {m.reply.items.map((it, j) => {
                    const inner = (
                      <div className="flex items-start justify-between gap-3 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-ink">{it.title}</p>
                          {it.subtitle && <p className="mt-0.5 text-xs text-slate-500">{it.subtitle}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {it.badge && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{it.badge}</span>}
                          {it.href && <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />}
                        </div>
                      </div>
                    );
                    return it.href ? (
                      <Link key={j} href={it.href} onClick={onNavigate} className="block hover:bg-slate-50">{inner}</Link>
                    ) : (
                      <div key={j}>{inner}</div>
                    );
                  })}
                </div>
              )}
              {m.reply?.draft && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Draft</p>
                    <button onClick={() => navigator.clipboard.writeText(`${m.reply?.draft?.subject ? `Subject: ${m.reply.draft.subject}\n\n` : ""}${m.reply?.draft?.body}`)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600"><Copy className="h-3 w-3" />Copy</button>
                  </div>
                  {m.reply.draft.subject && <p className="mb-2 text-sm font-medium text-ink">{m.reply.draft.subject}</p>}
                  <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-slate-700">{m.reply.draft.body}</pre>
                </div>
              )}
              {m.reply?.suggestions && (
                <div className="flex flex-wrap gap-1.5">
                  {m.reply.suggestions.map((s) => (
                    <button key={s} onClick={() => ask(s)} className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50">{s}</button>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
        {busy && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        <div ref={endRef} />
      </div>
      <form
        className="flex gap-2 border-t border-slate-100 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} className="input" placeholder="Ask about candidates, interviews, jobs…" aria-label="Ask the assistant" />
        <button className="inline-flex h-9 w-10 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50" disabled={busy || !input.trim()} aria-label="Send">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </>
  );
}

function escapeMd(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");
}

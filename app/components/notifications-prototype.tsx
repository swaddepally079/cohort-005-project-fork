// PROTOTYPE — throwaway. Answers "What do Notifications look like in Cadence?"
// Three variants of where the bell sits and how Notifications open, switchable
// via ?variant=A|B|C. Fake, in-memory Notifications built from the six events
// decided in "Which events become Notifications, and for whom?". No Novu, no DB.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { Bell, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { UserRole } from "~/db/schema";

// ─── Fake data ───

export type ProtoNotification = {
  id: string;
  title: string;
  body?: string;
  href: string;
  minutesAgo: number;
  read: boolean;
};

type Who = { id: number; role: UserRole; isTeamAdmin: boolean };

function seed(who: Who): ProtoNotification[] {
  const n: Omit<ProtoNotification, "id">[] = [];
  if (who.role === UserRole.Admin) {
    n.push(
      { title: "New Refund Request", body: "Priya Shah asked for a refund on “TypeScript Foundations”: “The pace was too fast for me.”", href: "/admin/refunds", minutesAgo: 4, read: false },
      { title: "New Refund Request", body: "Acme Ltd (Team Licence, 10 Seats) asked for a refund on “React in Depth”.", href: "/admin/refunds", minutesAgo: 95, read: false },
      { title: "New Refund Request", body: "Marco Ruiz asked for a refund on “SQL for Humans”.", href: "/admin/refunds", minutesAgo: 60 * 26, read: true }
    );
  }
  if (who.role === UserRole.Instructor) {
    n.push(
      { title: "New comment on “Generics, gently”", body: "Sam Lee: “Why does the constraint go before the default here?”", href: "/instructor/questions", minutesAgo: 12, read: false },
      { title: "New comment on “Narrowing”", body: "Ada Obi: “Is `in` narrowing the same as a type guard?”", href: "/instructor/questions", minutesAgo: 180, read: false },
      { title: "Reply to your comment on “Intro”", body: "Sam Lee: “Thanks, that cleared it up!”", href: "/instructor/questions", minutesAgo: 60 * 30, read: true }
    );
  }
  if (who.role === UserRole.Student) {
    n.push(
      { title: "Reply to your comment on “Generics, gently”", body: "Instructor: “Constraints come first so the default can satisfy them.”", href: "/dashboard", minutesAgo: 8, read: false },
      { title: "Refund Request declined", body: "“SQL for Humans”: “You've watched past the Watch Limit, so we can't refund this course.”", href: "/dashboard", minutesAgo: 60 * 5, read: false },
      { title: "Refund Request approved", body: "“CSS Layout” — your full payment is being returned.", href: "/dashboard", minutesAgo: 60 * 50, read: true }
    );
  }
  if (who.isTeamAdmin) {
    n.push(
      { title: "Seat claimed", body: "Jo Park claimed a Seat on your Team Licence for “React in Depth” (7 of 10 claimed).", href: "/team", minutesAgo: 30, read: false },
      { title: "Seat claimed", body: "Li Wei claimed a Seat on your Team Licence for “React in Depth”.", href: "/team", minutesAgo: 60 * 28, read: true }
    );
  }
  return n
    .sort((a, b) => a.minutesAgo - b.minutesAgo)
    .map((x, i) => ({ ...x, id: `${who.id}-${i}` }));
}

// In-memory store, per user, survives client navigation, wiped on reload.
const store = new Map<number, ProtoNotification[]>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useProtoNotifications(who: Who | null) {
  const list = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => (who ? (store.get(who.id) ?? EMPTY) : EMPTY),
    () => EMPTY
  );
  useEffect(() => {
    if (who && !store.has(who.id)) {
      store.set(who.id, seed(who));
      emit();
    }
  }, [who?.id]);
  const set = (fn: (l: ProtoNotification[]) => ProtoNotification[]) => {
    if (!who) return;
    store.set(who.id, fn(store.get(who.id) ?? []));
    emit();
  };
  return {
    list,
    unread: list.filter((n) => !n.read).length,
    markRead: (id: string) => set((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n))),
    markAllRead: () => set((l) => l.map((n) => ({ ...n, read: true }))),
  };
}
const EMPTY: ProtoNotification[] = [];

function ago(m: number) {
  if (m < 60) return `${m}m ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 60 / 24)}d ago`;
}

export function useVariant() {
  const [params] = useSearchParams();
  const v = params.get("variant");
  return v === "B" || v === "C" ? v : "A";
}

// Keep ?variant= on links so the choice survives navigation.
function useWithVariant() {
  const variant = useVariant();
  return (href: string) => `${href}${href.includes("?") ? "&" : "?"}variant=${variant}`;
}

function Badge({ count, className }: { count: number; className?: string }) {
  if (count === 0) return null;
  return (
    <span className={cn("flex min-w-4 h-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground", className)}>
      {count > 9 ? "9+" : count}
    </span>
  );
}

function Row({ n, onOpen, dense }: { n: ProtoNotification; onOpen: () => void; dense?: boolean }) {
  return (
    <button
      onClick={onOpen}
      className={cn(
        "flex w-full gap-3 text-left transition-colors hover:bg-accent",
        dense ? "px-3 py-2.5" : "px-4 py-3",
        !n.read && "bg-primary/5"
      )}
    >
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} />
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm", n.read ? "text-muted-foreground" : "font-medium")}>{n.title}</span>
        {n.body && <span className={cn("block text-xs text-muted-foreground", dense && "line-clamp-2")}>{n.body}</span>}
        <span className="mt-0.5 block text-[11px] text-muted-foreground/70">{ago(n.minutesAgo)}</span>
      </span>
    </button>
  );
}

// Clicking a Notification: mark it read, go to its subject.
function useOpen(markRead: (id: string) => void, after?: () => void) {
  const navigate = useNavigate();
  const withVariant = useWithVariant();
  return (n: ProtoNotification) => {
    markRead(n.id);
    after?.();
    navigate(withVariant(n.href));
  };
}

// ─── Variant A: bell in the sidebar header, dropdown ───

export function VariantABell({ who }: { who: Who | null }) {
  const { list, unread, markRead, markAllRead } = useProtoNotifications(who);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const openN = useOpen(markRead, () => setOpen(false));
  const withVariant = useWithVariant();
  useEffect(() => {
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);
  if (!who) return null;
  return (
    <div ref={ref} className="relative ml-auto">
      <button onClick={() => setOpen((o) => !o)} title="Notifications" className="relative rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent">
        <Bell className="size-4" />
        <Badge count={unread} className="absolute -right-1 -top-1" />
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-50 w-80 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground">Mark all read</button>
            )}
          </div>
          <div className="max-h-96 divide-y overflow-y-auto">
            {list.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</div>}
            {list.slice(0, 5).map((n) => <Row key={n.id} n={n} dense onOpen={() => openN(n)} />)}
          </div>
          <Link to={withVariant("/notifications-prototype")} onClick={() => setOpen(false)} className="block border-t px-3 py-2 text-center text-xs font-medium hover:bg-accent">
            See all Notifications
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Variant B: "Notifications" nav item with count, full inbox page ───

export function VariantBNavItem({ who }: { who: Who | null }) {
  const { unread } = useProtoNotifications(who);
  const withVariant = useWithVariant();
  const { pathname } = useLocation();
  if (!who) return null;
  const active = pathname === "/notifications-prototype";
  return (
    <Link
      to={withVariant("/notifications-prototype")}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Bell className="size-4" />
      Notifications
      <Badge count={unread} className="ml-auto" />
    </Link>
  );
}

export function InboxPage({ who }: { who: Who | null }) {
  const { list, unread, markRead, markAllRead } = useProtoNotifications(who);
  const [filter, setFilter] = useState<"unread" | "all">("all");
  const openN = useOpen(markRead);
  const shown = filter === "unread" ? list.filter((n) => !n.read) : list;
  if (!who) return <div className="p-8 text-sm text-muted-foreground">Select a user from the DevUI panel.</div>;
  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button onClick={markAllRead} disabled={unread === 0} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40">
          <Check className="size-4" /> Mark all read
        </button>
      </div>
      <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1 text-sm w-fit">
        {(["all", "unread"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn("rounded-md px-3 py-1 capitalize", filter === f && "bg-background shadow-sm")}>
            {f}{f === "unread" && unread > 0 ? ` (${unread})` : ""}
          </button>
        ))}
      </div>
      <div className="divide-y overflow-hidden rounded-lg border">
        {shown.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">Nothing here.</div>}
        {shown.map((n) => <Row key={n.id} n={n} onOpen={() => openN(n)} />)}
      </div>
    </div>
  );
}

// ─── Variant C: bell beside the user in the sidebar footer, slide-over drawer ───

export function VariantCFooterBell({ who }: { who: Who | null }) {
  const { list, unread, markRead, markAllRead } = useProtoNotifications(who);
  const [open, setOpen] = useState(false);
  const openN = useOpen(markRead, () => setOpen(false));
  if (!who) return null;
  const today = list.filter((n) => n.minutesAgo < 60 * 24);
  const earlier = list.filter((n) => n.minutesAgo >= 60 * 24);
  return (
    <>
      <button onClick={() => setOpen(true)} title="Notifications" className="relative rounded-md p-1 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
        <Bell className="size-4" />
        <Badge count={unread} className="absolute -right-1.5 -top-1.5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="flex h-full w-96 flex-col border-l bg-background shadow-xl">
            <div className="flex h-14 items-center justify-between border-b px-4">
              <span className="font-semibold">Notifications</span>
              <div className="flex items-center gap-3">
                {unread > 0 && <button onClick={markAllRead} className="text-xs text-muted-foreground hover:text-foreground">Mark all read</button>}
                <button onClick={() => setOpen(false)}><X className="size-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {[["Today", today], ["Earlier", earlier]].map(([label, items]) =>
                (items as ProtoNotification[]).length ? (
                  <section key={label as string}>
                    <div className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label as string}</div>
                    <div className="divide-y">{(items as ProtoNotification[]).map((n) => <Row key={n.id} n={n} onOpen={() => openN(n)} />)}</div>
                  </section>
                ) : null
              )}
              {list.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">You're all caught up.</div>}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

// ─── Floating switcher ───

const VARIANTS = [
  ["A", "Header bell + dropdown"],
  ["B", "Nav item + inbox page"],
  ["C", "Footer bell + drawer"],
] as const;

export function PrototypeSwitcher({ who }: { who: Who | null }) {
  const variant = useVariant();
  const [params, setParams] = useSearchParams();
  const { list, unread } = useProtoNotifications(who);
  const i = VARIANTS.findIndex(([k]) => k === variant);
  const go = (d: number) => {
    const next = new URLSearchParams(params);
    next.set("variant", VARIANTS[(i + d + VARIANTS.length) % VARIANTS.length][0]);
    setParams(next, { replace: true });
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  if (!import.meta.env.DEV) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-zinc-900 px-2 py-1.5 text-sm text-white shadow-lg ring-2 ring-fuchsia-500">
      <button onClick={() => go(-1)} className="rounded-full p-1 hover:bg-white/10"><ChevronLeft className="size-4" /></button>
      <span className="min-w-56 text-center">
        <b>{variant}</b> ({VARIANTS[i][1]})
        <span className="ml-2 text-xs text-white/60">{who ? `${unread} unread / ${list.length}` : "no user"}</span>
      </span>
      <button onClick={() => go(1)} className="rounded-full p-1 hover:bg-white/10"><ChevronRight className="size-4" /></button>
    </div>
  );
}

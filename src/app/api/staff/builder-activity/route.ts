import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { requireAdmin } from "@/lib/invoice-auth";
import { isPaid, type OrgBilling } from "@/lib/paystack";

export const dynamic = "force-dynamic";

interface Ev {
  id: number;
  created_at: string;
  event: string;
  organization_id: string | null;
  visitor_id: string | null;
  quiz_id: string | null;
  path: string | null;
  country: string | null;
  device: string | null;
  props: Record<string, unknown>;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

// Where a visit / sign-up came from, in plain words.
function sourceOf(p: Record<string, unknown>): string {
  const ft = (p.first_touch as Record<string, unknown>) || p;
  if (str(ft.utm_source)) return str(ft.utm_source).toLowerCase();
  if (ft.fbclid) return "facebook";
  const ref = str(ft.referrer);
  if (ref) {
    try {
      return new URL(ref).hostname.replace(/^www\./, "");
    } catch {
      return ref.slice(0, 40);
    }
  }
  return "direct";
}

// Staff-only view of the self-serve funnel: what visitors and owners are doing.
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const days = Math.min(Math.max(Number(new URL(request.url).searchParams.get("days")) || 7, 1), 365);
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  const supabase = createServiceClient();

  const { data: rows, error } = await supabase
    .from("builder_events")
    .select("id, created_at, event, organization_id, visitor_id, quiz_id, path, country, device, props")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const events = (rows || []) as Ev[];

  const distinct = (evs: Ev[], key: (e: Ev) => string | null) => new Set(evs.map(key).filter(Boolean)).size;
  const of = (...names: string[]) => events.filter((e) => names.includes(e.event));

  const funnel = [
    { step: "Visited a landing page", count: distinct(of("landing_view"), (e) => e.visitor_id) },
    { step: "Clicked a call-to-action", count: distinct(of("cta_click"), (e) => e.visitor_id) },
    { step: "Requested a sign-up code", count: distinct(of("code_requested").filter((e) => e.props.purpose !== "login"), (e) => str(e.props.email)) },
    { step: "Signed up", count: of("signed_up").length },
    { step: "Built a quiz", count: distinct(of("quiz_built"), (e) => e.organization_id) },
    { step: "Opened the preview", count: distinct(of("preview_opened"), (e) => e.organization_id) },
    { step: "Tried to go live", count: distinct(of("publish_blocked", "go_live_clicked", "paywall_shown"), (e) => e.organization_id) },
    { step: "Started checkout", count: distinct(of("checkout_started"), (e) => e.organization_id) },
    { step: "Paid", count: distinct(of("paid").filter((e) => e.props.self_serve), (e) => e.organization_id) },
  ];

  // Sources: visitors, sign-ups and payers per traffic source.
  const signups = of("signed_up");
  const paidOrgs = new Set(of("paid").map((e) => e.organization_id));
  const srcMap = new Map<string, { visitors: Set<string>; signups: number; paid: number }>();
  const bucket = (k: string) => {
    if (!srcMap.has(k)) srcMap.set(k, { visitors: new Set(), signups: 0, paid: 0 });
    return srcMap.get(k)!;
  };
  for (const e of of("landing_view")) if (e.visitor_id) bucket(sourceOf(e.props)).visitors.add(e.visitor_id);
  for (const e of signups) {
    const b = bucket(sourceOf(e.props));
    b.signups += 1;
    if (e.organization_id && paidOrgs.has(e.organization_id)) b.paid += 1;
  }
  const sources = Array.from(srcMap.entries())
    .map(([source, v]) => ({ source, visitors: v.visitors.size, signups: v.signups, paid: v.paid }))
    .sort((a, b) => b.visitors + b.signups * 10 - (a.visitors + a.signups * 10));

  // Landing pages: which industry pages pull visitors and sign-ups.
  const pageMap = new Map<string, { visitors: Set<string>; clicks: Set<string> }>();
  for (const e of of("landing_view", "cta_click")) {
    const page = str(e.props.page) || e.path || "?";
    if (!pageMap.has(page)) pageMap.set(page, { visitors: new Set(), clicks: new Set() });
    if (e.visitor_id) pageMap.get(page)![e.event === "landing_view" ? "visitors" : "clicks"].add(e.visitor_id);
  }
  const pages = Array.from(pageMap.entries())
    .map(([page, v]) => ({ page, visitors: v.visitors.size, clicked: v.clicks.size }))
    .sort((a, b) => b.visitors - a.visitors);

  // Accounts: every self-serve sign-up in the window, with progress.
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, email, signup_date, billing_tier, billing_status, current_period_end, last_paid_at, self_serve")
    .eq("self_serve", true)
    .gte("signup_date", since)
    .order("signup_date", { ascending: false })
    .limit(300);
  const orgIds = (orgs || []).map((o) => o.id);
  const nameById = new Map((orgs || []).map((o) => [o.id, o.name]));
  const [quizRes, editRes, leadRes] = orgIds.length
    ? await Promise.all([
        supabase.from("quizzes").select("organization_id, is_active").in("organization_id", orgIds).not("builder_config", "is", null),
        supabase.from("builder_credit_ledger").select("organization_id").in("organization_id", orgIds).eq("kind", "use").lt("credits", 0),
        supabase.from("quiz_responses").select("organization_id").in("organization_id", orgIds).not("completed_at", "is", null),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const tally = (list: { organization_id: string }[] | null) => {
    const m = new Map<string, number>();
    for (const r of list || []) m.set(r.organization_id, (m.get(r.organization_id) || 0) + 1);
    return m;
  };
  const quizzes = tally(quizRes.data as { organization_id: string }[]);
  const live = tally(((quizRes.data || []) as { organization_id: string; is_active: boolean }[]).filter((q) => q.is_active));
  const edits = tally(editRes.data as { organization_id: string }[]);
  const leads = tally(leadRes.data as { organization_id: string }[]);
  const lastSeen = new Map<string, string>();
  const signupSource = new Map<string, string>();
  for (const e of events) {
    if (e.organization_id && !lastSeen.has(e.organization_id)) lastSeen.set(e.organization_id, e.created_at);
    if (e.event === "signed_up" && e.organization_id) signupSource.set(e.organization_id, sourceOf(e.props));
  }
  const accounts = (orgs || []).map((o) => ({
    id: o.id,
    name: o.name,
    email: o.email,
    signedUp: o.signup_date,
    source: signupSource.get(o.id) || "unknown",
    quizzes: quizzes.get(o.id) || 0,
    live: live.get(o.id) || 0,
    edits: edits.get(o.id) || 0,
    leads: leads.get(o.id) || 0,
    paid: isPaid(o as OrgBilling),
    everPaid: !!o.last_paid_at,
    lastSeen: lastSeen.get(o.id) || o.signup_date,
  }));

  // Feed: the latest 100 events, readable.
  const extraIds = Array.from(new Set(events.slice(0, 100).map((e) => e.organization_id).filter((id): id is string => !!id && !nameById.has(id))));
  if (extraIds.length) {
    const { data: more } = await supabase.from("organizations").select("id, name").in("id", extraIds);
    for (const o of more || []) nameById.set(o.id, o.name);
  }
  const feed = events.slice(0, 100).map((e) => ({
    at: e.created_at,
    event: e.event,
    who: e.organization_id ? nameById.get(e.organization_id) || "Account" : e.visitor_id ? `Visitor ${e.visitor_id.slice(-5)}` : "Someone",
    detail: [
      str(e.props.page) && `page ${str(e.props.page)}`,
      str(e.props.where) && `via ${str(e.props.where)}`,
      str(e.props.email),
      e.event === "landing_view" ? sourceOf(e.props) : "",
      e.event === "signed_up" ? `from ${sourceOf(e.props)}` : "",
      typeof e.props.amount_naira === "number" ? `₦${(e.props.amount_naira as number).toLocaleString()}` : "",
      str(e.props.request),
      str(e.props.qualification),
    ]
      .filter(Boolean)
      .join(" · "),
    device: e.device,
    country: e.country,
  }));

  return NextResponse.json({ days, totalEvents: events.length, funnel, sources, pages, accounts, feed });
}

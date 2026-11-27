"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  ChartNoAxesCombined,
  Clock3,
  Command,
  FileText,
  Headset,
  KeyRound,
  LoaderCircle,
  LogOut,
  MapPin,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type Section =
  | "overview"
  | "registrations"
  | "ai-usage"
  | "requests"
  | "businesses"
  | "feedback"
  | "support"
  | "incidents"
  | "audit";

type AdminUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  permissions: string[];
};

type Row = Record<string, unknown>;

type Overview = {
  generatedAt: string;
  metrics: {
    requests24h: number;
    rateLimited24h: number;
    requests7d: number;
    toolCalls24h: number;
    toolCalls7d: number;
    failedTools24h: number;
    publishedBusinesses: number;
    sessionStarts7d: number;
  };
  requestsByEndpoint: Row[];
  topClients: Row[];
  topTools: Row[];
  recentErrors: Row[];
  measurementNote: string;
};

type RegistrationRow = {
  id: string;
  businessName: string;
  description: string | null;
  categoryName: string | null;
  ownerClerkId: string;
  location: string;
  city: string | null;
  country: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  contact: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  accountBusinessCount: number;
  registrationsFromIp: number;
  registrationIp: string | null;
  registrationUserAgent: string | null;
  registrationGeoCountry: string | null;
  registrationGeoCity: string | null;
  registrationGeoLatitude: number | null;
  registrationGeoLongitude: number | null;
  registrationGeoIsp: string | null;
};

type RegCountryRow  = { country: string; registrations: number; published: number };
type RegTimeseriesRow = { bucket: string; registrations: number; published: number };

type TimeseriesPoint = { bucket: string; requests: number; errors: number; rateLimited: number };
type RequestTimeseries = { hourly: TimeseriesPoint[]; daily: TimeseriesPoint[] };
type ToolsTimeseries = { toolNames: string[]; daily: Row[] };
type EndpointBreakdown = { endpoint: string; requests: number; errors: number }[];

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
).replace(/\/$/, "");
const OIDC_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_OIDC_DOMAIN?.replace(/\/$/, "");
const OIDC_CLIENT_ID = process.env.NEXT_PUBLIC_ADMIN_OIDC_CLIENT_ID;
const OIDC_REDIRECT_URI = process.env.NEXT_PUBLIC_ADMIN_OIDC_REDIRECT_URI;
const OIDC_SCOPES = "openid";

// Chart colour palette — warm, on-brand
const CHART_COLORS = [
  "#D96845", // primary orange
  "#80A88A", // muted green
  "#7B9FC4", // muted blue
  "#C4A87B", // warm gold
  "#A87BC4", // muted purple
  "#C47B87", // muted rose
  "#7BC4B8", // teal
  "#B8C47B", // olive
];

const NAV: Array<{
  id: Section;
  label: string;
  icon: typeof Activity;
  permission: string;
}> = [
  { id: "overview",       label: "Overview",       icon: ChartNoAxesCombined, permission: "telemetry.read" },
  { id: "registrations",  label: "Registrations",  icon: MapPin,              permission: "telemetry.read"  },
  { id: "ai-usage",       label: "AI usage",       icon: Activity,            permission: "telemetry.read" },
  { id: "requests",       label: "Request logs",   icon: Activity,            permission: "telemetry.read" },
  { id: "businesses",     label: "Businesses",     icon: Building2,           permission: "business.read"  },
  { id: "feedback",       label: "Feedback",       icon: MessageSquareText,   permission: "telemetry.read" },
  { id: "support",        label: "Support",        icon: Headset,             permission: "support.manage" },
  { id: "incidents",      label: "Incidents",      icon: AlertTriangle,       permission: "incident.manage"},
  { id: "audit",          label: "Audit trail",    icon: FileText,            permission: "admin.manage"   },
];

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

function randomString(length = 64) {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  const digest = await window.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ─── Shared components ────────────────────────────────────────────────────────

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value))
    return new Date(value).toLocaleString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function DataTable({ rows, onUnpublish }: { rows: Row[]; onUnpublish?: (businessId: string) => void }) {
  const columns = useMemo(
    () => (rows.length ? Object.keys(rows[0]!).slice(0, 8) : []),
    [rows],
  );
  if (!rows.length)
    return <div className="p-8 text-sm text-[#817D74]">No records to show yet.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-white/10 text-[10px] uppercase tracking-[.16em] text-[#817D74]">
            {columns.map((col) => (
              <th key={col} className="px-5 py-4 font-medium">
                {col.replace(/([A-Z])/g, " $1")}
              </th>
            ))}
            {onUnpublish && <th className="px-5 py-4 font-medium">Discovery</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={String(row.id ?? row.requestId ?? idx)}
              className="border-b border-white/[.06] last:border-0 hover:bg-white/[.025]"
            >
              {columns.map((col) => (
                <td
                  key={col}
                  className="max-w-[280px] truncate px-5 py-4 text-[#D8D3C9]"
                  title={formatValue(row[col])}
                >
                  {formatValue(row[col])}
                </td>
              ))}
              {onUnpublish && (
                <td className="px-5 py-4">
                  {String(row.status) === "published" ? (
                    <button type="button" onClick={() => onUnpublish(String(row.id))} className="border border-[#C47B87]/40 px-3 py-1.5 text-[10px] text-[#D99AA3] hover:bg-[#C47B87]/10">Unpublish</button>
                  ) : <span className="text-[10px] text-[#77736B]">Not published</span>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeedbackList({ rows }: { rows: Row[] }) {
  const fields = [
    ["howCustomersFindYou",  "How customers find the business"],
    ["wouldPay",             "Willingness to pay"],
    ["wouldPayPriority",     "Payment priority"],
    ["monthlyAdSpend",       "Monthly advertising spend"],
    ["wouldRefer",           "Referral intent"],
    ["oneThing",             "One thing to improve"],
  ] as const;

  if (!rows.length)
    return <div className="p-8 text-sm text-[#817D74]">No feedback submissions yet.</div>;

  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2">
      {rows.map((row) => {
        const answers =
          row.answers && typeof row.answers === "object"
            ? (row.answers as Record<string, unknown>)
            : {};
        return (
          <article key={String(row.id)} className="border border-white/[.08] bg-[#1B1A16] p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/[.07] pb-4">
              <div>
                <h3 className="text-sm font-semibold">{formatValue(row.businessName)}</h3>
                <p className="mt-1 text-[10px] text-[#77736B]">Business ID: {formatValue(row.businessId)}</p>
              </div>
              <time className="text-[10px] text-[#8E897F]">{formatValue(row.submittedAt)}</time>
            </div>
            <dl className="mt-4 grid gap-4">
              {fields.map(([key, label]) => (
                <div key={key}>
                  <dt className="text-[9px] uppercase tracking-[.13em] text-[#77736B]">{label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-[#D8D3C9]">
                    {formatValue(answers[key])}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        );
      })}
    </div>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-white/10 bg-[#1B1A16] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 text-[10px] uppercase tracking-[.12em] text-[#77736B]">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#9B968C]">{p.name}:</span>
          <span className="font-medium text-[#EDE7DC]">{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  note,
  trend,
}: {
  label: string;
  value: number;
  note: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="border border-white/[.08] bg-[#171612] p-5">
      <p className="text-[10px] uppercase tracking-[.14em] text-[#8E897F]">{label}</p>
      <p className="mt-4 flex items-end gap-2 text-3xl font-semibold tracking-[-.05em] tabular-nums">
        {value.toLocaleString()}
        {trend === "up" && <TrendingUp size={16} className="mb-1 text-[#80A88A]" />}
        {trend === "down" && <TrendingUp size={16} className="mb-1 rotate-180 text-[#C47B87]" />}
      </p>
      <p className="mt-2 text-[10px] text-[#77736B]">{note}</p>
    </div>
  );
}

// ─── Chart panel wrapper ──────────────────────────────────────────────────────

function ChartPanel({
  title,
  badge,
  children,
  className = "",
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-white/[.08] bg-[#171612] ${className}`}>
      <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4">
        <h2 className="text-xs font-semibold">{title}</h2>
        {badge && (
          <span className="text-[9px] uppercase tracking-[.15em] text-[#77736B]">{badge}</span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InternalAdminDashboard() {
  const oauthExchangeRef = useRef<Promise<string> | null>(null);

  const [token, setToken]             = useState<string | null>(null);
  const [admin, setAdmin]             = useState<AdminUser | null>(null);
  const [section, setSection]         = useState<Section>("overview");
  const [overview, setOverview]       = useState<Overview | null>(null);
  const [requestTs, setRequestTs]     = useState<RequestTimeseries | null>(null);
  const [toolsTs, setToolsTs]         = useState<ToolsTimeseries | null>(null);
  const [endpointBd, setEndpointBd]   = useState<EndpointBreakdown>([]);
  const [regRows, setRegRows]         = useState<RegistrationRow[]>([]);
  const [regCountries, setRegCountries] = useState<RegCountryRow[]>([]);
  const [regTimeseries, setRegTimeseries] = useState<RegTimeseriesRow[]>([]);
  const [rows, setRows]               = useState<Row[]>([]);
  const [busy, setBusy]               = useState(false);
  const [authBusy, setAuthBusy]       = useState(false);
  const [error, setError]             = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [tsMode, setTsMode]           = useState<"24h" | "7d">("24h");

  // ── API helper ──────────────────────────────────────────────────────────────

  const api = useCallback(async <T,>(path: string, accessToken: string): Promise<T> => {
    const res = await fetch(`${API_BASE}/api${path}`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? `Admin API request failed (${res.status})`);
    }
    return res.json() as Promise<T>;
  }, []);

  // ── OAuth / PKCE ────────────────────────────────────────────────────────────

  const startLogin = useCallback(async () => {
    if (!OIDC_DOMAIN || !OIDC_CLIENT_ID || !OIDC_REDIRECT_URI) {
      setAuthMessage(
        "Admin sign-in is not configured. Configure the Cognito domain, client ID, callback URL and matching API issuer/audience.",
      );
      return;
    }
    setAuthBusy(true);
    try {
      const state    = randomString(24);
      const verifier = randomString(48);
      sessionStorage.setItem("kiosk_admin_oauth_state",   state);
      sessionStorage.setItem("kiosk_admin_pkce_verifier", verifier);
      const challenge = await sha256(verifier);
      const params = new URLSearchParams({
        response_type:         "code",
        client_id:             OIDC_CLIENT_ID,
        redirect_uri:          OIDC_REDIRECT_URI,
        scope:                 OIDC_SCOPES,
        state,
        code_challenge_method: "S256",
        code_challenge:        challenge,
      });
      window.location.assign(`${OIDC_DOMAIN}/oauth2/authorize?${params.toString()}`);
    } catch {
      setAuthBusy(false);
      setAuthMessage("Could not start secure sign-in in this browser.");
    }
  }, []);

  // ── OAuth callback exchange ─────────────────────────────────────────────────

  useEffect(() => {
    const params        = new URLSearchParams(window.location.search);
    const code          = params.get("code");
    const returnedState = params.get("state");
    const oauthError    = params.get("error_description") ?? params.get("error");

    if (oauthError) {
      setAuthMessage(oauthError);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    if (!code) return;

    if (!oauthExchangeRef.current) {
      const expectedState = sessionStorage.getItem("kiosk_admin_oauth_state");
      const verifier      = sessionStorage.getItem("kiosk_admin_pkce_verifier");
      sessionStorage.removeItem("kiosk_admin_oauth_state");
      sessionStorage.removeItem("kiosk_admin_pkce_verifier");

      if (
        !returnedState ||
        returnedState !== expectedState ||
        !verifier ||
        !OIDC_DOMAIN ||
        !OIDC_CLIENT_ID ||
        !OIDC_REDIRECT_URI
      ) {
        setAuthMessage("The sign-in response could not be validated. Please try again.");
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      const body = new URLSearchParams({
        grant_type:    "authorization_code",
        client_id:     OIDC_CLIENT_ID,
        code,
        redirect_uri:  OIDC_REDIRECT_URI,
        code_verifier: verifier,
      });

      oauthExchangeRef.current = fetch(`${OIDC_DOMAIN}/oauth2/token`, {
        method:  "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      }).then(async (r) => {
        if (!r.ok) throw new Error("Could not exchange the sign-in code.");
        const result = (await r.json()) as { access_token?: string };
        if (!result.access_token)
          throw new Error("The identity provider returned no access token.");
        return result.access_token;
      });
    }

    setAuthBusy(true);
    oauthExchangeRef.current
      .then((accessToken) => { setToken(accessToken); setAuthMessage(""); })
      .catch((cause: unknown) => {
        setAuthMessage(cause instanceof Error ? cause.message : "Sign-in failed.");
      })
      .finally(() => {
        setAuthBusy(false);
        oauthExchangeRef.current = null;
        window.history.replaceState({}, "", window.location.pathname);
      });
  }, []);

  // ── Sign out ────────────────────────────────────────────────────────────────

  const signOut = useCallback(() => {
    setToken(null);
    setAdmin(null);
    setError("");
    setOverview(null);
    setRequestTs(null);
    setToolsTs(null);
    setEndpointBd([]);
    setRegRows([]);
    setRegCountries([]);
    setRegTimeseries([]);
    setRows([]);
    if (OIDC_DOMAIN && OIDC_CLIENT_ID && OIDC_REDIRECT_URI) {
      const params = new URLSearchParams({ client_id: OIDC_CLIENT_ID, logout_uri: OIDC_REDIRECT_URI });
      window.location.assign(`${OIDC_DOMAIN}/logout?${params.toString()}`);
    }
  }, []);

  // ── Load section data ───────────────────────────────────────────────────────

  const loadSection = useCallback(
    async (accessToken: string, activeSection: Section) => {
      setBusy(true);
      setError("");
      try {
        if (activeSection === "overview") {
          const [ov, rts, tts, ebd] = await Promise.all([
            api<Overview>("/admin/overview", accessToken),
            api<RequestTimeseries>("/admin/charts/requests-timeseries", accessToken),
            api<ToolsTimeseries>("/admin/charts/tools-timeseries", accessToken),
            api<EndpointBreakdown>("/admin/charts/endpoint-breakdown", accessToken),
          ]);
          setOverview(ov);
          setRequestTs(rts);
          setToolsTs(tts);
          setEndpointBd(ebd);
          setRows([]);
          return;
        }
        if (activeSection === "registrations") {
          const [regs, countries, timeseries] = await Promise.all([
            api<RegistrationRow[]>("/admin/registrations", accessToken),
            api<RegCountryRow[]>("/admin/charts/registrations-by-country", accessToken),
            api<RegTimeseriesRow[]>("/admin/charts/registrations-timeseries", accessToken),
          ]);
          setRegRows(regs);
          setRegCountries(countries);
          setRegTimeseries(timeseries);
          setRows([]);
          return;
        }
        const paths: Record<Exclude<Section, "overview" | "registrations">, string> = {
          "ai-usage":  "/admin/telemetry/tools",
          requests:    "/admin/telemetry/requests",
          businesses:  "/admin/businesses",
          feedback:    "/admin/feedback",
          support:     "/admin/tickets",
          incidents:   "/admin/incidents",
          audit:       "/admin/audit",
        };
        setRows(await api<Row[]>(paths[activeSection], accessToken));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not load admin data.");
        setRows([]);
      } finally {
        setBusy(false);
      }
    },
    [api],
  );

  const unpublishBusiness = useCallback(async (businessId: string) => {
    if (!token || !window.confirm("Remove this business from public AI discovery? Its profile and data will be preserved.")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/admin/businesses/${encodeURIComponent(businessId)}/unpublish`, {
        method: "PATCH",
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error ?? `Unpublish failed (${response.status})`);
      }
      await loadSection(token, "businesses");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not unpublish this business.");
    } finally {
      setBusy(false);
    }
  }, [token, loadSection]);
  // ── Fetch admin profile after token set ─────────────────────────────────────

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setAuthBusy(true);
    api<AdminUser>("/admin/me", token)
      .then((profile) => {
        if (cancelled) return;
        setAdmin(profile);
        const first =
          NAV.find((item) => profile.permissions.includes(item.permission))?.id ?? "businesses";
        setSection(first);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setToken(null);
          setAdmin(null);
          setError(cause instanceof Error ? cause.message : "Admin access denied.");
        }
      })
      .finally(() => { if (!cancelled) setAuthBusy(false); });
    return () => { cancelled = true; };
  }, [token, api]);

  useEffect(() => {
    if (token && admin) void loadSection(token, section);
  }, [section, token, admin, loadSection]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const visibleNav = NAV.filter((item) => admin?.permissions.includes(item.permission));
  const title      = NAV.find((item) => item.id === section)?.label ?? "Overview";
  const tsData     = tsMode === "24h" ? (requestTs?.hourly ?? []) : (requestTs?.daily ?? []);

  // ── Login screen ────────────────────────────────────────────────────────────

  if (!token || !admin) {
    return (
      <main className="min-h-screen bg-[#11110F] px-5 py-10 text-[#EDE7DC]">
        <div className="mx-auto flex min-h-[80vh] max-w-[520px] flex-col justify-center">
          <div className="mb-8 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center border border-[#D96845]/50 text-[#D96845]">
              <Command size={17} />
            </span>
            <span className="text-sm font-semibold tracking-[.22em]">KIOSK / INTERNAL</span>
          </div>
          <p className="mb-3 text-[10px] uppercase tracking-[.2em] text-[#D96845]">
            Restricted workspace
          </p>
          <h1 className="text-4xl font-semibold tracking-[-.06em]">Operations console</h1>
          <p className="mt-5 text-sm leading-7 text-[#A49D90]">
            A separate workspace for Kiosk operations. Only identities explicitly provisioned
            in Kiosk&apos;s admin directory can enter.
          </p>
          {authMessage && (
            <p role="alert" className="mt-6 border border-[#D96845]/30 bg-[#D96845]/[.06] p-4 text-xs leading-6 text-[#E5B5A6]">
              {authMessage}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 text-xs text-[#E5B5A6]">{error}</p>
          )}
          <button
            onClick={() => void startLogin()}
            disabled={authBusy}
            className="mt-8 flex h-12 items-center justify-center gap-3 bg-[#D96845] px-5 text-sm font-semibold text-[#11110F] transition hover:bg-[#E8A18D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D96845] focus-visible:ring-offset-2 focus-visible:ring-offset-[#11110F] disabled:opacity-50"
          >
            {authBusy ? <LoaderCircle className="animate-spin" size={16} /> : <KeyRound size={16} />}
            Continue with admin sign-in
          </button>
          <p className="mt-5 text-[10px] leading-5 text-[#716D65]">
            Enforce MFA in the identity provider. Merchant sign-in does not grant access.
          </p>
        </div>
      </main>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#11110F] text-[#EDE7DC]">
      <div className="flex min-h-screen">

        {/* ── Sidebar ── */}
        <aside className="hidden w-[248px] shrink-0 border-r border-white/[.08] bg-[#151410] p-5 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2 py-3">
            <span className="grid h-8 w-8 place-items-center border border-[#D96845]/50 text-[#D96845]">
              <Command size={15} />
            </span>
            <span className="text-xs font-semibold tracking-[.2em]">KIOSK / OPS</span>
          </div>
          <p className="mb-3 mt-12 px-3 text-[9px] uppercase tracking-[.2em] text-[#77736B]">Workspace</p>
          <nav className="space-y-1">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`flex w-full items-center gap-3 px-3 py-3 text-left text-xs transition ${
                    section === item.id
                      ? "bg-[#D96845]/15 text-[#F0B3A0] ring-1 ring-inset ring-[#D96845]/30"
                      : "text-[#9B968C] hover:bg-white/[.04] hover:text-[#EDE7DC]"
                  }`}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-white/[.08] pt-5">
            <div className="text-xs font-medium">{admin.displayName || admin.email}</div>
            <div className="mt-1 text-[10px] text-[#77736B]">{admin.role.replaceAll("_", " ")}</div>
            <button
              onClick={signOut}
              className="mt-5 flex items-center gap-2 text-[11px] text-[#9B968C] transition hover:text-[#E8A18D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D96845]"
            >
              <LogOut size={13} />
              Sign out
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <section className="min-w-0 flex-1">

          {/* Header */}
          <header className="flex min-h-[72px] items-center justify-between border-b border-white/[.08] px-5 sm:px-8">
            <div>
              <p className="text-[9px] uppercase tracking-[.2em] text-[#77736B]">Kiosk / Operations</p>
              <h1 className="mt-1 text-lg font-semibold tracking-[-.03em]">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-2 text-[10px] text-[#8E897F] sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[#80A88A]" />
                Admin session active
              </span>
              <button
                onClick={() => token && void loadSection(token, section)}
                className="grid h-9 w-9 place-items-center border border-white/10 text-[#A49D90] transition hover:border-[#D96845]/60 hover:text-[#E8A18D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D96845]"
                aria-label="Refresh"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={signOut}
                className="grid h-9 w-9 place-items-center border border-white/10 text-[#A49D90] transition hover:border-[#D96845]/60 hover:text-[#E8A18D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D96845] lg:hidden"
                aria-label="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </header>

          {/* Mobile nav */}
          <div className="border-b border-white/[.07] px-5 py-3 lg:hidden">
            <div className="flex gap-2 overflow-x-auto">
              {visibleNav.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`shrink-0 px-3 py-2 text-[11px] ${
                    section === item.id
                      ? "bg-[#D96845]/20 text-[#F0B3A0] ring-1 ring-inset ring-[#D96845]/35"
                      : "text-[#9B968C]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="mx-auto max-w-[1440px] p-5 sm:p-8">

            {busy && (
              <div className="mb-5 flex items-center gap-2 text-xs text-[#8E897F]">
                <LoaderCircle className="animate-spin" size={14} />
                Loading operational data…
              </div>
            )}
            {authBusy && (
              <div className="mb-5 text-[10px] text-[#77736B]">Checking admin session…</div>
            )}
            {error && (
              <div role="alert" className="mb-6 border border-[#D96845]/30 bg-[#D96845]/[.06] p-4 text-xs text-[#E5B5A6]">
                {error}
              </div>
            )}

            {/* ── OVERVIEW ── */}
            {section === "overview" && overview && (
              <>
                {/* Timestamp */}
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[.18em] text-[#77736B]">Platform pulse</p>
                    <p className="mt-1 text-xs text-[#A49D90]">
                      Operational activity across Master MCP and Business MCP
                    </p>
                  </div>
                  <span className="text-[10px] text-[#77736B]">
                    Updated {new Date(overview.generatedAt).toLocaleTimeString()}
                  </span>
                </div>

                {/* Metric cards */}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="MCP requests · 24h"
                    value={overview.metrics.requests24h}
                    note="Last 24 hours"
                  />
                  <MetricCard
                    label="Rate limited · 24h"
                    value={overview.metrics.rateLimited24h}
                    note="HTTP 429 responses"
                    trend={overview.metrics.rateLimited24h > 0 ? "down" : "neutral"}
                  />
                  <MetricCard
                    label="Tool executions · 24h"
                    value={overview.metrics.toolCalls24h}
                    note="Last 24 hours"
                  />
                  <MetricCard
                    label="Tool failures · 24h"
                    value={overview.metrics.failedTools24h}
                    note={overview.metrics.toolCalls24h > 0
                      ? `${((overview.metrics.failedTools24h / overview.metrics.toolCalls24h) * 100).toFixed(1)}% failure rate`
                      : "Last 24 hours"}
                    trend={overview.metrics.failedTools24h > 0 ? "down" : "neutral"}
                  />
                  <MetricCard
                    label="Published businesses"
                    value={overview.metrics.publishedBusinesses}
                    note="Currently active"
                    trend="up"
                  />
                  <MetricCard
                    label="MCP requests · 7d"
                    value={overview.metrics.requests7d}
                    note="Last 7 days"
                  />
                  <MetricCard
                    label="Tool executions · 7d"
                    value={overview.metrics.toolCalls7d}
                    note="Last 7 days"
                  />
                  <MetricCard
                    label="Initialize events · 7d"
                    value={overview.metrics.sessionStarts7d}
                    note="Not unique users"
                  />
                </div>

                {/* ── Request volume chart ── */}
                <div className="mt-8">
                  <ChartPanel
                    title="Request volume"
                    badge={tsMode === "24h" ? "hourly · 24h" : "daily · 7d"}
                  >
                    {/* Toggle */}
                    <div className="mb-4 flex gap-2">
                      {(["24h", "7d"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setTsMode(m)}
                          className={`px-3 py-1.5 text-[10px] uppercase tracking-[.12em] transition ${
                            tsMode === m
                              ? "bg-[#D96845]/20 text-[#F0B3A0] ring-1 ring-inset ring-[#D96845]/35"
                              : "text-[#8E897F] hover:text-[#D8D3C9]"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    {tsData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={tsData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#D96845" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#D96845" stopOpacity={0}    />
                            </linearGradient>
                            <linearGradient id="errGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#C47B87" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#C47B87" stopOpacity={0}    />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="bucket" tick={{ fill: "#77736B", fontSize: 10 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fill: "#77736B", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 10, color: "#8E897F", paddingTop: 12 }} />
                          <Area type="monotone" dataKey="requests" name="Requests" stroke="#D96845" strokeWidth={2} fill="url(#reqGrad)" dot={false} />
                          <Area type="monotone" dataKey="errors"   name="Errors"   stroke="#C47B87" strokeWidth={1.5} fill="url(#errGrad)" dot={false} />
                          <Line type="monotone" dataKey="rateLimited" name="Rate limited (429)" stroke="#C4A87B" strokeWidth={2} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[260px] items-center justify-center text-sm text-[#817D74]">
                        No request data yet
                      </div>
                    )}
                  </ChartPanel>
                </div>

                {/* ── Two-column charts row ── */}
                <div className="mt-5 grid gap-5 xl:grid-cols-2">

                  {/* Tool calls by name */}
                  <ChartPanel title="Top tools · daily calls" badge="7 days">
                    {toolsTs && toolsTs.daily.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={toolsTs.daily} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="bucket" tick={{ fill: "#77736B", fontSize: 10 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fill: "#77736B", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 10, color: "#8E897F", paddingTop: 12 }} />
                          {(toolsTs.toolNames ?? []).map((name, i) => (
                            <Line
                              key={name}
                              type="monotone"
                              dataKey={name}
                              stroke={CHART_COLORS[i % CHART_COLORS.length]}
                              strokeWidth={2}
                              dot={false}
                              connectNulls
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[240px] items-center justify-center text-sm text-[#817D74]">
                        No tool data yet
                      </div>
                    )}
                  </ChartPanel>

                  {/* Endpoint breakdown */}
                  <ChartPanel title="Requests by endpoint" badge="7 days">
                    {endpointBd.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart
                          data={endpointBd}
                          layout="vertical"
                          margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                          <XAxis type="number" tick={{ fill: "#77736B", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <YAxis
                            type="category"
                            dataKey="endpoint"
                            tick={{ fill: "#77736B", fontSize: 9 }}
                            tickLine={false}
                            axisLine={false}
                            width={110}
                            tickFormatter={(v: string) => v.length > 18 ? `…${v.slice(-16)}` : v}
                          />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="requests" name="Requests" fill="#D96845" radius={[0, 2, 2, 0]} />
                          <Bar dataKey="errors"   name="Errors"   fill="#C47B87" radius={[0, 2, 2, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[240px] items-center justify-center text-sm text-[#817D74]">
                        No endpoint data yet
                      </div>
                    )}
                  </ChartPanel>

                  {/* Tool failure donut */}
                  <ChartPanel title="Tool success vs failure" badge="7 days">
                    {(() => {
                      const totalCalls    = overview.metrics.toolCalls7d;
                      const totalFailures = overview.topTools.reduce(
                        (sum, t) => sum + (Number(t.failures) || 0), 0,
                      );
                      const success = totalCalls - totalFailures;
                      if (totalCalls === 0)
                        return (
                          <div className="flex h-[240px] items-center justify-center text-sm text-[#817D74]">
                            No tool data yet
                          </div>
                        );
                      const data = [
                        { name: "Success", value: success },
                        { name: "Failure", value: totalFailures },
                      ];
                      return (
                        <ResponsiveContainer width="100%" height={240}>
                          <PieChart>
                            <Pie
                              data={data}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              <Cell fill="#80A88A" />
                              <Cell fill="#C47B87" />
                            </Pie>
                            <Tooltip content={<ChartTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 10, color: "#8E897F", paddingTop: 12 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </ChartPanel>

                  {/* Observed AI clients */}
                  <ChartPanel title="Observed AI clients" badge="7 days">
                    {overview.topClients.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart
                          data={overview.topClients.slice(0, 6).map((c) => ({
                            name: String(c.clientName ?? "unknown").slice(0, 20),
                            requests: Number(c.requests),
                          }))}
                          margin={{ top: 4, right: 8, left: -20, bottom: 32 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis
                            dataKey="name"
                            tick={{ fill: "#77736B", fontSize: 9 }}
                            tickLine={false}
                            axisLine={false}
                            angle={-25}
                            textAnchor="end"
                          />
                          <YAxis tick={{ fill: "#77736B", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="requests" name="Requests" radius={[2, 2, 0, 0]}>
                            {overview.topClients.slice(0, 6).map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[240px] items-center justify-center text-sm text-[#817D74]">
                        No client data yet
                      </div>
                    )}
                  </ChartPanel>
                </div>

                {/* Recent errors table */}
                <div className="mt-5">
                  <ChartPanel title="Recent tool failures" badge="7 days">
                    <DataTable rows={overview.recentErrors} />
                  </ChartPanel>
                </div>

                {/* Footer note */}
                <p className="mt-6 max-w-4xl text-[10px] leading-5 text-[#77736B]">
                  {overview.measurementNote}
                </p>
                <div className="mt-5 flex flex-wrap gap-4 text-[10px] text-[#8E897F]">
                  <span className="inline-flex items-center gap-2"><ShieldCheck size={13} />Restricted admin data</span>
                  <span className="inline-flex items-center gap-2"><Clock3 size={13} />Counts are event-based</span>
                  <span className="inline-flex items-center gap-2"><Zap size={13} />Charts update on refresh</span>
                </div>
              </>
            )}

            {/* ── REGISTRATIONS ── */}
            {section === "registrations" && (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[.18em] text-[#77736B]">Merchant registrations</p>
                    <p className="mt-1 text-xs text-[#A49D90]">
                      IP, device, and geographic data captured at business creation
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-[#77736B]">
                    <ShieldCheck size={12} />
                    Admin-only · telemetry restricted
                  </span>
                </div>

                {/* Stat cards */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="border border-white/[.08] bg-[#171612] p-5">
                    <p className="text-[10px] uppercase tracking-[.14em] text-[#8E897F]">Total registrations</p>
                    <p className="mt-4 text-3xl font-semibold tracking-[-.05em] tabular-nums">
                      {regRows.length.toLocaleString()}
                    </p>
                    <p className="mt-2 text-[10px] text-[#77736B]">All time</p>
                  </div>
                  <div className="border border-white/[.08] bg-[#171612] p-5">
                    <p className="text-[10px] uppercase tracking-[.14em] text-[#8E897F]">Countries represented</p>
                    <p className="mt-4 text-3xl font-semibold tracking-[-.05em] tabular-nums">
                      {regCountries.length}
                    </p>
                    <p className="mt-2 text-[10px] text-[#77736B]">Unique registration countries</p>
                  </div>
                  <div className="border border-white/[.08] bg-[#171612] p-5">
                    <p className="text-[10px] uppercase tracking-[.14em] text-[#8E897F]">With geo data</p>
                    <p className="mt-4 text-3xl font-semibold tracking-[-.05em] tabular-nums">
                      {regRows.filter((r) => r.registrationGeoCountry).length}
                    </p>
                    <p className="mt-2 text-[10px] text-[#77736B]">
                      {regRows.length > 0
                        ? `${Math.round((regRows.filter((r) => r.registrationGeoCountry).length / regRows.length) * 100)}% coverage`
                        : "No data yet"}
                    </p>
                  </div>
                </div>

                {/* Charts row */}
                <div className="mt-5 grid gap-5 xl:grid-cols-2">

                  {/* Registrations over time */}
                  <ChartPanel title="Registrations over time" badge="30 days">
                    {regTimeseries.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={regTimeseries} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#D96845" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#D96845" stopOpacity={0}    />
                            </linearGradient>
                            <linearGradient id="pubGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#80A88A" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#80A88A" stopOpacity={0}    />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="bucket" tick={{ fill: "#77736B", fontSize: 10 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fill: "#77736B", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 10, color: "#8E897F", paddingTop: 12 }} />
                          <Area type="monotone" dataKey="registrations" name="Registered" stroke="#D96845" strokeWidth={2} fill="url(#regGrad)" dot={false} />
                          <Area type="monotone" dataKey="published"     name="Published"  stroke="#80A88A" strokeWidth={2} fill="url(#pubGrad)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[240px] items-center justify-center text-sm text-[#817D74]">No registration data yet</div>
                    )}
                  </ChartPanel>

                  {/* Registrations by country */}
                  <ChartPanel title="Registrations by country" badge="all time">
                    {regCountries.length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart
                          data={regCountries.slice(0, 10)}
                          layout="vertical"
                          margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                          <XAxis type="number" tick={{ fill: "#77736B", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <YAxis
                            type="category"
                            dataKey="country"
                            tick={{ fill: "#77736B", fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            width={32}
                          />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="registrations" name="Registered" fill="#D96845" radius={[0, 2, 2, 0]} />
                          <Bar dataKey="published"     name="Published"  fill="#80A88A" radius={[0, 2, 2, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-[240px] items-center justify-center text-sm text-[#817D74]">No country data yet</div>
                    )}
                  </ChartPanel>
                </div>

                {/* Registration detail table */}
                <div className="mt-5">
                  <ChartPanel title="Registration log" badge={`${regRows.length} records`}>
                    {regRows.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] border-collapse text-left text-xs">
                          <thead>
                            <tr className="border-b border-white/10 text-[10px] uppercase tracking-[.14em] text-[#817D74]">
                              {["Business", "Category", "Location", "Contact", "Website", "Account ID", "Businesses on account", "Registrations from IP", "Status", "Registered", "Last updated", "Published", "IP Address", "Country", "City", "Lat / Lon", "User Agent"].map((h) => (
                                <th key={h} className="px-4 py-4 font-medium">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {regRows.map((row) => (
                              <tr key={row.id} className="border-b border-white/[.06] last:border-0 hover:bg-white/[.025]">
                                <td className="max-w-[160px] truncate px-4 py-3 font-medium text-[#D8D3C9]" title={row.businessName}>
                                  {row.businessName}
                                </td>
                                <td className="px-4 py-3 text-[#9B968C]">{row.categoryName ?? "—"}</td>
                                <td className="px-4 py-3 text-[#9B968C]">{[row.city, row.country, row.location].filter(Boolean).join(", ") || "—"}</td>
                                <td className="px-4 py-3 text-[#9B968C]">{row.whatsapp ?? row.phone ?? row.contact ?? "—"}</td>
                                <td className="max-w-[180px] truncate px-4 py-3 text-[#9B968C]">{row.website ?? "—"}</td>
                                <td className="max-w-[180px] truncate px-4 py-3 font-mono text-[10px] text-[#716D65]" title={row.ownerClerkId}>{row.ownerClerkId}</td>
                                <td className="px-4 py-3 text-[#9B968C]">{row.accountBusinessCount}</td>
                                <td className="px-4 py-3 text-[#9B968C]">{row.registrationsFromIp}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-block px-2 py-0.5 text-[9px] uppercase tracking-[.1em] ${
                                    row.status === "published"
                                      ? "bg-[#80A88A]/20 text-[#80A88A]"
                                      : "bg-white/[.06] text-[#8E897F]"
                                  }`}>
                                    {row.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-[#9B968C]">
                                  {new Date(row.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-[#9B968C]">
                                  {new Date(row.updatedAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-[#9B968C]">
                                  {row.publishedAt ? new Date(row.publishedAt).toLocaleDateString() : "—"}
                                </td>
                                <td className="px-4 py-3 font-mono text-[11px] text-[#9B968C]">
                                  {row.registrationIp ?? "—"}
                                </td>
                                <td className="px-4 py-3 text-[#D8D3C9]">
                                  {row.registrationGeoCountry ?? "—"}
                                </td>
                                <td className="px-4 py-3 text-[#9B968C]">
                                  {row.registrationGeoCity ?? "—"}
                                </td>
                                <td className="px-4 py-3 font-mono text-[10px] text-[#716D65]">
                                  {row.registrationGeoLatitude != null && row.registrationGeoLongitude != null
                                    ? `${row.registrationGeoLatitude.toFixed(3)}, ${row.registrationGeoLongitude.toFixed(3)}`
                                    : "—"}
                                </td>
                                <td
                                  className="max-w-[200px] truncate px-4 py-3 text-[10px] text-[#716D65]"
                                  title={row.registrationUserAgent ?? ""}
                                >
                                  {row.registrationUserAgent ?? "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-sm text-[#817D74]">
                        No registrations yet. Data is captured from the next business creation onwards.
                      </div>
                    )}
                  </ChartPanel>
                </div>

                <p className="mt-5 text-[10px] leading-5 text-[#77736B]">
                  IP geolocation is derived from the MaxMind GeoLite2 database at city level. Private and
                  loopback IPs (local dev) return no geo data. Raw IPs are only visible to admins with
                  telemetry.read permission and are stored for fraud prevention under legitimate interest.
                  Disclose in your privacy policy.
                </p>
              </>
            )}

            {/* ── ALL OTHER SECTIONS ── */}
            {section !== "overview" && section !== "registrations" && (
              <section className="border border-white/[.08] bg-[#171612]">
                <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4">
                  <h2 className="text-xs font-semibold">{title}</h2>
                  <span className="text-[10px] text-[#77736B]">{rows.length} records returned</span>
                </div>
                {section === "feedback" ? (
                  <>
                    <p className="px-5 pt-4 text-[11px] leading-5 text-[#8E897F]">
                      Private merchant onboarding responses. Stored in PostgreSQL agent_events.metadata.
                    </p>
                    <FeedbackList rows={rows} />
                  </>
                ) : (
                  <DataTable
                    rows={rows}
                    onUnpublish={section === "businesses" && admin?.permissions.includes("business.suspend") ? unpublishBusiness : undefined}
                  />
                )}
              </section>
            )}

            <footer className="mt-10 flex items-center justify-between border-t border-white/[.07] pt-5 text-[9px] uppercase tracking-[.14em] text-[#625F58]">
              <span>Kiosk internal operations</span>
              <span className="inline-flex items-center gap-2">
                <ArrowUpRight size={11} />
                Admin data is server-protected
              </span>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}

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
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

type Section =
  | "overview"
  | "ai-usage"
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
    requests7d: number;
    toolCalls24h: number;
    toolCalls7d: number;
    failedTools24h: number;
    publishedBusinesses: number;
    sessionStarts7d: number;
  };
  requestsByEndpoint: Array<Row>;
  topClients: Array<Row>;
  topTools: Array<Row>;
  recentErrors: Array<Row>;
  measurementNote: string;
};

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
).replace(/\/$/, "");
const OIDC_DOMAIN = process.env.NEXT_PUBLIC_ADMIN_OIDC_DOMAIN?.replace(
  /\/$/,
  "",
);
const OIDC_CLIENT_ID = process.env.NEXT_PUBLIC_ADMIN_OIDC_CLIENT_ID;
const OIDC_REDIRECT_URI = process.env.NEXT_PUBLIC_ADMIN_OIDC_REDIRECT_URI;
const OIDC_SCOPES = "openid email profile";

const NAV: Array<{
  id: Section;
  label: string;
  icon: typeof Activity;
  permission: string;
}> = [
  {
    id: "overview",
    label: "Overview",
    icon: ChartNoAxesCombined,
    permission: "telemetry.read",
  },
  {
    id: "ai-usage",
    label: "AI usage",
    icon: Activity,
    permission: "telemetry.read",
  },
  {
    id: "businesses",
    label: "Businesses",
    icon: Building2,
    permission: "business.read",
  },
  {
    id: "feedback",
    label: "Feedback",
    icon: MessageSquareText,
    permission: "telemetry.read",
  },
  {
    id: "support",
    label: "Support",
    icon: Headset,
    permission: "support.manage",
  },
  {
    id: "incidents",
    label: "Incidents",
    icon: AlertTriangle,
    permission: "incident.manage",
  },
  {
    id: "audit",
    label: "Audit trail",
    icon: FileText,
    permission: "admin.manage",
  },
];

function randomString(length = 64) {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
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

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value))
    return new Date(value).toLocaleString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function DataTable({ rows }: { rows: Row[] }) {
  const columns = useMemo(
    () => (rows.length ? Object.keys(rows[0]!).slice(0, 8) : []),
    [rows],
  );
  if (!rows.length)
    return (
      <div className="p-8 text-sm text-[#817D74]">No records to show yet.</div>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-white/10 text-[10px] uppercase tracking-[.16em] text-[#817D74]">
            {columns.map((column) => (
              <th key={column} className="px-5 py-4 font-medium">
                {column.replace(/([A-Z])/g, " $1")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={String(row.id ?? row.requestId ?? index)}
              className="border-b border-white/[.06] last:border-0 hover:bg-white/[.025]"
            >
              {columns.map((column) => (
                <td
                  key={column}
                  className="max-w-[280px] truncate px-5 py-4 text-[#D8D3C9]"
                  title={formatValue(row[column])}
                >
                  {formatValue(row[column])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InternalAdminDashboard() {
  const oauthExchangeRef = useRef<Promise<string> | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [section, setSection] = useState<Section>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const api = useCallback(
    async <T,>(path: string, accessToken: string): Promise<T> => {
      const response = await fetch(`${API_BASE}/api${path}`, {
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: "application/json",
        },
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          payload.error ?? `Admin API request failed (${response.status})`,
        );
      }
      return response.json() as Promise<T>;
    },
    [],
  );

  const startLogin = useCallback(async () => {
    if (!OIDC_DOMAIN || !OIDC_CLIENT_ID || !OIDC_REDIRECT_URI) {
      setAuthMessage(
        "Admin sign-in is not configured. Configure the Cognito domain, client ID, callback URL and matching API issuer/audience.",
      );
      return;
    }
    setAuthBusy(true);
    try {
      const state = randomString(24);
      const verifier = randomString(48);
      sessionStorage.setItem("kiosk_admin_oauth_state", state);
      sessionStorage.setItem("kiosk_admin_pkce_verifier", verifier);
      const challenge = await sha256(verifier);
      const params = new URLSearchParams({
        response_type: "code",
        client_id: OIDC_CLIENT_ID,
        redirect_uri: OIDC_REDIRECT_URI,
        scope: OIDC_SCOPES,
        state,
        code_challenge_method: "S256",
        code_challenge: challenge,
      });
      window.location.assign(
        `${OIDC_DOMAIN}/oauth2/authorize?${params.toString()}`,
      );
    } catch {
      setAuthBusy(false);
      setAuthMessage("Could not start secure sign-in in this browser.");
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const returnedState = params.get("state");
    const oauthError = params.get("error_description") ?? params.get("error");
    if (oauthError) {
      setAuthMessage(oauthError);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    if (!code) return;

    if (!oauthExchangeRef.current) {
      const expectedState = sessionStorage.getItem("kiosk_admin_oauth_state");
      const verifier = sessionStorage.getItem("kiosk_admin_pkce_verifier");
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
        setAuthMessage(
          "The sign-in response could not be validated. Please try again.",
        );
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: OIDC_CLIENT_ID,
        code,
        redirect_uri: OIDC_REDIRECT_URI,
        code_verifier: verifier,
      });
      oauthExchangeRef.current = fetch(`${OIDC_DOMAIN}/oauth2/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      }).then(async (response) => {
        if (!response.ok)
          throw new Error("Could not exchange the sign-in code.");
        const result = (await response.json()) as { access_token?: string };
        if (!result.access_token)
          throw new Error("The identity provider returned no access token.");
        return result.access_token;
      });
    }

    setAuthBusy(true);
    oauthExchangeRef.current
      .then((accessToken) => {
        setToken(accessToken);
        setAuthMessage("");
      })
      .catch((cause: unknown) => {
        setAuthMessage(
          cause instanceof Error ? cause.message : "Sign-in failed.",
        );
      })
      .finally(() => {
        setAuthBusy(false);
        oauthExchangeRef.current = null;
        window.history.replaceState({}, "", window.location.pathname);
      });
  }, []);

  const loadSection = useCallback(
    async (accessToken: string, activeSection: Section) => {
      setBusy(true);
      setError("");
      try {
        if (activeSection === "overview") {
          setOverview(await api<Overview>("/admin/overview", accessToken));
          setRows([]);
          return;
        }
        const paths: Record<Exclude<Section, "overview">, string> = {
          "ai-usage": "/admin/telemetry/tools",
          businesses: "/admin/businesses",
          feedback: "/admin/feedback",
          support: "/admin/tickets",
          incidents: "/admin/incidents",
          audit: "/admin/audit",
        };
        setRows(await api<Row[]>(paths[activeSection], accessToken));
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Could not load admin data.",
        );
        setRows([]);
      } finally {
        setBusy(false);
      }
    },
    [api],
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setAuthBusy(true);
    api<AdminUser>("/admin/me", token)
      .then((profile) => {
        if (cancelled) return;
        setAdmin(profile);
        const firstSection =
          NAV.find((item) => profile.permissions.includes(item.permission))
            ?.id ?? "businesses";
        setSection(firstSection);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setToken(null);
          setAdmin(null);
          setError(
            cause instanceof Error ? cause.message : "Admin access denied.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setAuthBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, api]);

  useEffect(() => {
    if (token && admin) void loadSection(token, section);
  }, [section, token, admin, loadSection]);

  const visibleNav = NAV.filter((item) =>
    admin?.permissions.includes(item.permission),
  );
  const title = NAV.find((item) => item.id === section)?.label ?? "Overview";

  if (!token || !admin) {
    return (
      <main className="min-h-screen bg-[#11110F] px-5 py-10 text-[#EDE7DC]">
        <div className="mx-auto flex min-h-[80vh] max-w-[520px] flex-col justify-center">
          <div className="mb-8 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center border border-[#D96845]/50 text-[#D96845]">
              <Command size={17} />
            </span>
            <span className="text-sm font-semibold tracking-[.22em]">
              KIOSK / INTERNAL
            </span>
          </div>
          <p className="mb-3 text-[10px] uppercase tracking-[.2em] text-[#D96845]">
            Restricted workspace
          </p>
          <h1 className="text-4xl font-semibold tracking-[-.06em]">
            Operations console
          </h1>
          <p className="mt-5 text-sm leading-7 text-[#A49D90]">
            A separate workspace for Kiosk operations. Only identities
            explicitly provisioned in Kiosk’s admin directory can enter.
          </p>
          {authMessage && (
            <p
              role="alert"
              className="mt-6 border border-[#D96845]/30 bg-[#D96845]/[.06] p-4 text-xs leading-6 text-[#E5B5A6]"
            >
              {authMessage}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 text-xs text-[#E5B5A6]">
              {error}
            </p>
          )}
          <button
            onClick={() => void startLogin()}
            disabled={authBusy}
            className="mt-8 flex h-12 items-center justify-center gap-3 bg-[#EDE7DC] px-5 text-sm font-semibold text-[#11110F] transition hover:bg-white disabled:opacity-50"
          >
            {authBusy ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <KeyRound size={16} />
            )}
            Continue with admin sign-in
          </button>
          <p className="mt-5 text-[10px] leading-5 text-[#716D65]">
            Enforce MFA in the identity provider. Merchant sign-in does not
            grant access.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#11110F] text-[#EDE7DC]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[248px] shrink-0 border-r border-white/[.08] bg-[#151410] p-5 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2 py-3">
            <span className="grid h-8 w-8 place-items-center border border-[#D96845]/50 text-[#D96845]">
              <Command size={15} />
            </span>
            <span className="text-xs font-semibold tracking-[.2em]">
              KIOSK / OPS
            </span>
          </div>
          <p className="mb-3 mt-12 px-3 text-[9px] uppercase tracking-[.2em] text-[#77736B]">
            Workspace
          </p>
          <nav className="space-y-1">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`flex w-full items-center gap-3 px-3 py-3 text-left text-xs transition ${section === item.id ? "bg-[#D96845]/10 text-[#E8A18D]" : "text-[#9B968C] hover:bg-white/[.04] hover:text-[#EDE7DC]"}`}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-white/[.08] pt-5">
            <div className="text-xs font-medium">
              {admin.displayName || admin.email}
            </div>
            <div className="mt-1 text-[10px] text-[#77736B]">
              {admin.role.replaceAll("_", " ")}
            </div>
            <button
              onClick={() => {
                setToken(null);
                setAdmin(null);
                setError("");
                setOverview(null);
                setRows([]);
              }}
              className="mt-5 flex items-center gap-2 text-[11px] text-[#9B968C] hover:text-white"
            >
              <LogOut size={13} /> Sign out
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex min-h-[72px] items-center justify-between border-b border-white/[.08] px-5 sm:px-8">
            <div>
              <p className="text-[9px] uppercase tracking-[.2em] text-[#77736B]">
                Kiosk / Operations
              </p>
              <h1 className="mt-1 text-lg font-semibold tracking-[-.03em]">
                {title}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-2 text-[10px] text-[#8E897F] sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[#80A88A]" /> Admin
                session active
              </span>
              <button
                onClick={() => token && void loadSection(token, section)}
                className="grid h-9 w-9 place-items-center border border-white/10 text-[#A49D90] hover:text-white"
                aria-label="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </header>

          <div className="border-b border-white/[.07] px-5 py-3 lg:hidden">
            <div className="flex gap-2 overflow-x-auto">
              {visibleNav.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`shrink-0 px-3 py-2 text-[11px] ${section === item.id ? "bg-[#D96845]/15 text-[#E8A18D]" : "text-[#9B968C]"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto max-w-[1440px] p-5 sm:p-8">
            {busy && (
              <div className="mb-5 flex items-center gap-2 text-xs text-[#8E897F]">
                <LoaderCircle className="animate-spin" size={14} /> Loading
                operational data…
              </div>
            )}
            {authBusy && (
              <div className="mb-5 text-[10px] text-[#77736B]">
                Checking admin session…
              </div>
            )}
            {error && (
              <div
                role="alert"
                className="mb-6 border border-[#D96845]/30 bg-[#D96845]/[.06] p-4 text-xs text-[#E5B5A6]"
              >
                {error}
              </div>
            )}

            {section === "overview" && overview && (
              <>
                <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[.18em] text-[#77736B]">
                      Platform pulse
                    </p>
                    <p className="mt-2 text-xs text-[#A49D90]">
                      Operational activity across Master MCP and Business MCP
                    </p>
                  </div>
                  <span className="text-[10px] text-[#77736B]">
                    Updated{" "}
                    {new Date(overview.generatedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    [
                      "MCP requests · 24h",
                      overview.metrics.requests24h,
                      "Last 24 hours",
                    ],
                    [
                      "Tool executions · 24h",
                      overview.metrics.toolCalls24h,
                      "Last 24 hours",
                    ],
                    [
                      "Tool failures · 24h",
                      overview.metrics.failedTools24h,
                      "Last 24 hours",
                    ],
                    [
                      "MCP requests · 7d",
                      overview.metrics.requests7d,
                      "Last 7 days",
                    ],
                    [
                      "Tool executions · 7d",
                      overview.metrics.toolCalls7d,
                      "Last 7 days",
                    ],
                    [
                      "Business MCP initialize events · 7d",
                      overview.metrics.sessionStarts7d,
                      "Initialize events, not unique users",
                    ],
                    [
                      "Published businesses",
                      overview.metrics.publishedBusinesses,
                      "Currently active",
                    ],
                  ].map(([label, value, note]) => (
                    <div
                      key={String(label)}
                      className="border border-white/[.08] bg-[#171612] p-5"
                    >
                      <p className="text-[10px] uppercase tracking-[.14em] text-[#8E897F]">
                        {label}
                      </p>
                      <p className="mt-4 text-3xl font-semibold tracking-[-.05em] tabular-nums">
                        {Number(value).toLocaleString()}
                      </p>
                      <p className="mt-2 text-[10px] text-[#77736B]">{note}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-8 grid gap-5 xl:grid-cols-2">
                  <section className="border border-white/[.08] bg-[#171612]">
                    <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4">
                      <h2 className="text-xs font-semibold">
                        Requests by MCP endpoint
                      </h2>
                      <span className="text-[9px] uppercase tracking-[.15em] text-[#77736B]">
                        7 days
                      </span>
                    </div>
                    <DataTable rows={overview.requestsByEndpoint} />
                  </section>
                  <section className="border border-white/[.08] bg-[#171612]">
                    <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4">
                      <h2 className="text-xs font-semibold">
                        Observed AI clients
                      </h2>
                      <span className="text-[9px] uppercase tracking-[.15em] text-[#77736B]">
                        7 days
                      </span>
                    </div>
                    <DataTable rows={overview.topClients} />
                  </section>
                  <section className="border border-white/[.08] bg-[#171612]">
                    <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4">
                      <h2 className="text-xs font-semibold">
                        Most used MCP tools
                      </h2>
                      <span className="text-[9px] uppercase tracking-[.15em] text-[#77736B]">
                        7 days
                      </span>
                    </div>
                    <DataTable rows={overview.topTools} />
                  </section>
                  <section className="border border-white/[.08] bg-[#171612]">
                    <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4">
                      <h2 className="text-xs font-semibold">
                        Recent tool failures
                      </h2>
                      <span className="text-[9px] uppercase tracking-[.15em] text-[#77736B]">
                        7 days
                      </span>
                    </div>
                    <DataTable rows={overview.recentErrors} />
                  </section>
                </div>
                <p className="mt-6 max-w-4xl text-[10px] leading-5 text-[#77736B]">
                  {overview.measurementNote}
                </p>
                <div className="mt-5 flex flex-wrap gap-4 text-[10px] text-[#8E897F]">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck size={13} /> Restricted admin data
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock3 size={13} /> Counts are event-based
                  </span>
                </div>
              </>
            )}

            {section !== "overview" && (
              <section className="border border-white/[.08] bg-[#171612]">
                <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4">
                  <h2 className="text-xs font-semibold">{title}</h2>
                  <span className="text-[10px] text-[#77736B]">
                    {rows.length} records returned
                  </span>
                </div>
                {section === "feedback" && (
                  <p className="px-5 pt-4 text-[11px] leading-5 text-[#8E897F]">
                    Private merchant onboarding responses. Stored as metadata on
                    agent_events with eventType onboarding_feedback.
                  </p>
                )}
                <DataTable rows={rows} />
              </section>
            )}

            <footer className="mt-10 flex items-center justify-between border-t border-white/[.07] pt-5 text-[9px] uppercase tracking-[.14em] text-[#625F58]">
              <span>Kiosk internal operations</span>
              <span className="inline-flex items-center gap-2">
                <ArrowUpRight size={11} /> Not visible to merchants
              </span>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}

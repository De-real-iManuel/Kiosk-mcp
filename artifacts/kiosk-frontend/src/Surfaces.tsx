"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth, useClerk, SignIn, SignUp } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Eye,
  MapPin,
  Menu,
  Search,
  Settings,
  Store,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  useSearchMarketplace,
  useGetMarketplaceBusiness,
  useCreateMarketplaceEvent,
  useListMyBusinesses,
  useCreateBusiness,
  useUpdateBusiness,
  useSetBusinessPublished,
  useGetBusinessAnalytics,
  useDeleteBusiness,
} from "@workspace/api-client-react";
import { useCategories } from "@workspace/api-client-react";
import type {
  Business,
  BusinessAnalytics,
  BusinessInput,
} from "@workspace/api-client-react";
import { LoadingSpinner } from "@/components/ui/spinner";
import { Footer } from "@/components/Footer";

function getMcpUrl(slug: string): string {
  const base = (
    process.env.NEXT_PUBLIC_MCP_BASE_URL ?? "http://localhost:5001"
  ).replace(/\/$/, "");
  return `${base}/mcp/business/${slug}`;
}

function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Kiosk home"
      className={`inline-flex items-center gap-3 ${dark ? "text-[#12110F]" : "text-[#EDE7DC]"}`}
    >
      <WindowMark className="w-[15px]" />
      <span className="kiosk-wordmark text-[23px] leading-none">Kiosk</span>
    </Link>
  );
}

export function WindowMark({
  className = "",
  seed = "kiosk",
}: {
  className?: string;
  seed?: string;
}) {
  const hash = Array.from(seed).reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0,
    7,
  );
  const hue = [34, 167, 205, 12, 86, 276][hash % 6];
  const shift = hash % 3;
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M7 11h86v11H83v52c0 10.5-6.5 17-17 17H34c-10.5 0-17-6.5-17-17V22H7V11Zm28 34h30v19H35V45Z"
      />
      <path
        d={
          shift === 0
            ? "M35 45h30v7H35z"
            : shift === 1
              ? "M35 57h30v7H35z"
              : "M47 45h6v19h-6z"
        }
        fill={`hsl(${hue} 28% 61%)`}
      />
    </svg>
  );
}

function PublicHeader() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-black/10 bg-[#EDE7DC] text-[#12110F]">
      <div className="mx-auto flex min-h-[70px] max-w-[1280px] items-center justify-between gap-4 px-5 md:px-10">
        <Wordmark dark />

        {/* Desktop nav */}
        <nav
          className="hidden items-center gap-3 sm:gap-5 md:flex"
          aria-label="Main navigation"
        >
          <Link
            href="/marketplace"
            className="eyebrow text-[#625D53] hover:text-[#12110F]"
            data-testid="nav-marketplace"
          >
            Marketplace
          </Link>
          {isLoaded &&
            (isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="eyebrow text-[#625D53] hover:text-[#12110F]"
                  data-testid="nav-dashboard"
                >
                  Your Kiosks
                </Link>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-1.5 eyebrow text-[#777064] hover:text-[#12110F]"
                  data-testid="nav-settings"
                >
                  <Settings size={13} /> Settings
                </Link>
                <button
                  onClick={() => signOut({ redirectUrl: "/" })}
                  className="eyebrow text-[#777064] hover:text-[#12110F]"
                  data-testid="nav-sign-out"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/sign-in"
                className="eyebrow text-[#625D53] hover:text-[#12110F]"
                data-testid="nav-sign-in"
              >
                Sign in
              </Link>
            ))}
          <Link
            href="/create"
            className="surface-button !min-h-[40px] !px-3 !text-[11px] sm:!px-4"
            data-testid="nav-create"
          >
            Create a Kiosk <ArrowUpRight size={14} />
          </Link>
        </nav>

        {/* Mobile: just the CTA + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/create"
            className="surface-button !min-h-[36px] !px-3 !text-[11px]"
            data-testid="nav-create-mobile"
          >
            Create a Kiosk
          </Link>
          <button
            className="flex h-10 w-10 items-center justify-center text-[#12110F]"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="border-t border-black/10 bg-[#EDE7DC] px-5 pb-5 pt-3 md:hidden">
          <nav className="flex flex-col gap-0" aria-label="Mobile navigation">
            <Link
              href="/marketplace"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between py-3 text-sm font-medium border-b border-black/10"
            >
              Marketplace <ArrowUpRight size={15} />
            </Link>
            {isLoaded &&
              (isSignedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between py-3 text-sm font-medium border-b border-black/10"
                  >
                    Your Kiosks <ArrowUpRight size={15} />
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between py-3 text-sm font-medium border-b border-black/10"
                  >
                    Settings <Settings size={15} />
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      signOut({ redirectUrl: "/" });
                    }}
                    className="flex items-center justify-between py-3 text-sm font-medium text-[#777064] border-b border-black/10 w-full text-left"
                  >
                    Sign out <ArrowUpRight size={15} />
                  </button>
                </>
              ) : (
                <Link
                  href="/sign-in"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between py-3 text-sm font-medium border-b border-black/10"
                >
                  Sign in <ArrowUpRight size={15} />
                </Link>
              ))}
          </nav>
        </div>
      )}
    </header>
  );
}

function SiteFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="grain min-h-[100dvh] bg-[#EDE7DC] text-[#12110F]">
      <PublicHeader />
      {children}
      <Footer variant="paper" />
    </main>
  );
}

function BusinessGlyph({
  business,
  large = false,
}: {
  business: Business;
  large?: boolean;
}) {
  return (
    <div
      data-testid={`business-mark-${business.id}`}
      className={`grid shrink-0 place-items-center ${large ? "h-28 w-28" : "h-[68px] w-[68px]"} border border-black/10 bg-[#1C1A16] text-[#EDE7DC]`}
    >
      <WindowMark
        seed={business.id}
        className={large ? "w-[64px]" : "w-[38px]"}
      />
    </div>
  );
}

function BusinessCard({ business }: { business: Business }) {
  return (
    <Link
      href={`/marketplace/business?slug=${encodeURIComponent(business.slug)}`}
      data-testid={`business-card-${business.id}`}
      className="group flex min-h-[180px] flex-col justify-between border-t border-black/15 py-6 transition-colors hover:bg-black/[.025] sm:flex-row sm:items-center sm:gap-8"
    >
      <div className="flex items-start gap-5">
        <BusinessGlyph business={business} />
        <div>
          <p className="eyebrow text-[#777064]">{business.location}</p>
          <h2 className="mt-2 text-[24px] font-semibold leading-tight tracking-[-.055em]">
            {business.businessName}
          </h2>
          <p className="mt-2 line-clamp-2 max-w-[540px] text-sm leading-6 text-[#625D53]">
            {business.services}
          </p>
        </div>
      </div>
      <span className="mt-5 inline-flex items-center gap-2 self-end text-xs font-semibold sm:mt-0 sm:self-center">
        View Kiosk{" "}
        <ArrowUpRight
          className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          size={15}
        />
      </span>
    </Link>
  );
}

export function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const params = useMemo(
    () => ({
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(location.trim() ? { location: location.trim() } : {}),
    }),
    [search, location],
  );
  const { data, isLoading, isError, refetch } = useSearchMarketplace(params);
  return (
    <SiteFrame>
      <section className="fine-grid border-b border-black/10">
        <div className="mx-auto max-w-[1280px] px-5 py-14 md:px-10 md:py-20">
          <p className="eyebrow text-[#777064]">
            A directory of independent business
          </p>
          <h1 className="mt-5 max-w-[780px] text-[clamp(3.4rem,8vw,7.2rem)] font-semibold leading-[.86] tracking-[-.09em]">
            Find your
            <br />
            <span className="serif font-normal italic tracking-[-.06em]">
              next local.
            </span>
          </h1>
          <p className="serif mt-6 max-w-[570px] text-xl leading-7 text-[#625D53]">
            Clear, useful storefronts from the people who make a place what it
            is.
          </p>
          <form
            className="mt-10 grid gap-3 border border-black/10 bg-[#F2EDE4] p-3 sm:grid-cols-[1.3fr_1fr_auto]"
            onSubmit={(event) => event.preventDefault()}
            aria-label="Search the marketplace"
          >
            <label className="relative">
              <span className="sr-only">Business or service</span>
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777064]"
              />
              <input
                data-testid="marketplace-search"
                className="surface-input !border-transparent !bg-transparent !pl-11"
                placeholder="Business or service"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <label className="relative">
              <span className="sr-only">Location</span>
              <MapPin
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777064]"
              />
              <input
                data-testid="marketplace-location"
                className="surface-input !border-transparent !bg-transparent !pl-11"
                placeholder="City or neighborhood"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </label>
            <button
              className="surface-button min-w-[120px]"
              type="submit"
              data-testid="marketplace-submit"
            >
              Explore <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </section>
      <section className="mx-auto max-w-[1280px] px-5 py-12 md:px-10 md:py-16">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-[#777064]">The marketplace</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-.05em]">
              Open windows
            </h2>
          </div>
          {!isLoading && !isError && (
            <span
              data-testid="marketplace-result-count"
              className="mono text-[11px] text-[#777064]"
            >
              {data?.length ?? 0} LISTINGS
            </span>
          )}
        </div>
        {isLoading ? (
          <div
            className="space-y-5"
            data-testid="marketplace-loading"
            aria-label="Loading listings"
          >
            {[1, 2, 3].map((x) => (
              <div
                key={x}
                className="h-[150px] animate-pulse border-t border-black/10 bg-black/[.025]"
              />
            ))}
          </div>
        ) : isError ? (
          <div
            className="surface-status"
            role="alert"
            data-testid="marketplace-error"
          >
            The marketplace could not be reached.{" "}
            <button className="surface-link ml-1" onClick={() => refetch()}>
              Try again
            </button>
          </div>
        ) : data?.length ? (
          <div data-testid="marketplace-results">
            {data.map((business) => (
              <BusinessCard key={business.id} business={business} />
            ))}
          </div>
        ) : (
          <div
            className="border-y border-black/15 py-16 text-center"
            data-testid="marketplace-empty"
          >
            <Store className="mx-auto text-[#777064]" size={25} />
            <h3 className="mt-5 text-2xl font-semibold tracking-[-.05em]">
              No open windows yet
            </h3>
            <p className="serif mt-3 text-lg text-[#625D53]">
              Try another search or location.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setLocation("");
              }}
              className="surface-link mt-5 text-sm"
            >
              Clear search
            </button>
          </div>
        )}
      </section>
    </SiteFrame>
  );
}

function CopyMcpButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(getMcpUrl(slug));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      onClick={copy}
      className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-semibold hover:text-[#12110F]"
      data-testid="copy-mcp-url"
    >
      {copied ? (
        <>
          <Check size={11} /> Copied
        </>
      ) : (
        <>
          <Copy size={11} /> Copy MCP URL
        </>
      )}
    </button>
  );
}

function contactHref(contact: string | null | undefined) {
  if (!contact) return "#";
  const value = contact.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  if (/^\+?[\d\s().-]{7,}$/.test(value))
    return `tel:${value.replace(/[^\d+]/g, "")}`;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function BusinessDetailPage({ slug }: { slug: string }) {
  const query = useGetMarketplaceBusiness(slug);
  const event = useCreateMarketplaceEvent();
  const [copied, setCopied] = useState(false);
  const viewedSlug = useRef("");
  useEffect(() => {
    if (query.data && !query.isLoading && viewedSlug.current !== slug) {
      viewedSlug.current = slug;
      event.mutate({ slug, data: { eventType: "profile_view" } });
    }
    // Record the public profile view once per slug.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, !!query.data]);
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      event.mutate({ slug, data: { eventType: "copy_link" } });
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  }
  if (query.isLoading)
    return (
      <SiteFrame>
        <div
          className="mx-auto max-w-[1000px] animate-pulse px-5 py-20"
          data-testid="business-detail-loading"
        >
          <div className="h-8 w-32 bg-black/10" />
          <div className="mt-12 h-20 w-2/3 bg-black/10" />
          <div className="mt-6 h-40 bg-black/5" />
        </div>
      </SiteFrame>
    );
  if (query.isError || !query.data)
    return (
      <SiteFrame>
        <div
          className="mx-auto max-w-[900px] px-5 py-20"
          data-testid="business-detail-error"
        >
          <Link href="/marketplace" className="eyebrow text-[#777064]">
            <ArrowLeft className="mr-2 inline" size={13} /> Marketplace
          </Link>
          <h1 className="mt-10 text-4xl font-semibold tracking-[-.07em]">
            This window isnâ€™t open.
          </h1>
          <p className="mt-3 text-[#625D53]">
            The listing may have moved or is no longer published.
          </p>
        </div>
      </SiteFrame>
    );
  const business = query.data;
  return (
    <SiteFrame>
      <article
        className="mx-auto max-w-[1120px] px-5 py-9 md:px-10 md:py-14"
        data-testid="business-detail"
      >
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-xs text-[#625D53] hover:text-[#12110F]"
        >
          <ArrowLeft size={14} /> Marketplace
        </Link>
        <div className="mt-12 grid gap-9 md:grid-cols-[1fr_280px] md:gap-16">
          <div>
            <p className="eyebrow text-[#777064]">{business.location}</p>
            <div className="mt-5 flex items-start gap-5">
              <BusinessGlyph business={business} large />
              <h1
                className="text-[clamp(2.8rem,7vw,6rem)] font-semibold leading-[.88] tracking-[-.09em]"
                data-testid="business-name"
              >
                {business.businessName}
              </h1>
            </div>
            <p className="serif mt-9 max-w-[700px] whitespace-pre-line text-[clamp(1.4rem,2.5vw,2rem)] leading-[1.35] text-[#49453D]">
              {business.services}
            </p>
            <div className="mt-12 grid gap-8 border-t border-black/15 pt-7 sm:grid-cols-2">
              <div>
                <p className="eyebrow text-[#777064]">Made for</p>
                <p className="mt-3 leading-6">{business.audience}</p>
              </div>
              <div>
                <p className="eyebrow text-[#777064]">Hours</p>
                <p className="mt-3 whitespace-pre-line leading-6">
                  {business.hours}
                </p>
              </div>
            </div>
          </div>
          <aside className="h-fit border border-black/10 bg-[#F2EDE4] p-5 md:mt-20 md:sticky md:top-6">
            <p className="eyebrow text-[#777064]">Reach the business</p>
            {business.price && (
              <div className="mt-5 border-b border-black/10 pb-4">
                <p className="eyebrow text-[#777064]">Price</p>
                <p className="mt-2 text-lg font-semibold">{business.price}</p>
              </div>
            )}
            <a
              href={contactHref(business.contact)}
              target={
                /^https?:/i.test(contactHref(business.contact))
                  ? "_blank"
                  : undefined
              }
              rel="noreferrer"
              onClick={() =>
                event.mutate({ slug, data: { eventType: "contact_click" } })
              }
              className="surface-button mt-5 w-full"
              data-testid="contact-business"
            >
              Contact / book <ArrowUpRight size={15} />
            </a>
            {business.booking && (
              <p className="mt-3 text-xs text-[#625D53]">
                Booking requests{" "}
                {business.booking === "yes" ? "welcome" : "not available"}.
              </p>
            )}
            <button
              onClick={copyLink}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 border border-black/20 text-xs font-semibold hover:bg-black/[.04]"
              data-testid="copy-business-link"
            >
              {copied ? (
                <>
                  <Check size={14} /> Link copied
                </>
              ) : (
                <>
                  <Copy size={14} /> Copy link
                </>
              )}
            </button>
          </aside>
        </div>
      </article>
    </SiteFrame>
  );
}

const blankInput: BusinessInput = {
  businessName: "",
  services: "",
  audience: "",
  location: "",
  hours: "",
  contact: "",
  price: null,
  booking: null,
};

// Separate structured contact fields — the API accepts these via CreateBusinessBodyV2
// but the orval-generated BusinessInput type doesn't include them, so we track them
// separately and merge on submit.
const blankContact = {
  phone: "",
  whatsapp: "",
  website: "",
};

const CAPABILITY_OPTIONS = [
  {
    key: "ordering",
    question: "Can customers place orders?",
    hint: "e.g. food orders, product purchases",
  },
  {
    key: "booking",
    question: "Do customers need to book?",
    hint: "e.g. appointments, reservations, slots",
  },
  {
    key: "delivery",
    question: "Do you offer delivery?",
    hint: "e.g. home delivery, courier service",
  },
  {
    key: "products",
    question: "Do you have a product catalogue?",
    hint: "e.g. items with prices you want listed",
  },
] as const;

export function CreateBusinessSurface() {
  const { isLoaded, isSignedIn } = useAuth();
  const client = useQueryClient();
  const create = useCreateBusiness();
  const [form, setForm] = useState<BusinessInput>(blankInput);
  const [contact, setContact] = useState(blankContact);
  // These map plain business questions → MCP capabilities invisibly
  const [extraCaps, setExtraCaps] = useState<Record<string, boolean>>({
    ordering: false,
    booking: false,
    delivery: false,
    products: false,
  });
  const [createdName, setCreatedName] = useState("");

  function toggleCap(key: string) {
    setExtraCaps((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (create.isPending) return;
    // contact + information + services always enabled; owner's answers add the rest
    const allCaps = [
      "contact",
      "information",
      "services",
      ...Object.entries(extraCaps)
        .filter(([, v]) => v)
        .map(([k]) => k),
    ];
    create.mutate(
      {
        data: {
          ...form,
          // Legacy contact field — set to phone for backward compat
          contact:
            contact.phone ||
            contact.whatsapp ||
            contact.website ||
            form.contact,
          // Structured contact fields — accepted by CreateBusinessBodyV2
          phone: contact.phone || null,
          whatsapp: contact.whatsapp || null,
          website: contact.website || null,
          capabilities: allCaps.map((c) => ({
            capability: c as "contact",
            enabled: true,
          })),
        } as unknown as BusinessInput,
      },
      {
        onSuccess: (result) => {
          setCreatedName(result.businessName ?? form.businessName);
          client.invalidateQueries({ queryKey: ["/api/businesses"] });
        },
        onError: (err: unknown) => {
          const apiErr = err as { status?: number; data?: { error?: string } };
          if (apiErr?.status === 409) {
            // Duplicate draft — treat as success, navigate to dashboard
            setCreatedName(form.businessName);
            client.invalidateQueries({ queryKey: ["/api/businesses"] });
          }
          // All other errors: create.isError becomes true, message shown below
        },
      },
    );
  }

  if (!isLoaded)
    return (
      <SiteFrame>
        <div className="mx-auto max-w-4xl animate-pulse px-5 py-24">
          <div className="h-12 w-1/2 bg-black/10" />
        </div>
      </SiteFrame>
    );

  if (!isSignedIn)
    return (
      <SiteFrame>
        <div className="mx-auto max-w-[760px] px-5 py-20">
          <p className="eyebrow text-[#777064]">Owner access</p>
          <h1 className="mt-5 text-[clamp(2.6rem,7vw,5rem)] font-semibold leading-[.9] tracking-[-.08em]">
            Sign in to open
            <br />
            your window.
          </h1>
          <p className="serif mt-5 text-xl text-[#625D53]">
            Your Kiosk belongs to you. Sign in or create an account to save it.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-in?redirect_url=%2Fcreate"
              className="surface-button"
            >
              Sign in <ArrowRight size={15} />
            </Link>
            <Link
              href="/sign-up?redirect_url=%2Fcreate"
              className="surface-button surface-button-light"
            >
              Create account
            </Link>
          </div>
        </div>
      </SiteFrame>
    );

  return (
    <SiteFrame>
      <div className="mx-auto max-w-[1200px] px-5 pb-20 pt-8 md:px-10 md:pt-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-[#625D53] hover:text-[#12110F]"
        >
          <ArrowLeft size={14} /> Back to Kiosk
        </Link>

        {createdName ? (
          <section
            className="mx-auto mt-12 max-w-[760px] border border-black/10 bg-[#F2EDE4] p-6 md:p-12"
            data-testid="create-success"
            role="status"
          >
            <span className="grid h-12 w-12 place-items-center border border-black/20">
              <Check size={21} />
            </span>
            <p className="eyebrow mt-7 text-[#777064]">
              Draft saved / Not published
            </p>
            <h1 className="mt-4 text-[clamp(2rem,5vw,3.5rem)] font-semibold tracking-[-.07em]">
              {createdName} is in your Kiosks.
            </h1>
            <p className="serif mt-4 text-xl leading-7 text-[#625D53]">
              Your profile is saved as a draft. Review it and publish when
              you&apos;re ready.
            </p>
            <Link href="/dashboard" className="surface-button mt-8 inline-flex">
              Go to dashboard <ArrowRight size={15} />
            </Link>
          </section>
        ) : (
          <div className="mt-8 grid gap-8 md:mt-10 md:grid-cols-[.65fr_1.35fr] md:gap-14">
            {/* Desktop sidebar — hidden on mobile so the form is immediately visible */}
            <aside className="hidden md:block md:sticky md:top-8 md:self-start">
              <p className="eyebrow text-[#777064]">Your business / 01</p>
              <h1 className="mt-5 text-[clamp(2.8rem,5.5vw,4.5rem)] font-semibold leading-[.9] tracking-[-.08em]">
                Open your
                <br />
                window.
              </h1>
              <p className="serif mt-6 text-[21px] leading-[1.3] text-[#625D53]">
                A few clear details help customers and agents understand what
                you offer.
              </p>
              <div className="mt-8 flex items-center gap-3 border-t border-black/15 pt-5">
                <span className="grid h-8 w-8 shrink-0 place-items-center border border-black/20">
                  <span className="mono text-[10px]">01</span>
                </span>
                <span className="eyebrow text-[#777064]">Business details</span>
                <span className="ml-auto mono text-[10px] text-[#777064]">
                  ~2 MIN
                </span>
              </div>
            </aside>

            {/* Mobile-only compact header above the form */}
            <div className="md:hidden">
              <p className="eyebrow text-[#777064]">Create your Kiosk</p>
              <h1 className="mt-2 text-[2.2rem] font-semibold leading-[.9] tracking-[-.07em]">
                Open your window.
              </h1>
              <p className="mt-2 text-[14px] leading-6 text-[#625D53]">
                Fill in your details below. Takes about two minutes.
              </p>
            </div>

            <section
              className="border border-white/10 bg-[#1C1A16] p-5 text-[#EDE7DC] shadow-[0_18px_70px_rgba(0,0,0,.12)] sm:p-7 md:p-10"
              data-testid="create-business-form"
            >
              <p className="eyebrow border-b border-white/15 pb-5 text-[#A49D90]">
                Tell us about your business
              </p>
              {create.isError &&
                (() => {
                  const apiErr = create.error as {
                    status?: number;
                    data?: { error?: string };
                  } | null;
                  const status = apiErr?.status;
                  const msg =
                    status === 400
                      ? "Some details look incorrect. Check your business name and contact fields, then try again."
                      : status === 401
                        ? "You need to be signed in to save a Kiosk. Please refresh and sign in."
                        : status === 429
                          ? "Too many requests. Please wait a moment and try again."
                          : "We could not save this Kiosk. Your details are still here — please try again.";
                  return (
                    <p
                      className="mt-5 border-l-2 border-[#D1786B] bg-[#D1786B]/10 p-3 text-sm text-[#E8B2A8]"
                      role="alert"
                      data-testid="create-error"
                    >
                      {msg}
                    </p>
                  );
                })()}
              <form className="mt-6 space-y-5" onSubmit={submit}>
                {/* Core fields */}
                {(
                  [
                    [
                      "businessName",
                      "Business name",
                      "e.g. Mama's Kitchen",
                      true,
                    ],
                    [
                      "services",
                      "What do you offer?",
                      "Describe what you sell or do. A few sentences is plenty.",
                      true,
                    ],
                    [
                      "audience",
                      "Who is it for?",
                      "e.g. Families, commuters, local restaurants",
                      true,
                    ],
                    [
                      "location",
                      "Location or service area",
                      "e.g. Port Harcourt, or within 10 km of Ikeja",
                      true,
                    ],
                    ["hours", "Opening hours", "e.g. Mon–Sat 8am–8pm", true],
                  ] as const
                ).map(([key, label, hint, required]) => (
                  <label className="block" key={key}>
                    <span className="form-label">
                      {label}
                      {required && (
                        <span className="ml-1 text-[#8A8478]">*</span>
                      )}
                    </span>
                    <span className="form-hint block mb-2">{hint}</span>
                    {key === "services" || key === "hours" ? (
                      <textarea
                        required
                        rows={key === "services" ? 3 : 2}
                        className="field-control resize-y"
                        value={form[key]}
                        onChange={(e) =>
                          setForm({ ...form, [key]: e.target.value })
                        }
                        data-testid={`create-${key}`}
                      />
                    ) : (
                      <input
                        required
                        className="field-control"
                        value={form[key]}
                        onChange={(e) =>
                          setForm({ ...form, [key]: e.target.value })
                        }
                        data-testid={`create-${key}`}
                      />
                    )}
                  </label>
                ))}

                {/* Separate contact fields — phone, WhatsApp, website */}
                <div className="border-t border-white/15 pt-5">
                  <p className="form-label mb-1">
                    How can customers reach you?
                    <span className="ml-1 text-[#8A8478]">*</span>
                  </p>
                  <p className="form-hint mb-4">
                    At least one contact method is required to publish.
                  </p>

                  <div className="space-y-4">
                    <label className="block">
                      <span className="form-label">Phone number</span>
                      <span className="form-hint block mb-2">
                        e.g. +234 801 234 5678
                      </span>
                      <input
                        className="field-control"
                        inputMode="tel"
                        value={contact.phone}
                        onChange={(e) =>
                          setContact({ ...contact, phone: e.target.value })
                        }
                        data-testid="create-phone"
                        placeholder="+234 801 234 5678"
                      />
                    </label>

                    <label className="block">
                      <span className="form-label">
                        WhatsApp number
                        <span className="ml-1 text-[#8A8478] text-[11px]">
                          (international format)
                        </span>
                      </span>
                      <span className="form-hint block mb-2">
                        Digits only, e.g. 2348012345678
                      </span>
                      <input
                        className="field-control"
                        inputMode="tel"
                        value={contact.whatsapp}
                        onChange={(e) =>
                          setContact({ ...contact, whatsapp: e.target.value })
                        }
                        data-testid="create-whatsapp"
                        placeholder="2348012345678"
                      />
                    </label>

                    <label className="block">
                      <span className="form-label">Website</span>
                      <span className="form-hint block mb-2">
                        e.g. https://mamaskitchen.ng
                      </span>
                      <input
                        className="field-control"
                        inputMode="url"
                        value={contact.website}
                        onChange={(e) =>
                          setContact({ ...contact, website: e.target.value })
                        }
                        data-testid="create-website"
                        placeholder="https://mamaskitchen.ng"
                      />
                    </label>
                  </div>
                </div>

                {/* Price — optional */}
                <label className="block border-t border-white/15 pt-5">
                  <span className="form-label">Starting price or range</span>
                  <span className="form-hint block mb-2">
                    Optional — e.g. From ₦2,500
                  </span>
                  <input
                    className="field-control"
                    placeholder="e.g. From ₦2,500 or ₦1,500–₦8,000"
                    value={form.price ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value || null })
                    }
                    data-testid="create-price"
                  />
                </label>

                {/* Plain-English business capability questions */}
                <div className="border-t border-white/15 pt-5">
                  <p className="form-label mb-1">
                    What can customers do with your business?
                  </p>
                  <p className="form-hint mb-4">
                    Tick everything that applies. AI assistants will help
                    customers with these automatically.
                  </p>
                  <div className="space-y-2">
                    {CAPABILITY_OPTIONS.map(({ key, question, hint }) => {
                      const active = extraCaps[key] ?? false;
                      return (
                        <label
                          key={key}
                          className={`flex cursor-pointer items-start gap-3 border p-3 transition-colors ${
                            active
                              ? "border-[#EDE7DC]/50 bg-white/5"
                              : "border-white/10 hover:border-white/20"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 accent-[#EDE7DC]"
                            checked={active}
                            onChange={() => toggleCap(key)}
                          />
                          <span>
                            <span className="block text-[14px] font-semibold leading-snug">
                              {question}
                            </span>
                            <span className="mt-0.5 block text-[12px] text-[#A49D90]">
                              {hint}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Submit */}
                <div className="border-t border-white/15 pt-5">
                  <button
                    className="surface-button surface-button-light w-full justify-between sm:w-auto sm:min-w-[240px]"
                    disabled={create.isPending}
                    type="submit"
                    data-testid="create-submit"
                  >
                    {create.isPending ? "Saving…" : "Save draft Kiosk"}{" "}
                    <ArrowRight size={16} />
                  </button>
                  <p className="mt-4 text-[11px] leading-5 text-[#A49D90]">
                    Your Kiosk is not public until you publish it from the
                    dashboard.
                  </p>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </SiteFrame>
  );
}

// ─── Completeness Indicator ───────────────────────────────────────────────────

function CompletenessBar({ business }: { business: Business }) {
  const fields: Array<{ label: string; filled: boolean }> = [
    { label: "Name", filled: !!business.businessName },
    { label: "Services", filled: !!business.services },
    { label: "Audience", filled: !!business.audience },
    { label: "Location", filled: !!business.location },
    { label: "Hours", filled: !!business.hours },
    { label: "Contact", filled: !!business.contact },
    { label: "Price", filled: !!business.price },
  ];
  const filled = fields.filter((f) => f.filled).length;
  const pct = Math.round((filled / fields.length) * 100);
  if (pct === 100) return null; // fully complete — don't show

  return (
    <div
      className="mt-4 border border-black/10 bg-[#F2EDE4] px-4 py-3"
      data-testid={`completeness-${business.id}`}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow text-[#777064]">Profile completeness</p>
        <span className="mono text-[10px] text-[#777064]">{pct}%</span>
      </div>
      <div className="mt-2 h-[3px] w-full bg-black/10">
        <div
          className="h-full bg-[#12110F] transition-all duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completeness"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        {fields.map(({ label, filled }) => (
          <span
            key={label}
            className={`text-[10px] ${filled ? "text-[#47745F]" : "text-[#9C493F]"}`}
          >
            {filled ? "✓" : "✗"} {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Publish Preview Modal ─────────────────────────────────────────────────────

function PreviewModal({
  business,
  onConfirm,
  onCancel,
  isPublishing,
}: {
  business: Business;
  onConfirm: () => void;
  onCancel: () => void;
  isPublishing: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-[640px] bg-[#EDE7DC] text-[#12110F]"
      >
        <div className="border-b border-black/10 px-6 py-4">
          <p className="eyebrow text-[#777064]">Before you publish</p>
          <h2
            id="preview-title"
            className="mt-1 text-xl font-semibold tracking-[-.05em]"
          >
            How your Kiosk will appear
          </h2>
        </div>
        <div className="px-6 py-5">
          <div className="border border-black/10 bg-white p-5">
            <p className="eyebrow text-[#777064]">{business.location}</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-.06em]">
              {business.businessName}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#625D53]">
              {business.services}
            </p>
            {business.price && (
              <p className="mt-3 text-sm font-semibold">{business.price}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-4 border-t border-black/10 pt-4 text-xs text-[#777064]">
              <span>Hours: {business.hours}</span>
              <span>For: {business.audience}</span>
            </div>
          </div>
          <p className="mt-4 text-[12px] leading-5 text-[#777064]">
            This is how your business will look to customers and AI agents on
            the marketplace. You can unpublish at any time.
          </p>
        </div>
        <div className="flex justify-end gap-3 border-t border-black/10 px-6 py-4">
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-2 border border-black/20 px-4 py-2 text-[13px] font-semibold text-[#625D53] transition-colors hover:border-black/40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPublishing}
            className="surface-button !min-h-10 !px-5"
          >
            {isPublishing ? "Publishing…" : "Publish Kiosk"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const PIE_COLORS = ["#12110F", "#8A8478", "#EDE7DC"];

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: { date: string; profileViews: number };
  }>;
}

function AreaTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#12110F] px-2 py-1 text-[10px] text-[#EDE7DC]">
      <span className="mono">{payload[0].payload.date.slice(5)}</span>
      <span className="ml-2">{payload[0].value} views</span>
    </div>
  );
}

function RecentActivity({ analytics }: { analytics: BusinessAnalytics }) {
  const entries = analytics.daily
    .filter((d) => d.profileViews + d.contactClicks + d.linkCopies > 0)
    .slice(-5)
    .reverse();
  if (!entries.length) return null;
  return (
    <div className="mt-5 border-t border-black/10 pt-4">
      <p className="eyebrow mb-3 text-[#777064]">Recent activity</p>
      <ul className="space-y-2">
        {entries.map((d) => (
          <li
            key={d.date}
            className="flex items-center gap-3 text-[12px] text-[#625D53]"
          >
            <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-[#12110F]" />
            <span className="mono text-[10px] text-[#777064]">
              {d.date.slice(5)}
            </span>
            <span>
              {d.profileViews} views · {d.contactClicks} contacts ·{" "}
              {d.linkCopies} copies
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function computeTrend(last7: number, prev7: number): number | null {
  if (prev7 === 0) return null;
  return Math.round(((last7 - prev7) / prev7) * 100);
}

function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null) return null;
  const positive = trend >= 0;
  return (
    <span
      className={`font-mono ml-1 text-[10px] ${positive ? "text-[#47745F]" : "text-[#9C493F]"}`}
    >
      {positive ? "▲" : "▼"}
      {Math.abs(trend)}%
    </span>
  );
}

function AnalyticsPanel({ business }: { business: Business }) {
  const query = useGetBusinessAnalytics(business.id, {
    query: {
      enabled: business.status === "published",
      queryKey: [`/api/businesses/${business.id}/analytics`],
    },
  });
  const [showOnMobile, setShowOnMobile] = useState(false);

  if (business.status !== "published")
    return (
      <div
        className="surface-status mt-5 text-[#625D53]"
        data-testid={`analytics-draft-${business.id}`}
      >
        Publish this Kiosk to start seeing activity.
      </div>
    );
  if (query.isLoading)
    return (
      <div
        className="mt-5 flex h-28 items-center justify-center"
        data-testid={`analytics-loading-${business.id}`}
      >
        <LoadingSpinner size={32} />
      </div>
    );
  if (query.isError || !query.data)
    return (
      <div
        className="surface-status mt-5"
        role="alert"
        data-testid={`analytics-error-${business.id}`}
      >
        Activity could not load.{" "}
        <button className="surface-link" onClick={() => query.refetch()}>
          Retry
        </button>
      </div>
    );
  const analytics = query.data;

  // Trend: last 7 days vs prior 7 days
  const last7 = analytics.daily.slice(-7);
  const prev7 = analytics.daily.slice(-14, -7);
  const sumBy = (arr: typeof last7, key: keyof (typeof arr)[0]) =>
    arr.reduce((s, d) => s + (d[key] as number), 0);
  const trendViews = computeTrend(
    sumBy(last7, "profileViews"),
    sumBy(prev7, "profileViews"),
  );
  const trendContact = computeTrend(
    sumBy(last7, "contactClicks"),
    sumBy(prev7, "contactClicks"),
  );
  const trendCopies = computeTrend(
    sumBy(last7, "linkCopies"),
    sumBy(prev7, "linkCopies"),
  );

  const statCards = [
    { label: "Views", value: analytics.viewsLast30Days, trend: trendViews },
    {
      label: "Contact",
      value: analytics.contactClicksLast30Days,
      trend: trendContact,
    },
    {
      label: "Copies",
      value: analytics.linkCopiesLast30Days,
      trend: trendCopies,
    },
  ];

  const pieData = [
    { name: "Views", value: analytics.viewsLast30Days },
    { name: "Contact", value: analytics.contactClicksLast30Days },
    { name: "Copies", value: analytics.linkCopiesLast30Days },
  ];

  return (
    <div
      className="mt-5 border-t border-black/10 pt-5"
      data-testid={`analytics-${business.id}`}
    >
      {/* Mobile toggle header */}
      <button
        className="flex w-full items-center justify-between md:cursor-default"
        onClick={() => setShowOnMobile((s) => !s)}
        aria-expanded={showOnMobile}
        aria-controls={`analytics-body-${business.id}`}
      >
        <p className="eyebrow text-[#777064]">Activity / last 30 days</p>
        <span className="md:hidden text-[#777064]">
          {showOnMobile ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      <div
        id={`analytics-body-${business.id}`}
        className={`${showOnMobile ? "block" : "hidden"} md:block`}
      >
        {/* Stat cards with trend */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {statCards.map(({ label, value, trend }) => (
            <div key={label} className="border border-black/10 px-3 py-3">
              <p className="mono text-[9px] text-[#777064]">{label}</p>
              <p className="mt-1 text-xl font-semibold tracking-[-.05em]">
                {value}
                <TrendBadge trend={trend} />
              </p>
            </div>
          ))}
        </div>

        {/* Area chart */}
        <div
          className="mt-5"
          role="img"
          aria-label="Daily profile views for the last 30 days"
          data-testid={`analytics-chart-${business.id}`}
        >
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart
              data={analytics.daily}
              margin={{ top: 4, right: 0, bottom: 0, left: -28 }}
            >
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#12110F" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#12110F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={(v: string, i: number) =>
                  i % 5 === 0 ? v.slice(5) : ""
                }
                tick={{ fontSize: 9, fill: "#777064" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#777064" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip content={<AreaTooltip />} />
              <Area
                type="monotone"
                dataKey="profileViews"
                stroke="#12110F"
                strokeWidth={1.5}
                fill="url(#viewsGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut + legend */}
        <div className="mt-4 flex items-center gap-4">
          <div role="img" aria-label="Event type breakdown">
            <PieChart width={80} height={80}>
              <Pie
                data={pieData}
                cx={35}
                cy={35}
                innerRadius={20}
                outerRadius={35}
                dataKey="value"
                paddingAngle={2}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </div>
          <ul className="space-y-1">
            {pieData.map((d, i) => (
              <li
                key={d.name}
                className="flex items-center gap-2 text-[11px] text-[#625D53]"
              >
                <span
                  className="h-[8px] w-[8px] shrink-0 rounded-full"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                {d.name}: {d.value}
              </li>
            ))}
          </ul>
        </div>

        <RecentActivity analytics={analytics} />
      </div>
      {/* end mobile-collapsible body */}
    </div>
  );
}

function OwnerCard({ business }: { business: Business }) {
  const client = useQueryClient();
  const update = useUpdateBusiness();
  const publish = useSetBusinessPublished();
  const deleteBusiness = useDeleteBusiness();
  const [editing, setEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  // Delete confirmation: 'idle' → 'confirm' (first click) → fires delete
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm">("idle");
  const [form, setForm] = useState<BusinessInput>({
    businessName: business.businessName,
    services: business.services,
    audience: business.audience,
    location: business.location,
    hours: business.hours,
    contact: business.contact,
    price: business.price,
    booking: business.booking,
  });

  function refresh() {
    client.invalidateQueries({ queryKey: ["/api/businesses"] });
    client.invalidateQueries({ queryKey: ["/api/marketplace"] });
  }

  function handlePublishToggle() {
    if (business.status !== "published") {
      // Show preview before publishing
      setShowPreview(true);
    } else {
      // Unpublishing — no preview needed
      publish.mutate(
        { id: business.id, data: { published: false } },
        {
          onSuccess: () => {
            refresh();
            toast.success("Kiosk unpublished");
          },
          onError: () => toast.error("Could not unpublish. Try again."),
        },
      );
    }
  }

  function confirmPublish() {
    publish.mutate(
      { id: business.id, data: { published: true } },
      {
        onSuccess: () => {
          setShowPreview(false);
          refresh();
          toast.success(
            `${business.businessName} is now live on the marketplace`,
          );
        },
        onError: (err: unknown) => {
          // The API returns 422 with {blocking: string[], recommended: string[]}
          // when required fields are missing. Show specific guidance.
          const apiErr = err as {
            status?: number;
            response?: { data?: { blocking?: string[]; error?: string } };
          };
          if (apiErr?.status === 422) {
            const blocking: string[] = apiErr?.response?.data?.blocking ?? [];
            const fieldLabels: Record<string, string> = {
              businessName: "business name",
              location: "location",
              contact: "contact method (phone, WhatsApp, or website)",
              categoryId: "category",
            };
            if (blocking.length > 0) {
              const missing = blocking
                .map((f) => fieldLabels[f] ?? f)
                .join(", ");
              toast.error(`Complete your profile first: ${missing}`);
            } else {
              toast.error(
                apiErr?.response?.data?.error ??
                  "Profile is not ready to publish.",
              );
            }
            setShowPreview(false);
          } else {
            toast.error("Could not publish. Try again.");
          }
        },
      },
    );
  }

  return (
    <article
      className="border-t border-black/15 py-7"
      data-testid={`owner-business-${business.id}`}
    >
      {showPreview && (
        <PreviewModal
          business={business}
          onConfirm={confirmPublish}
          onCancel={() => setShowPreview(false)}
          isPublishing={publish.isPending}
        />
      )}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="flex items-start gap-4">
          <BusinessGlyph business={business} />
          <div>
            <p className="eyebrow text-[#777064]">{business.location}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-.06em]">
              {business.businessName}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#625D53]">
              {business.services ?? ""}
            </p>
            <span
              className={`eyebrow mt-3 inline-block ${business.status === "published" ? "text-[#47745F]" : "text-[#777064]"}`}
              data-testid={`business-status-${business.id}`}
            >
              {business.status === "published" ? "Published" : "Draft"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="surface-button surface-button-light !min-h-10 !px-3"
            onClick={() => setEditing(!editing)}
            data-testid={`edit-business-${business.id}`}
          >
            {editing ? "Close editor" : "Edit details"}
          </button>
          <button
            className="surface-button !min-h-10 !px-3"
            disabled={publish.isPending}
            onClick={handlePublishToggle}
            data-testid={`publish-business-${business.id}`}
          >
            {business.status === "published" ? "Unpublish" : "Publish Kiosk"}
          </button>

          {/* Delete — two-step confirmation so it can't be fired by accident */}
          {deleteStep === "idle" ? (
            <button
              className="surface-button surface-button-light !min-h-10 !px-3 !text-[#9C493F] border-[#9C493F]/30 hover:border-[#9C493F]"
              onClick={() => setDeleteStep("confirm")}
              disabled={business.status === "published"}
              title={
                business.status === "published"
                  ? "Unpublish this Kiosk before deleting"
                  : "Delete this Kiosk"
              }
              data-testid={`delete-business-${business.id}`}
            >
              Delete
            </button>
          ) : (
            <div className="flex items-center gap-2 border border-[#9C493F]/40 bg-[#9C493F]/5 px-3 py-1.5">
              <span className="text-[12px] text-[#9C493F]">
                Delete permanently?
              </span>
              <button
                className="text-[12px] font-semibold text-[#9C493F] underline hover:no-underline"
                disabled={deleteBusiness.isPending}
                onClick={() => {
                  deleteBusiness.mutate(business.id, {
                    onSuccess: () => {
                      toast.success(`${business.businessName} deleted`);
                      client.invalidateQueries({
                        queryKey: ["/api/businesses"],
                      });
                    },
                    onError: (err: unknown) => {
                      const msg =
                        (err as { message?: string })?.message ??
                        "Could not delete";
                      toast.error(
                        msg.includes("Unpublish")
                          ? "Unpublish this Kiosk before deleting."
                          : "Delete failed. Try again.",
                      );
                      setDeleteStep("idle");
                    },
                  });
                }}
                data-testid={`delete-confirm-${business.id}`}
              >
                {deleteBusiness.isPending ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                className="text-[12px] text-[#777064] hover:text-[#12110F]"
                onClick={() => setDeleteStep("idle")}
                data-testid={`delete-cancel-${business.id}`}
              >
                Cancel
              </button>
            </div>
          )}
          {business.status === "published" && deleteStep === "idle" && (
            <p className="w-full text-[11px] text-[#777064] mt-1">
              Unpublish first to enable deletion.
            </p>
          )}
        </div>
      </div>

      <CompletenessBar business={business} />

      {editing && (
        <form
          className="mt-6 grid gap-4 border border-black/10 bg-[#F2EDE4] p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate(
              { id: business.id, data: form },
              {
                onSuccess: () => {
                  setEditing(false);
                  refresh();
                  toast.success("Changes saved");
                },
                onError: () =>
                  toast.error("Could not save changes. Try again."),
              },
            );
          }}
          data-testid={`edit-form-${business.id}`}
        >
          {(
            [
              "businessName",
              "services",
              "audience",
              "location",
              "hours",
              "contact",
              "price",
            ] as const
          ).map((key) => (
            <label
              key={key}
              className={key === "services" ? "sm:col-span-2" : ""}
            >
              <span className="surface-label">
                {key === "businessName"
                  ? "Business name"
                  : key.charAt(0).toUpperCase() + key.slice(1)}
              </span>
              {key === "services" || key === "hours" ? (
                <textarea
                  rows={key === "services" ? 3 : 2}
                  className="surface-input"
                  value={form[key] ?? ""}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              ) : (
                <input
                  className="surface-input"
                  value={form[key] ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [key]: e.target.value || (key === "price" ? null : ""),
                    })
                  }
                />
              )}
            </label>
          ))}
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              className="surface-button"
              type="submit"
              disabled={update.isPending}
              data-testid={`save-business-${business.id}`}
            >
              {update.isPending ? "Saving…" : "Save changes"}
            </button>
            {update.isError && (
              <span role="alert" className="text-sm text-[#9C493F]">
                Could not save changes. Try again.
              </span>
            )}
          </div>
        </form>
      )}

      {business.status === "published" && (
        <div
          className="mt-5 border border-black/10 bg-[#F2EDE4] p-4"
          data-testid={`mcp-panel-${business.id}`}
        >
          <p className="eyebrow text-[10px] text-[#777064]">
            AI-readable business presence — ACTIVE
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 overflow-hidden border border-black/10 bg-white px-3 py-2">
            <span
              className="mono truncate text-[11px] text-[#625D53]"
              data-testid={`mcp-url-${business.id}`}
            >
              {getMcpUrl(business.slug)}
            </span>
            <CopyMcpButton slug={business.slug} />
          </div>
          <p className="mt-2 text-[10px] leading-4 text-[#777064]">
            Share this URL on your website, social media, or with developers.
          </p>
          <div className="mt-3 flex items-center gap-4 border-t border-black/10 pt-3">
            <Link
              className="surface-link text-[11px]"
              href={`/marketplace/business?slug=${encodeURIComponent(business.slug)}`}
            >
              View public profile{" "}
              <ExternalLink size={10} className="inline ml-0.5" />
            </Link>
          </div>
        </div>
      )}

      <AnalyticsPanel business={business} />
      {publish.isError && (
        <p role="alert" className="mt-3 text-sm text-[#9C493F]">
          Could not change publishing status. Try again.
        </p>
      )}
    </article>
  );
}

function AnimatedCount({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const [count, setCount] = useState(reduceMotion ? value : 0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (reduceMotion) {
      setCount(value);
      return;
    }
    let start: number | null = null;
    const duration = 600;
    const step = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.round(progress * value));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, reduceMotion]);

  return (
    <p className="mt-1 text-2xl font-semibold tracking-[-.05em]">{count}</p>
  );
}

function StatCards({ businesses }: { businesses: Business[] }) {
  const total = businesses.length;
  const published = businesses.filter((b) => b.status === "published").length;
  const earliest = businesses
    .map(
      (b) =>
        (b as unknown as Record<string, unknown>).createdAt as
          string | undefined,
    )
    .filter((v): v is string => Boolean(v))
    .sort()[0];
  const activeSince = earliest
    ? new Date(earliest).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="border border-black/10 bg-[#F2EDE4] px-4 py-4">
        <p className="eyebrow text-[#777064] mb-1">Total Kiosks</p>
        <AnimatedCount value={total} />
      </div>
      <div className="border border-black/10 bg-[#F2EDE4] px-4 py-4">
        <p className="eyebrow text-[#777064] mb-1">Published</p>
        <AnimatedCount value={published} />
      </div>
      <div className="border border-black/10 bg-[#F2EDE4] px-4 py-4">
        <p className="eyebrow text-[#777064] mb-1">Active Since</p>
        <p className="mt-1 text-2xl font-semibold tracking-[-.05em]">
          {activeSince}
        </p>
      </div>
    </div>
  );
}

function LiveTimestamp() {
  const [time, setTime] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    setTime(fmt());
    intervalRef.current = setInterval(() => setTime(fmt()), 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!time) return null;
  return (
    <p className="mono mt-3 text-[10px] text-[#777064]">Last updated {time}</p>
  );
}

export function DashboardPage() {
  const reduceMotion = useReducedMotion();
  const { isLoaded, isSignedIn } = useAuth();
  const businessesQuery = useListMyBusinesses({
    query: { enabled: isLoaded && !!isSignedIn, queryKey: ["/api/businesses"] },
  });
  const businesses = businessesQuery.data;
  if (!isLoaded)
    return (
      <SiteFrame>
        <div className="mx-auto max-w-5xl animate-pulse px-5 py-24">
          <div className="h-12 w-1/2 bg-black/10" />
        </div>
      </SiteFrame>
    );
  if (!isSignedIn)
    return (
      <SiteFrame>
        <div className="mx-auto max-w-[760px] px-5 py-20">
          <p className="eyebrow text-[#777064]">Owner access</p>
          <h1 className="mt-5 text-5xl font-semibold tracking-[-.08em]">
            Your Kiosks,
            <br />
            in one place.
          </h1>
          <p className="serif mt-5 text-xl text-[#625D53]">
            Sign in to manage your business windows and activity.
          </p>
          <Link
            href="/sign-in?redirect_url=%2Fdashboard"
            className="surface-button mt-8"
          >
            Sign in <ArrowRight size={15} />
          </Link>
        </div>
      </SiteFrame>
    );
  return (
    <SiteFrame>
      <div className="mx-auto max-w-[1200px] px-5 py-12 md:px-10 md:py-16">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow text-[#777064]">Owner dashboard</p>
            <h1 className="mt-4 text-[clamp(3rem,7vw,6rem)] font-semibold leading-[.88] tracking-[-.09em]">
              Your Kiosks.
            </h1>
            <p className="serif mt-5 text-xl text-[#625D53]">
              Keep your details current. Publish only when you&apos;re ready.
            </p>
            <LiveTimestamp />
          </div>
          <Link
            href="/create"
            className="surface-button self-start sm:self-end"
          >
            Create a Kiosk <ArrowRight size={15} />
          </Link>
        </div>
        <section className="mt-12" data-testid="dashboard-businesses">
          <div className="mb-4 flex justify-between border-b border-black/15 pb-4">
            <h2 className="eyebrow text-[#777064]">Your business windows</h2>
            {!businessesQuery.isLoading && !businessesQuery.isError && (
              <span className="mono text-[10px] text-[#777064]">
                {businesses?.length ?? 0} TOTAL
              </span>
            )}
          </div>
          {!businessesQuery.isLoading &&
            !businessesQuery.isError &&
            businesses &&
            businesses.length > 0 && <StatCards businesses={businesses} />}
          {businessesQuery.isLoading ? (
            <div className="space-y-5" data-testid="dashboard-loading">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse border-t border-black/10 bg-black/[.025]"
                />
              ))}
            </div>
          ) : businessesQuery.isError ? (
            <div
              className="surface-status"
              role="alert"
              data-testid="dashboard-error"
            >
              Your Kiosks could not load.{" "}
              <button
                className="surface-link"
                onClick={() => businessesQuery.refetch()}
              >
                Retry
              </button>
            </div>
          ) : businesses?.length ? (
            <div>
              {businesses.map((business, index) => (
                <motion.div
                  key={business.id}
                  {...(!reduceMotion
                    ? {
                        initial: { opacity: 0, y: 20 },
                        animate: { opacity: 1, y: 0 },
                        transition: {
                          delay: index * 0.08,
                          duration: 0.5,
                          ease: [0.22, 1, 0.36, 1],
                        },
                      }
                    : {})}
                >
                  <OwnerCard business={business} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div
              className="border-y border-black/15 py-14"
              data-testid="dashboard-empty"
            >
              <p className="eyebrow text-[#777064]">Get started</p>
              <h2 className="mt-5 text-2xl font-semibold tracking-[-.05em]">
                Your first window is waiting.
              </h2>
              <p className="serif mt-3 text-lg text-[#625D53]">
                Follow three steps to get your business in front of AI agents.
              </p>
              <div className="mt-8 grid gap-px bg-black/10 sm:grid-cols-3">
                {[
                  {
                    step: "01",
                    label: "Create",
                    desc: "Fill in your business details. Takes about two minutes.",
                  },
                  {
                    step: "02",
                    label: "Review",
                    desc: "Check your profile looks right before anything goes live.",
                  },
                  {
                    step: "03",
                    label: "Publish",
                    desc: "Make your Kiosk visible to customers and AI agents.",
                  },
                ].map(({ step, label, desc }) => (
                  <div key={step} className="bg-[#EDE7DC] p-5">
                    <span className="mono text-[10px] text-[#777064]">
                      {step}
                    </span>
                    <p className="mt-3 text-[15px] font-semibold tracking-[-.03em]">
                      {label}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-5 text-[#625D53]">
                      {desc}
                    </p>
                  </div>
                ))}
              </div>
              <Link href="/create" className="surface-button mt-8 self-start">
                Create your Kiosk <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </section>
      </div>
    </SiteFrame>
  );
}

export function AuthSurface({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { isLoaded, isSignedIn } = useAuth();
  const isSignIn = mode === "sign-in";
  if (isLoaded && isSignedIn)
    return (
      <SiteFrame>
        <section
          className="mx-auto max-w-[760px] px-5 py-20"
          data-testid="auth-already-signed-in"
        >
          <p className="eyebrow text-[#777064]">Youâ€™re signed in</p>
          <h1 className="mt-5 text-5xl font-semibold tracking-[-.08em]">
            Back to your
            <br />
            window.
          </h1>
          <Link href="/dashboard" className="surface-button mt-8">
            Open dashboard <ArrowRight size={15} />
          </Link>
        </section>
      </SiteFrame>
    );
  return (
    <SiteFrame>
      <section className="mx-auto grid min-h-[calc(100dvh-145px)] max-w-[1120px] items-center gap-10 px-5 py-12 md:grid-cols-[.8fr_1.2fr] md:px-10">
        <div>
          <p className="eyebrow text-[#777064]">Kiosk / Owner access</p>
          <h1 className="mt-5 text-[clamp(3rem,7vw,6rem)] font-semibold leading-[.88] tracking-[-.09em]">
            {isSignIn ? "Good to have you" : "Make room for"}
            <br />
            <span className="serif font-normal italic tracking-[-.06em]">
              {isSignIn ? "back." : "your business."}
            </span>
          </h1>
          <p className="serif mt-6 max-w-md text-xl leading-7 text-[#625D53]">
            Your business, clearly in view. Sign in to manage your details and
            publishing.
          </p>
          <div className="mt-8 flex items-center gap-4 text-xs text-[#777064]">
            {isSignIn ? (
              <>
                <span>New to Kiosk?</span>
                <Link
                  className="surface-link font-semibold text-[#12110F]"
                  href="/sign-up"
                >
                  Create an account
                </Link>
              </>
            ) : (
              <>
                <span>Already have an account?</span>
                <Link
                  className="surface-link font-semibold text-[#12110F]"
                  href="/sign-in"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
        <div
          className="flex justify-center border border-black/10 bg-[#F2EDE4] p-5 sm:p-9"
          data-testid={isSignIn ? "sign-in-panel" : "sign-up-panel"}
        >
          {!isLoaded ? (
            <div
              className="h-[440px] w-full max-w-[420px] animate-pulse bg-black/[.04]"
              aria-label="Loading authentication"
            />
          ) : isSignIn ? (
            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              forceRedirectUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "!bg-transparent !shadow-none !border-0 !p-0",
                  headerTitle: "!font-semibold !tracking-[-.05em]",
                  headerSubtitle: "!text-[#625D53]",
                  formButtonPrimary: "!bg-[#12110F] hover:!bg-[#34312B]",
                  footerActionLink: "!text-[#12110F] !underline",
                },
              }}
            />
          ) : (
            <SignUp
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              forceRedirectUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "!bg-transparent !shadow-none !border-0 !p-0",
                  headerTitle: "!font-semibold !tracking-[-.05em]",
                  headerSubtitle: "!text-[#625D53]",
                  formButtonPrimary: "!bg-[#12110F] hover:!bg-[#34312B]",
                  footerActionLink: "!text-[#12110F] !underline",
                },
              }}
            />
          )}
        </div>
      </section>
    </SiteFrame>
  );
}

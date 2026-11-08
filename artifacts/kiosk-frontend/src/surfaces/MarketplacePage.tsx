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
  CalendarCheck,
  Clock3,
  Tag,
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
  useCategories,
  useSubmitFeedback,
} from "@workspace/api-client-react";
import type {
  Business,
  BusinessAnalytics,
  BusinessInput,
  BusinessUpdate,
} from "@workspace/api-client-react";
import { LoadingSpinner } from "@/components/ui/spinner";
import { Footer } from "@/components/Footer";
import { COUNTRIES } from "@/lib/countries";

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

type MarketplaceCardData = Business & {
  mcpEndpoint?: string | null;
  capabilities?: string[];
  city?: string | null;
  country?: string | null;
  timezone?: string | null;
  openingHours?: Record<string, { open: string; close: string; closed: boolean } | null> | null;
};

function getLiveBusinessStatus(
  openingHours: MarketplaceCardData["openingHours"],
  timezone: string | null | undefined,
): "open" | "closed" | null {
  if (!openingHours) return null;

  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  let weekday: string;
  let minutes: number;

  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      ...(timezone ? { timeZone: timezone } : {}),
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    weekday = values.weekday.toLowerCase();
    minutes = Number(values.hour) * 60 + Number(values.minute);
  } catch {
    return null;
  }

  const dayIndex = days.indexOf(weekday);
  if (dayIndex < 0) return null;

  const today = openingHours[weekday];
  const previousDay = openingHours[days[(dayIndex + 6) % 7]];
  const toMinutes = (value: string) => {
    const [hours, mins] = value.split(":").map(Number);
    return hours * 60 + mins;
  };

  // Account for businesses whose opening hours run past midnight.
  if (previousDay && !previousDay.closed) {
    const previousOpen = toMinutes(previousDay.open);
    const previousClose = toMinutes(previousDay.close);
    if (previousClose <= previousOpen && minutes < previousClose) return "open";
  }

  if (!today) return null;
  if (today.closed) return "closed";

  const openAt = toMinutes(today.open);
  const closeAt = toMinutes(today.close);
  const isOpen = closeAt <= openAt
    ? minutes >= openAt || minutes < closeAt
    : minutes >= openAt && minutes < closeAt;

  return isOpen ? "open" : "closed";
}

function BusinessCard({ business }: { business: Business }) {
  const listing = business as MarketplaceCardData;
  const liveStatus = getLiveBusinessStatus(listing.openingHours, listing.timezone);
  const agentReady = Boolean(listing.mcpEndpoint);
  const primaryLocation = listing.city || listing.location || "Local business";
  const secondaryLocation =
    listing.location && listing.city && listing.location.toLowerCase() !== listing.city.toLowerCase()
      ? listing.location
      : listing.country && listing.city
        ? listing.country
        : "";

  return (
    <Link
      href={`/marketplace/business?slug=${encodeURIComponent(business.slug)}`}
      data-testid={`business-card-${business.id}`}
      className="group flex h-full min-h-[300px] flex-col border border-black/10 bg-[#F2EDE4] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#D96845]/50 hover:shadow-[0_16px_40px_rgba(18,17,15,.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C45A3A] sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {agentReady && (
            <span className="inline-flex items-center gap-1.5 border border-[#47745F]/25 bg-[#47745F]/[.08] px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[.12em] text-[#47745F]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#47745F]" />
              MCP available
            </span>
          )}
          <span className="eyebrow text-[9px] text-[#777064]">Kiosk window</span>
        </div>
        {liveStatus && (
          <span
            className={liveStatus === "open"
              ? "inline-flex items-center gap-1.5 rounded-full bg-[#47745F]/10 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[.1em] text-[#47745F]"
              : "inline-flex items-center gap-1.5 rounded-full bg-black/[.055] px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[.1em] text-[#777064]"}
            aria-label={liveStatus === "open" ? "Currently open" : "Currently closed"}
          >
            <span className={liveStatus === "open" ? "h-1.5 w-1.5 rounded-full bg-[#47745F]" : "h-1.5 w-1.5 rounded-full bg-[#8A8478]"} />
            {liveStatus === "open" ? "Open now" : "Closed"}
          </span>
        )}
      </div>

      <div className="mt-6 flex items-start gap-4">
        <BusinessGlyph business={business} />
        <div className="min-w-0 flex-1 pt-1">
          <h2 className="text-[22px] font-semibold leading-[1.05] tracking-[-.06em] transition-colors group-hover:text-[#A94F35] sm:text-2xl">
            {business.businessName}
          </h2>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-[#625D53]">
            <MapPin size={12} className="shrink-0 text-[#A94F35]" />
            <span className="truncate">{primaryLocation}</span>
          </p>
          {secondaryLocation && (
            <p className="mt-1 truncate pl-[18px] text-[10px] text-[#8A8478]">
              {secondaryLocation}
            </p>
          )}
        </div>
      </div>

      <p className="mt-6 line-clamp-3 min-h-[4.5rem] text-[13px] leading-6 text-[#625D53]">
        {business.description || business.services || "Open this Kiosk window to explore the business and its offerings."}
      </p>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-black/10 pt-4 text-[11px] text-[#625D53]">
        {business.hours && (
          <span className="inline-flex min-w-0 items-start gap-1.5">
            <Clock3 size={13} className="mt-0.5 shrink-0 text-[#A94F35]" />
            <span className="line-clamp-2">{business.hours}</span>
          </span>
        )}
        {business.price && (
          <span className="inline-flex items-center gap-1.5">
            <Tag size={13} className="shrink-0 text-[#A94F35]" />
            <span>{business.price}</span>
          </span>
        )}
      </div>

      {business.booking === "yes" && (
        <p className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.12em] text-[#47745F]">
          <CalendarCheck size={13} /> Booking requests welcome
        </p>
      )}

      <span className="mt-auto flex items-center justify-between gap-3 border-t border-black/10 pt-5 text-xs font-semibold">
        <span>Open in Kiosk</span>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#C45A3A] text-[#F7F3EC] transition-transform duration-300 group-hover:translate-x-1">
          <ArrowUpRight size={16} />
        </span>
      </span>
    </Link>
  );
}

export function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [activeLocation, setActiveLocation] = useState("");
  const categories = useCategories();
  const categoryList = (categories.data ?? []) as Array<{ id: string; name: string }>;
  const params = useMemo(
    () => ({
      ...(activeSearch.trim() ? { search: activeSearch.trim() } : {}),
      ...(activeLocation.trim() ? { location: activeLocation.trim() } : {}),
    }),
    [activeSearch, activeLocation],
  );
  const { data, isLoading, isError, refetch } = useSearchMarketplace(params);
  const hasFilters = Boolean(activeSearch.trim() || activeLocation.trim());

  function clearFilters() {
    setSearch("");
    setLocation("");
    setActiveSearch("");
    setActiveLocation("");
  }

  function chooseCategory(name: string) {
    const next = activeSearch === name ? "" : name;
    setSearch(next);
    setActiveSearch(next);
  }

  return (
    <SiteFrame>
      <section className="relative overflow-hidden border-b border-black/10">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] bg-[#C45A3A]/[.055] md:block" />
        <div className="fine-grid relative">
          <div className="mx-auto max-w-[1280px] px-5 py-14 md:px-10 md:py-20">
            <p className="eyebrow flex items-center gap-2 text-[#777064]">
              <span className="h-2 w-2 rounded-full bg-[#C45A3A]" />
              Independent businesses, easier to discover
            </p>
            <h1 className="mt-5 max-w-[800px] text-[clamp(3.4rem,8vw,7.2rem)] font-semibold leading-[.86] tracking-[-.09em]">
              Find your
              <br />
              <span className="serif font-normal italic tracking-[-.06em] text-[#C45A3A]">
                next local.
              </span>
            </h1>
            <p className="serif mt-6 max-w-[570px] text-xl leading-7 text-[#625D53]">
              Discover the people, services and independent businesses around you.
            </p>

            <form
              className="mt-10 grid gap-2 border border-black/10 bg-[#F7F3EC] p-2 shadow-[0_14px_40px_rgba(18,17,15,.045)] sm:grid-cols-[1.3fr_1fr_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                setActiveSearch(search);
                setActiveLocation(location);
              }}
              aria-label="Search the marketplace"
            >
              <label className="relative">
                <span className="sr-only">Business or service</span>
                <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777064]" />
                <input
                  data-testid="marketplace-search"
                  className="surface-input !min-h-12 !border-transparent !bg-transparent !pl-11"
                  placeholder="What are you looking for?"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label className="relative">
                <span className="sr-only">Location</span>
                <MapPin size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777064]" />
                <input
                  data-testid="marketplace-location"
                  className="surface-input !min-h-12 !border-transparent !bg-transparent !pl-11"
                  placeholder="City or neighbourhood"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
              </label>
              <button className="surface-button min-h-12 min-w-[132px] !bg-[#C45A3A] hover:!bg-[#A9482D]" type="submit" data-testid="marketplace-submit">
                Explore <ArrowRight size={16} />
              </button>
            </form>

            {categoryList.length > 0 && (
              <div className="mt-7">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="eyebrow text-[#777064]">Browse by category</p>
                  {activeSearch && categoryList.some((category) => category.name === activeSearch) && (
                    <button type="button" onClick={() => chooseCategory(activeSearch)} className="text-[11px] font-medium text-[#A94F35] hover:underline">
                      Clear category
                    </button>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categoryList.slice(0, 12).map((category) => {
                    const selected = activeSearch === category.name;
                    return (
                      <button
                        key={category.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => chooseCategory(category.name)}
                        className={`min-h-9 shrink-0 rounded-full border px-4 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C45A3A] ${selected ? "border-[#C45A3A] bg-[#C45A3A] text-white" : "border-black/15 bg-[#F2EDE4]/70 text-[#625D53] hover:border-[#C45A3A] hover:text-[#A94F35]"}`}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 py-12 md:px-10 md:py-16">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-[#777064]">The marketplace</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-.05em]">Open windows</h2>
            <p className="mt-1 text-sm text-[#777064]">
              {hasFilters ? "Results matching your search" : "Independent businesses worth knowing"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!isLoading && !isError && (
              <span data-testid="marketplace-result-count" className="mono text-[11px] text-[#777064]">
                {data?.length ?? 0} {data?.length === 1 ? "LISTING" : "LISTINGS"}
              </span>
            )}
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="text-[11px] font-semibold text-[#A94F35] underline underline-offset-4">
                Clear filters
              </button>
            )}
          </div>
        </div>

        {hasFilters && (
          <div className="mb-5 flex flex-wrap gap-2" aria-label="Active filters">
            {activeSearch && <span className="rounded-full bg-[#C45A3A]/10 px-3 py-1.5 text-[11px] text-[#93432E]">Search: {activeSearch}</span>}
            {activeLocation && <span className="rounded-full bg-[#C45A3A]/10 px-3 py-1.5 text-[11px] text-[#93432E]">Location: {activeLocation}</span>}
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="marketplace-loading" aria-label="Loading listings">
            {[1, 2, 3, 4, 5, 6].map((x) => (
              <div key={x} className="h-[260px] animate-pulse border border-black/10 bg-black/[.025]" />
            ))}
          </div>
        ) : isError ? (
          <div className="surface-status" role="alert" data-testid="marketplace-error">
            The marketplace could not be reached.{" "}
            <button className="surface-link ml-1" onClick={() => refetch()}>Try again</button>
          </div>
        ) : data?.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="marketplace-results">
            {data.map((business) => <BusinessCard key={business.id} business={business} />)}
          </div>
        ) : (
          <div className="border-y border-black/15 py-16 text-center" data-testid="marketplace-empty">
            <Store className="mx-auto text-[#C45A3A]" size={27} />
            <h3 className="mt-5 text-2xl font-semibold tracking-[-.05em]">No open windows yet</h3>
            <p className="serif mt-3 text-lg text-[#625D53]">
              {hasFilters ? "We couldn't find a match. Try a different service or location." : "New independent businesses will appear here as they join Kiosk."}
            </p>
            {hasFilters && <button onClick={clearFilters} className="surface-link mt-5 text-sm">Clear search</button>}
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

type WindowCatalogueEntry = {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  available: boolean;
  category?: string | null;
};

type MarketplaceWindowData = {
  id: string;
  slug: string;
  businessName: string;
  description: string | null;
  servicesSummary: string | null;
  audience: string | null;
  booking: "yes" | "no" | null;
  categoryName: string | null;
  location: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  openingHours: Record<string, { open: string; close: string; closed: boolean } | null> | null;
  timezone: string | null;
  products: WindowCatalogueEntry[];
  services: WindowCatalogueEntry[];
  agentFacts: {
    serves: string | null;
    doesNotOffer: string[] | null;
    booking: "accepted" | "not_accepted" | "unknown";
    verification: {
      status: "unverified" | "partially_verified" | "verified";
      verifiedFields: string[];
    };
  };
};

function formatBusinessHours(
  openingHours: MarketplaceWindowData["openingHours"],
  timezone: string | null,
): string {
  if (!openingHours) return "";
  const rows = Object.entries(openingHours).flatMap(([day, hours]) => {
    if (!hours) return [];
    const label = day.charAt(0).toUpperCase() + day.slice(1);
    return [label + ": " + (hours.closed ? "Closed" : hours.open + "–" + hours.close)];
  });
  return rows.length
    ? rows.join("\n") + (timezone ? "\nTimezone: " + timezone : "")
    : "";
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

  if (query.isLoading) {
    return (
      <SiteFrame>
        <div className="mx-auto max-w-[1000px] animate-pulse px-5 py-20" data-testid="business-detail-loading">
          <div className="h-8 w-32 bg-black/10" />
          <div className="mt-12 h-20 w-2/3 bg-black/10" />
          <div className="mt-6 h-40 bg-black/5" />
        </div>
      </SiteFrame>
    );
  }

  if (query.isError || !query.data) {
    return (
      <SiteFrame>
        <div className="mx-auto max-w-[900px] px-5 py-20" data-testid="business-detail-error">
          <Link href="/marketplace" className="eyebrow text-[#777064]">
            <ArrowLeft className="mr-2 inline" size={13} /> Marketplace
          </Link>
          <h1 className="mt-10 text-4xl font-semibold tracking-[-.07em]">This window isn’t open.</h1>
          <p className="mt-3 text-[#625D53]">The listing may have moved or is no longer published.</p>
        </div>
      </SiteFrame>
    );
  }

  // The public profile endpoint returns the enriched Marketplace shape. The
  // generated legacy client type still describes the older, smaller response.
  const business = query.data as unknown as MarketplaceWindowData;
  const products = business.products ?? [];
  const services = business.services ?? [];
  const locationText = business.location || [business.city, business.country].filter(Boolean).join(", ");
  const hoursText = formatBusinessHours(business.openingHours, business.timezone);
  const rawWhatsapp = (business.whatsapp || "").trim();
  const whatsappDigits = rawWhatsapp.replace(/\D/g, "");
  const whatsappUrl = /^https?:\/\//i.test(rawWhatsapp)
    ? rawWhatsapp
    : whatsappDigits.length >= 7
      ? "https://wa.me/" + whatsappDigits
      : "";
  const contact = whatsappUrl ||
    (business.phone ? contactHref(business.phone) : "") ||
    (business.website ? contactHref(business.website) : "");
  const externalContact = /^https?:/i.test(contact);
  const contactLabel = whatsappUrl
    ? "Message on WhatsApp"
    : business.phone
      ? "Call the business"
      : "Visit business website";
  const bookingText = business.agentFacts.booking === "accepted"
    ? "This business accepts booking requests."
    : business.agentFacts.booking === "not_accepted"
      ? "This business has stated that it does not accept booking requests."
      : "Booking availability has not been confirmed by this business.";
  const verificationText = business.agentFacts.verification.status === "verified"
    ? "Verified"
    : business.agentFacts.verification.status === "partially_verified"
      ? "Partially verified"
      : "Not yet verified";

  return (
    <SiteFrame>
      <article className="mx-auto max-w-[1120px] px-5 py-8 md:px-10 md:py-12" data-testid="business-detail">
        <Link href="/marketplace" className="inline-flex items-center gap-2 text-xs text-[#625D53] transition-colors hover:text-[#C45A3A]">
          <ArrowLeft size={14} /> Back to marketplace
        </Link>

        <div className="mt-8 border-y border-black/10 py-8 md:py-12">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[.13em] text-[#777064]">
            <span className="h-2 w-2 rounded-full bg-[#C45A3A]" />
            Kiosk Business Window
            {business.categoryName && (
              <>
                <span className="text-black/25">/</span>
                <span>{business.categoryName}</span>
              </>
            )}
            {locationText && (
              <>
                <span className="text-black/25">/</span>
                <span>{locationText}</span>
              </>
            )}
          </div>
          <div className="mt-6 grid items-start gap-7 md:grid-cols-[1fr_230px] md:items-center">
            <div className="flex min-w-0 items-start gap-4 sm:gap-6">
              <BusinessGlyph business={business as unknown as Business} large />
              <div className="min-w-0">
                <h1 className="text-[clamp(2.7rem,7vw,6rem)] font-semibold leading-[.88] tracking-[-.09em]" data-testid="business-name">
                  {business.businessName}
                </h1>
                <p className="mt-4 max-w-[620px] text-sm leading-6 text-[#625D53]">
                  {business.description || business.servicesSummary || "Contact this business to learn more about what it offers."}
                </p>
              </div>
            </div>
            <button onClick={copyLink} className="inline-flex min-h-11 items-center justify-center gap-2 border border-black/15 px-4 text-xs font-semibold transition-colors hover:border-[#C45A3A] hover:text-[#A94F35]" data-testid="copy-business-link">
              {copied ? <><Check size={14} /> Link copied</> : <><Copy size={14} /> Share this window</>}
            </button>
          </div>
        </div>

        <div className="grid gap-10 py-9 md:grid-cols-[1fr_300px] md:gap-16 md:py-12">
          <div className="space-y-10">
            {(business.description || business.servicesSummary || business.audience || business.agentFacts.serves) && (
              <section aria-labelledby="business-about">
                <p className="eyebrow text-[#C45A3A]">The business</p>
                <h2 id="business-about" className="mt-2 text-2xl font-semibold tracking-[-.05em]">About this business</h2>
                {business.description && (
                  <p className="serif mt-5 max-w-[720px] whitespace-pre-line text-xl leading-8 text-[#49453D]">
                    {business.description}
                  </p>
                )}
                {business.servicesSummary && (
                  <div className="mt-5">
                    <p className="eyebrow text-[#777064]">What they offer</p>
                    <p className="mt-2 max-w-[720px] whitespace-pre-line text-sm leading-7 text-[#49453D]">
                      {business.servicesSummary}
                    </p>
                  </div>
                )}
                {(business.agentFacts.serves || business.audience) && (
                  <div className="mt-7 border-l-2 border-[#C45A3A]/60 pl-4">
                    <p className="eyebrow text-[#777064]">A good fit for</p>
                    <p className="mt-2 text-sm leading-6 text-[#49453D]">{business.agentFacts.serves || business.audience}</p>
                  </div>
                )}
              </section>
            )}

            {(services.length > 0 || products.length > 0) && (
              <section className="border-t border-black/10 pt-7" aria-labelledby="business-catalogue">
                <p className="eyebrow text-[#C45A3A]">Catalogue</p>
                <h2 id="business-catalogue" className="mt-2 text-2xl font-semibold tracking-[-.05em]">Products and services</h2>
                {services.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold">Services</h3>
                    <div className="mt-3 divide-y divide-black/10 border-y border-black/10">
                      {services.map((service) => (
                        <div key={service.id} className="flex items-start justify-between gap-4 py-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{service.name}</p>
                            {service.description && <p className="mt-1 text-xs leading-5 text-[#625D53]">{service.description}</p>}
                            {!service.available && <p className="mt-2 text-[10px] font-semibold uppercase tracking-[.1em] text-[#9C493F]">Currently unavailable</p>}
                          </div>
                          {service.price && <p className="shrink-0 text-sm font-semibold">{service.price}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {products.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-semibold">Products</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {products.map((product) => (
                        <div key={product.id} className="border border-black/10 bg-[#F2EDE4] p-4">
                          {product.category && <p className="eyebrow text-[#777064]">{product.category}</p>}
                          <p className="mt-1 text-sm font-semibold">{product.name}</p>
                          {product.description && <p className="mt-2 text-xs leading-5 text-[#625D53]">{product.description}</p>}
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold">{product.price || "Price on request"}</p>
                            <span className={product.available ? "text-[10px] font-semibold uppercase tracking-[.1em] text-[#47745F]" : "text-[10px] font-semibold uppercase tracking-[.1em] text-[#9C493F]"}>
                              {product.available ? "Available" : "Unavailable"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {business.agentFacts.doesNotOffer && business.agentFacts.doesNotOffer.length > 0 && (
              <section className="border-t border-black/10 pt-7" aria-labelledby="business-exclusions">
                <p className="eyebrow text-[#777064]">Service boundaries</p>
                <h2 id="business-exclusions" className="mt-2 text-xl font-semibold tracking-[-.04em]">What they don’t offer</h2>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-[#625D53]">
                  {business.agentFacts.doesNotOffer.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
            )}

            <section className="border-t border-black/10 pt-7" aria-labelledby="business-practical">
              <p className="eyebrow text-[#C45A3A]">Plan your visit</p>
              <h2 id="business-practical" className="mt-2 text-2xl font-semibold tracking-[-.05em]">Useful details</h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <MapPin size={17} className="mt-0.5 shrink-0 text-[#C45A3A]" />
                  <div>
                    <p className="text-xs font-semibold">Location</p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#625D53]">{locationText || "Contact for location details"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock3 size={17} className="mt-0.5 shrink-0 text-[#C45A3A]" />
                  <div>
                    <p className="text-xs font-semibold">Opening hours</p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#625D53]">{hoursText || "Contact the business to confirm opening hours."}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarCheck size={17} className="mt-0.5 shrink-0 text-[#C45A3A]" />
                  <div>
                    <p className="text-xs font-semibold">Booking</p>
                    <p className="mt-1 text-sm leading-6 text-[#625D53]">{bookingText}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check size={17} className="mt-0.5 shrink-0 text-[#C45A3A]" />
                  <div>
                    <p className="text-xs font-semibold">Business verification</p>
                    <p className="mt-1 text-sm leading-6 text-[#625D53]">{verificationText}</p>
                    {business.agentFacts.verification.verifiedFields.length > 0 && (
                      <p className="mt-1 text-xs text-[#777064]">Verified: {business.agentFacts.verification.verifiedFields.join(", ")}</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside className="h-fit border border-black/10 bg-[#F2EDE4] p-5 md:sticky md:top-6">
            <p className="eyebrow text-[#777064]">Get in touch</p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-.05em]">Talk to the business</h2>
            <p className="mt-2 text-xs leading-5 text-[#625D53]">Ask a question, confirm availability or discuss what you need directly with the business.</p>
            {contact ? (
              <a
                href={contact}
                target={externalContact ? "_blank" : undefined}
                rel={externalContact ? "noreferrer" : undefined}
                onClick={() => event.mutate({ slug, data: { eventType: "contact_click" } })}
                className="surface-button mt-5 w-full !bg-[#C45A3A] hover:!bg-[#A9482D]"
                data-testid="contact-business"
              >
                {contactLabel} <ArrowUpRight size={15} />
              </a>
            ) : (
              <p className="mt-5 border border-black/10 px-3 py-3 text-xs text-[#777064]" data-testid="contact-business">
                This business hasn’t added public contact details yet.
              </p>
            )}
            <div className="mt-5 border-t border-black/10 pt-4">
              <p className="eyebrow text-[#777064]">Kiosk</p>
              <p className="mt-2 text-[11px] leading-5 text-[#777064]">A clearer way for people and AI assistants to discover local businesses.</p>
            </div>
          </aside>
        </div>
      </article>
    </SiteFrame>
  );
}
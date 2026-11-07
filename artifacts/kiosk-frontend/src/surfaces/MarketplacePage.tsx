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

function BusinessCard({ business }: { business: Business }) {
  return (
    <Link
      href={`/marketplace/business?slug=${encodeURIComponent(business.slug)}`}
      data-testid={`business-card-${business.id}`}
      className="group flex h-full flex-col border border-black/10 bg-[#F2EDE4] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#D96845]/50 hover:shadow-[0_16px_40px_rgba(18,17,15,.08)] sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <BusinessGlyph business={business} />
          <div className="min-w-0">
            <p className="eyebrow truncate text-[#777064]">{business.location}</p>
            <h2 className="mt-2 text-xl font-semibold leading-tight tracking-[-.055em] group-hover:text-[#A94F35]">
              {business.businessName}
            </h2>
          </div>
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10 transition-colors group-hover:border-[#D96845] group-hover:bg-[#D96845] group-hover:text-[#EDE7DC]" aria-hidden="true">
          <ArrowUpRight size={16} />
        </span>
      </div>
      <p className="mt-5 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-[#625D53]">
        {business.services || "Contact this business to learn more about its services."}
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
      <span className="mt-auto inline-flex items-center gap-2 pt-5 text-xs font-semibold">
        View business details
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
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
  return (
    <SiteFrame>
      <section className="fine-grid border-b border-black/10">
        <div className="mx-auto max-w-[1280px] px-5 py-14 md:px-10 md:py-20">
          <p className="eyebrow text-[#777064]">
            Independent businesses, easier to discover
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
            onSubmit={(event) => {
              event.preventDefault();
              setActiveSearch(search);
              setActiveLocation(location);
            }}
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
          {categoryList.length > 0 && (
            <div className="mt-6">
              <p className="eyebrow mb-3 text-[#777064]">Explore by category</p>
              <div className="flex flex-wrap gap-2">
                {categoryList.slice(0, 10).map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setSearch(category.name);
                      setActiveSearch(category.name);
                      setActiveLocation(location);
                    }}
                    className={`min-h-9 border px-3 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D96845] ${activeSearch === category.name ? "border-[#D96845] bg-[#D96845] text-white" : "border-black/15 bg-transparent text-[#625D53] hover:border-[#D96845] hover:text-[#A94F35]"}`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}
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

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

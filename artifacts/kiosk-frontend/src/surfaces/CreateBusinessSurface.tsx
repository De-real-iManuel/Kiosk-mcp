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
  const [location, setLocation] = useState({ city: "", country: "" });
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
          city: location.city || null,
          country: location.country || null,
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
                      "e.g. 10b Agip Road, Port Harcourt",
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

                {/* City + Country — structured for AI discovery */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="form-label">
                      City <span className="ml-1 text-[#8A8478]">*</span>
                    </span>
                    <span className="form-hint block mb-2">
                      e.g. Port Harcourt
                    </span>
                    <input
                      required
                      className="field-control"
                      value={location.city}
                      placeholder="Port Harcourt"
                      onChange={(e) =>
                        setLocation({ ...location, city: e.target.value })
                      }
                      data-testid="create-city"
                    />
                  </label>
                  <label className="block">
                    <span className="form-label">
                      Country <span className="ml-1 text-[#8A8478]">*</span>
                    </span>
                    <span className="form-hint block mb-2">
                      Where is your business based?
                    </span>
                    <select
                      required
                      className="field-control"
                      value={location.country}
                      onChange={(e) =>
                        setLocation({ ...location, country: e.target.value })
                      }
                      data-testid="create-country"
                    >
                      <option value="">Select country</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

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

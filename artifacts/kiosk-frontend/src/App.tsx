"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@clerk/react";
import { Footer } from "@/components/Footer";

function Mark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`inline-block ${className}`}
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fillRule="evenodd"
        d="M7 11h86v11H83v52c0 10.5-6.5 17-17 17H34c-10.5 0-17-6.5-17-17V22H7V11Zm28 34h30v19H35V45Z"
      />
    </svg>
  );
}

function Wordmark({ dark = false }: { dark?: boolean }) {
  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-3 ${dark ? "text-[#12110F]" : "text-[#EDE7DC]"}`}
      aria-label="Kiosk home"
    >
      <Mark className="w-[15px] shrink-0" />
      <span className="kiosk-wordmark text-[23px] leading-none">Kiosk</span>
    </Link>
  );
}

function Header({ paper = false }: { paper?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();
  return (
    <header
      className={`relative z-10 border-b ${paper ? "border-black/10 bg-[#EDE7DC] text-[#12110F]" : "border-white/10 bg-[#12110F] text-[#EDE7DC]"}`}
    >
      <div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between px-6 md:px-12">
        <Wordmark dark={paper} />
        <div className="hidden items-center gap-10 md:flex">
          <span
            className={`eyebrow ${paper ? "text-[#777064]" : "text-[#8A8478]"}`}
          >
            The stall for agent commerce
          </span>
          <Link
            href="/marketplace"
            className={`eyebrow transition-colors ${paper ? "text-[#777064] hover:text-[#12110F]" : "text-[#8A8478] hover:text-[#EDE7DC]"}`}
            data-testid="nav-marketplace"
          >
            Marketplace
          </Link>
          {isLoaded &&
            (isSignedIn ? (
              <Link
                href="/dashboard"
                className={`eyebrow transition-colors ${paper ? "text-[#777064] hover:text-[#12110F]" : "text-[#8A8478] hover:text-[#EDE7DC]"}`}
                data-testid="nav-dashboard"
              >
                Your Kiosks
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className={`eyebrow transition-colors ${paper ? "text-[#777064] hover:text-[#12110F]" : "text-[#8A8478] hover:text-[#EDE7DC]"}`}
                data-testid="nav-sign-in"
              >
                Sign in
              </Link>
            ))}
          <Link
            href="/create"
            className={`group inline-flex items-center gap-2 border px-4 py-[11px] text-[12px] font-semibold transition-colors ${paper ? "border-[#12110F] hover:bg-[#12110F] hover:text-[#EDE7DC]" : "border-[#EDE7DC]/45 hover:bg-[#EDE7DC] hover:text-[#12110F]"}`}
          >
            Create your Kiosk <ArrowUpRight size={14} strokeWidth={1.7} />
          </Link>
        </div>
        <button
          className="flex h-10 w-10 items-center justify-center md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menuOpen && (
        <div
          className={`absolute left-0 right-0 top-full border-b px-6 py-5 md:hidden ${paper ? "border-black/10 bg-[#EDE7DC]" : "border-white/10 bg-[#12110F]"}`}
        >
          <Link
            onClick={() => setMenuOpen(false)}
            href="/marketplace"
            className="flex items-center justify-between py-2 text-sm"
          >
            Marketplace <ArrowUpRight size={15} />
          </Link>
          {isLoaded &&
            (isSignedIn ? (
              <Link
                onClick={() => setMenuOpen(false)}
                href="/dashboard"
                className="flex items-center justify-between py-2 text-sm"
              >
                Your Kiosks <ArrowUpRight size={15} />
              </Link>
            ) : (
              <Link
                onClick={() => setMenuOpen(false)}
                href="/sign-in"
                className="flex items-center justify-between py-2 text-sm"
              >
                Sign in <ArrowUpRight size={15} />
              </Link>
            ))}
          <Link
            onClick={() => setMenuOpen(false)}
            href="/create"
            className="flex items-center justify-between py-2 text-sm"
          >
            Create your Kiosk <ArrowUpRight size={15} />
          </Link>
        </div>
      )}
    </header>
  );
}

const appear: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// ── How Kiosk MCP works ────────────────────────────────────────────────────────

const FLOW_STEPS = [
  {
    number: "01",
    label: "Register",
    detail:
      "Fill in your business name, services, location, contact, and hours. Takes about two minutes.",
  },
  {
    number: "02",
    label: "Publish",
    detail:
      "Review your profile and publish. Kiosk provisions a live MCP endpoint for your business.",
  },
  {
    number: "03",
    label: "Discoverable",
    detail:
      "Your business appears in the Kiosk marketplace and through the Master MCP discovery interface.",
  },
  {
    number: "04",
    label: "AI can engage",
    detail:
      "Compatible AI agents can find your business, browse services, and help customers reach you.",
  },
] as const;

const MASTER_MCP_ENDPOINT =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_MCP_BASE_URL
    ? `${process.env.NEXT_PUBLIC_MCP_BASE_URL.replace(/\/$/, "")}/mcp`
    : "https://mcp.kiosk.example/mcp";

function KioskMcpSection({ reduceMotion }: { reduceMotion: boolean }) {
  const [copied, setCopied] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Auto-advance steps every 2.8 s unless reduceMotion is on
  useEffect(() => {
    if (reduceMotion) return;
    const t = setInterval(
      () => setActiveStep((s) => (s + 1) % FLOW_STEPS.length),
      2800,
    );
    return () => clearInterval(t);
  }, [reduceMotion]);

  async function copyEndpoint() {
    try {
      await navigator.clipboard.writeText(MASTER_MCP_ENDPOINT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const reveal = reduceMotion
    ? {}
    : {
        initial: "hidden" as const,
        whileInView: "visible" as const,
        viewport: { once: true, amount: 0.15 },
        variants: appear,
      };

  return (
    <section className="border-b border-white/10 bg-[#0E0D0B]">
      <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-12 md:py-32">
        {/* Header */}
        <motion.div {...reveal} className="max-w-[640px]">
          <p className="eyebrow mb-5 text-[#8A8478]">What is Kiosk MCP?</p>
          <h2 className="text-[clamp(2.4rem,5.5vw,4.6rem)] font-semibold leading-[.92] tracking-[-.075em] text-[#EDE7DC]">
            Your business,
            <br />
            <span className="serif font-normal italic tracking-[-.055em]">
              open to AI agents.
            </span>
          </h2>
          <p className="mt-6 max-w-[520px] text-[15px] leading-7 text-[#A49D90]">
            Kiosk gives every local business its own AI-readable endpoint using
            the Model Context Protocol. No code required from the business
            owner. Compatible AI assistants can discover your business, browse
            your services, and help customers reach you.
          </p>
        </motion.div>

        {/* Animated step flow */}
        <div className="mt-16 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW_STEPS.map((step, i) => {
            const isActive = activeStep === i;
            return (
              <motion.button
                key={step.number}
                onClick={() => setActiveStep(i)}
                {...(reduceMotion
                  ? {}
                  : {
                      initial: { opacity: 0, y: 12 },
                      whileInView: { opacity: 1, y: 0 },
                      viewport: { once: true },
                      transition: { delay: i * 0.1, duration: 0.5 },
                    })}
                className={`group relative text-left border p-5 transition-colors duration-300 ${
                  isActive
                    ? "border-[#EDE7DC]/30 bg-[#1C1A16]"
                    : "border-white/8 bg-transparent hover:border-white/15"
                }`}
                aria-pressed={isActive}
              >
                {/* Active indicator line */}
                {!reduceMotion && (
                  <span
                    className={`absolute left-0 top-0 h-full w-[2px] transition-all duration-300 ${
                      isActive ? "bg-[#EDE7DC]" : "bg-transparent"
                    }`}
                  />
                )}
                <span className="mono text-[10px] text-[#8A8478]">
                  {step.number}
                </span>
                <p className="mt-3 text-[15px] font-semibold text-[#EDE7DC]">
                  {step.label}
                </p>
                <p
                  className={`mt-2 text-[13px] leading-5 transition-colors ${
                    isActive ? "text-[#C5BFB2]" : "text-[#625D53]"
                  }`}
                >
                  {step.detail}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* Flow diagram — text-based, no heavy dependency */}
        <motion.div
          {...(reduceMotion
            ? {}
            : {
                initial: { opacity: 0 },
                whileInView: { opacity: 1 },
                viewport: { once: true },
                transition: { delay: 0.4, duration: 0.6 },
              })}
          className="mt-12 flex flex-wrap items-center gap-2 text-[11px] tracking-[.12em] uppercase text-[#625D53]"
          aria-hidden="true"
        >
          {[
            "Business profile",
            "→",
            "Kiosk platform",
            "→",
            "Master MCP",
            "→",
            "Business MCP",
            "→",
            "AI assistant",
            "→",
            "Customer",
          ].map((part, i) => (
            <span
              key={i}
              className={
                part === "→"
                  ? "text-[#8A8478]"
                  : "border border-white/10 px-2 py-0.5 text-[#A49D90]"
              }
            >
              {part}
            </span>
          ))}
        </motion.div>

        {/* Developer onboarding box */}
        <motion.div
          {...reveal}
          className="mt-16 border border-white/10 bg-[#1C1A16] p-6 md:p-8"
        >
          <p className="eyebrow text-[#8A8478] mb-3">For developers</p>
          <h3 className="text-[18px] font-semibold tracking-[-.04em] text-[#EDE7DC] mb-2">
            Connect a compatible AI agent to Kiosk
          </h3>
          <p className="text-[13px] leading-6 text-[#A49D90] mb-6 max-w-[580px]">
            Kiosk exposes a Master MCP discovery endpoint using Streamable HTTP
            transport (MCP spec 2025-11-25). Any compatible MCP client can
            connect to discover businesses and retrieve their individual
            endpoints.
          </p>

          {/* Endpoint copy block */}
          <div className="mb-6">
            <p className="mono text-[10px] text-[#8A8478] mb-2">
              MASTER MCP ENDPOINT
            </p>
            <div className="flex items-center gap-3 border border-white/15 bg-[#12110F] px-4 py-3">
              <code className="mono text-[12px] text-[#EDE7DC] flex-1 truncate">
                POST {MASTER_MCP_ENDPOINT}
              </code>
              <button
                onClick={copyEndpoint}
                className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#8A8478] hover:text-[#EDE7DC] transition-colors"
                aria-label="Copy endpoint URL"
              >
                {copied ? (
                  <>
                    <Check size={12} className="text-[#47745F]" />
                    <span className="text-[#47745F]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Connection steps */}
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            {[
              {
                step: "1",
                title: "Add to your client",
                body: 'In Claude Desktop, ChatGPT, Cursor, or any MCP-compatible tool, add this URL as a custom connector or MCP server with type "http".',
              },
              {
                step: "2",
                title: "Discover businesses",
                body: "Call search_businesses or discover_categories to find published businesses. Each result includes an mcp_endpoint URL for the specific business.",
              },
              {
                step: "3",
                title: "Connect to a business",
                body: "Use the returned mcp_endpoint to connect directly to that business's MCP server for services, hours, contact, and supported interactions.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="border border-white/8 p-4">
                <span className="mono text-[10px] text-[#8A8478]">0{step}</span>
                <p className="mt-2 text-[13px] font-semibold text-[#EDE7DC]">
                  {title}
                </p>
                <p className="mt-1.5 text-[12px] leading-5 text-[#625D53]">
                  {body}
                </p>
              </div>
            ))}
          </div>

          <p className="text-[11px] leading-5 text-[#625D53]">
            Connection steps vary between AI clients. See{" "}
            <a
              href="https://github.com/De-real-iManuel/Kiosk-mcp/blob/main/docs/connect-ai-assistants.md"
              className="text-[#8A8478] underline underline-offset-4 hover:text-[#EDE7DC] transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              docs/connect-ai-assistants.md
            </a>{" "}
            for client-specific guides. The endpoint above is the master
            discovery server — individual business endpoints are returned
            dynamically.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  const reveal = reduceMotion
    ? {}
    : {
        initial: "hidden",
        whileInView: "visible",
        viewport: { once: true, amount: 0.2 },
        variants: appear,
      };
  return (
    <main className="grain min-h-[100dvh] overflow-hidden bg-[#12110F]">
      <Header />
      <section className="fine-grid relative border-b border-white/10">
        <div className="mx-auto grid min-h-[700px] max-w-[1440px] items-center gap-12 px-6 py-20 md:min-h-[720px] md:grid-cols-[.92fr_1.08fr] md:gap-20 md:px-12 md:py-24">
          <motion.div
            {...(reduceMotion
              ? {}
              : {
                  initial: { opacity: 0, scale: 0.92 },
                  animate: { opacity: 1, scale: 1 },
                  transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
                })}
            className="relative mx-auto w-[min(62vw,310px)] md:mx-0 md:w-[min(29vw,350px)]"
          >
            {reduceMotion ? (
              <Mark className="block w-full" />
            ) : (
              <motion.div
                animate={{ rotate: [0, 15, 0, -15, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="block w-full"
                style={{ transformOrigin: "center center" }}
              >
                <Mark className="block w-full" />
              </motion.div>
            )}
            <span className="eyebrow absolute -bottom-9 left-0 text-[#8A8478]">
              The window
            </span>
            <span className="absolute -right-16 top-[17%] hidden h-px w-12 bg-[#8A8478]/50 md:block" />
            <span className="absolute -right-16 top-[17%] hidden translate-x-12 -translate-y-1/2 text-[10px] tracking-[.18em] text-[#8A8478] md:block">
              01 / OPEN
            </span>
          </motion.div>
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            animate={reduceMotion ? undefined : "visible"}
            variants={appear}
            className="max-w-[680px] md:pl-3"
          >
            <p className="eyebrow mb-5 text-[#8A8478]">
              Agent commerce, made local
            </p>
            <h1 className="kiosk-wordmark text-[clamp(5.2rem,12.5vw,11.8rem)] leading-[.78] text-[#EDE7DC]">
              Kiosk
            </h1>
            <p className="serif mt-9 max-w-[650px] text-[clamp(2.1rem,4.1vw,4rem)] leading-[1.03] tracking-[-.035em] text-[#EDE7DC]">
              Where agents come
              <br className="hidden md:block" /> to buy.
            </p>
            <p className="mt-6 max-w-[470px] text-[15px] leading-7 text-[#A49D90] md:text-[17px]">
              Turn your business into an Agent Skill in 2 minutes. No code
              required.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <Link
                href="/create"
                className="group inline-flex min-h-[54px] items-center gap-8 bg-[#EDE7DC] px-6 text-[13px] font-semibold text-[#12110F] transition-colors hover:bg-white"
              >
                Create your Kiosk{" "}
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <span className="eyebrow text-[#8A8478]">
                About two minutes · No code
              </span>
            </div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-1/2 hidden h-12 w-px bg-gradient-to-b from-[#8A8478]/50 to-transparent md:block" />
      </section>

      <section className="border-b border-white/10 bg-[#1C1A16]">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-20 md:grid-cols-[.8fr_1.2fr] md:gap-20 md:px-12 md:py-28">
          <motion.div {...reveal}>
            <p className="eyebrow mb-5 text-[#8A8478]">
              A clearer way to show up
            </p>
            <h2 className="max-w-[400px] text-[clamp(2.7rem,5.3vw,5rem)] font-semibold leading-[.94] tracking-[-.075em]">
              Your business.
              <br />
              In the right window.
            </h2>
          </motion.div>
          <motion.div {...reveal} className="md:pt-2">
            <p className="serif max-w-[670px] text-[clamp(1.55rem,2.5vw,2.4rem)] leading-[1.27] text-[#D0C9BC]">
              A kiosk is a stall. You walk up, find what you need, and get on
              with your day. Kiosk gives AI agents a clear window into what your
              business offers and how to reach you.
            </p>
            <div className="mt-10 grid gap-5 border-t border-white/15 pt-6 sm:grid-cols-3">
              <div>
                <span className="eyebrow text-[#8A8478]">01 / Tell</span>
                <p className="mt-3 text-[14px] leading-6 text-[#D0C9BC]">
                  Describe what you offer, in your own words.
                </p>
              </div>
              <div>
                <span className="eyebrow text-[#8A8478]">02 / Set</span>
                <p className="mt-3 text-[14px] leading-6 text-[#D0C9BC]">
                  Share where you work and how customers reach you.
                </p>
              </div>
              <div>
                <span className="eyebrow text-[#8A8478]">03 / Ready</span>
                <p className="mt-3 text-[14px] leading-6 text-[#D0C9BC]">
                  Review your details, ready for the next step.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="mx-auto grid max-w-[1440px] items-center gap-16 px-6 py-24 md:grid-cols-[1fr_1fr] md:px-12 md:py-32">
          <motion.div {...reveal}>
            <p className="eyebrow mb-6 text-[#8A8478]">
              Made for independent business
            </p>
            <h2 className="max-w-[600px] text-[clamp(2.8rem,6vw,5.7rem)] font-semibold leading-[.9] tracking-[-.08em]">
              Small business.
              <br />
              <span className="serif font-normal italic tracking-[-.055em]">
                Open to more.
              </span>
            </h2>
          </motion.div>
          <motion.div
            {...reveal}
            className="relative border-l border-white/15 py-2 pl-8 md:pl-14"
          >
            <span className="absolute -left-[4px] top-0 h-2 w-2 bg-[#EDE7DC]" />
            <p className="serif max-w-[480px] text-[clamp(1.7rem,3vw,2.8rem)] leading-[1.18] text-[#D0C9BC]">
              No new software to learn. No code to write. Just the details that
              make your business yours.
            </p>
            <Link
              href="/create"
              className="group mt-9 inline-flex items-center gap-3 text-[13px] font-semibold text-[#EDE7DC]"
            >
              Make your business discoverable{" "}
              <span className="grid h-9 w-9 place-items-center rounded-full border border-white/25 transition-colors group-hover:bg-[#EDE7DC] group-hover:text-[#12110F]">
                <ArrowUpRight size={16} />
              </span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── What is Kiosk MCP? ─────────────────────────────────────────────── */}
      <KioskMcpSection reduceMotion={!!reduceMotion} />

      <section className="bg-[#EDE7DC] text-[#12110F]">
        <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-20 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="kiosk-wordmark text-[clamp(4rem,10vw,9rem)] leading-[.78]">
              Kiosk
            </h2>
            <p className="serif mt-8 text-[clamp(1.7rem,3.4vw,3rem)]">
              Where agents come to buy.
            </p>
            <p className="mt-4 max-w-[480px] text-sm leading-6 text-[#686257]">
              Set up your business profile in about two minutes. Your
              information stays yours to review.
            </p>
          </div>
          <Link
            href="/create"
            className="group inline-flex h-[58px] items-center justify-between gap-12 bg-[#12110F] px-6 text-[13px] font-semibold text-[#EDE7DC] transition-colors hover:bg-[#34312B]"
          >
            Create your Kiosk{" "}
            <ArrowUpRight
              size={17}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </section>
      <Footer variant="dark" />
    </main>
  );
}

type BusinessDetails = {
  businessName: string;
  services: string;
  audience: string;
  location: string;
  hours: string;
  contact: string;
  price: string;
  booking: string;
};

const initialDetails: BusinessDetails = {
  businessName: "",
  services: "",
  audience: "",
  location: "",
  hours: "",
  contact: "",
  price: "",
  booking: "",
};

function FormField({
  id,
  label,
  hint,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="form-label" htmlFor={id}>
        {label}
        {required && (
          <span className="ml-1 text-[#8A8478]" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {hint && <p className="form-hint">{hint}</p>}
      {children}
      {error && (
        <p className="text-xs text-[#9C493F]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function CreateKioskPage() {
  const [details, setDetails] = useState<BusinessDetails>(initialDetails);
  const [errors, setErrors] = useState<
    Partial<Record<keyof BusinessDetails, string>>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const update =
    (key: keyof BusinessDetails) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDetails((current) => ({ ...current, [key]: event.target.value }));
      if (errors[key])
        setErrors((current) => ({ ...current, [key]: undefined }));
    };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    const requiredFields: [keyof BusinessDetails, string][] = [
      ["businessName", "Add your business name."],
      ["services", "Describe what you sell or the services you offer."],
      ["audience", "Let us know who your business is for."],
      ["location", "Add a location or service area."],
      ["hours", "Tell customers when you are open."],
      ["contact", "Add a way customers can contact or book you."],
    ];
    const nextErrors: Partial<Record<keyof BusinessDetails, string>> = {};
    requiredFields.forEach(([key, message]) => {
      if (!details[key].trim()) nextErrors[key] = message;
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setSubmitted(true);
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  return (
    <main className="grain min-h-[100dvh] bg-[#12110F] text-[#EDE7DC]">
      <Header />
      <div className="mx-auto max-w-[1200px] px-5 pb-16 pt-8 sm:px-8 md:px-12 md:pb-24 md:pt-11">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-[#A49D90] transition-colors hover:text-[#EDE7DC]"
        >
          <ArrowLeft size={14} /> Back to Kiosk
        </Link>
        <div className="mt-12 grid gap-12 md:mt-16 md:grid-cols-[.72fr_1.28fr] md:gap-16">
          <aside className="md:sticky md:top-8 md:self-start">
            <p className="eyebrow text-[#8A8478]">Your business / 01</p>
            <h1 className="mt-5 max-w-[420px] text-[clamp(2.8rem,5.8vw,5rem)] font-semibold leading-[.91] tracking-[-.08em]">
              Open your
              <br className="hidden md:block" /> window.
            </h1>
            <p className="serif mt-6 max-w-[340px] text-[22px] leading-[1.28] text-[#C5BFB2]">
              A few details help agents understand what you do and how to reach
              you.
            </p>
            <div className="mt-9 hidden items-center gap-3 border-t border-white/15 pt-5 md:flex">
              <span className="grid h-8 w-8 place-items-center border border-white/20">
                <span className="mono text-[10px]">01</span>
              </span>
              <span className="eyebrow text-[#8A8478]">Business details</span>
              <span className="ml-auto mono text-[10px] text-[#8A8478]">
                ~2 MIN
              </span>
            </div>
            <div className="mt-8 flex items-center gap-2 md:hidden">
              <span className="h-[2px] w-10 bg-[#EDE7DC]" />
              <span className="h-px w-10 bg-white/20" />
              <span className="mono text-[10px] text-[#8A8478]">01 / 01</span>
            </div>
          </aside>

          <section className="border border-white/10 bg-[#1C1A16] p-5 shadow-[0_18px_70px_rgba(0,0,0,.16)] sm:p-8 md:p-10">
            {submitted ? (
              <div className="py-4 sm:py-8" role="status" aria-live="polite">
                <div className="grid h-12 w-12 place-items-center border border-[#12110F]">
                  <Check size={21} strokeWidth={1.6} />
                </div>
                <p className="eyebrow mt-8 text-[#A49D90]">
                  Details received / Ready for review
                </p>
                <h2 className="mt-4 max-w-[560px] text-[clamp(2.2rem,4.2vw,3.8rem)] font-semibold leading-[.98] tracking-[-.07em]">
                  Your business details are ready.
                </h2>
                <p className="serif mt-6 max-w-[520px] text-[21px] leading-[1.35] text-[#C5BFB2]">
                  We’ve brought your information together for the next step.
                  Nothing has been published or deployed.
                </p>
                <div className="mt-8 border-y border-white/15 py-5">
                  <p className="eyebrow mb-3 text-[#A49D90]">
                    Your Kiosk profile
                  </p>
                  <p className="text-[18px] font-semibold">
                    {details.businessName}
                  </p>
                  <p className="mt-2 max-w-[540px] whitespace-pre-line text-sm leading-6 text-[#C5BFB2]">
                    {details.services}
                  </p>
                  <p className="mt-4 text-xs text-[#A49D90]">
                    {details.location} <span className="mx-2">/</span>{" "}
                    {details.contact}
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="inline-flex h-12 items-center gap-2 border border-white/25 px-5 text-[13px] font-semibold transition-colors hover:bg-white/5"
                  >
                    Edit details
                  </button>
                  <Link
                    href="/"
                    className="inline-flex h-12 items-center gap-3 bg-[#EDE7DC] px-5 text-[13px] font-semibold text-[#12110F] transition-colors hover:bg-white"
                  >
                    Back to Kiosk <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8 flex items-start justify-between gap-5 border-b border-white/15 pb-6">
                  <div>
                    <p className="eyebrow text-[#A49D90]">
                      Tell us about your business
                    </p>
                    <p className="mt-2 text-sm text-[#A49D90]">
                      Fields marked * are required.
                    </p>
                  </div>
                  <span className="eyebrow whitespace-nowrap text-[#A49D90]">
                    01 — 06
                  </span>
                </div>
                <form onSubmit={onSubmit} noValidate>
                  <div className="space-y-7">
                    <FormField
                      id="businessName"
                      label="Business name"
                      required
                      error={errors.businessName}
                    >
                      <input
                        id="businessName"
                        name="businessName"
                        autoComplete="organization"
                        className="field-control"
                        placeholder="e.g. Northline Bike Repair"
                        value={details.businessName}
                        onChange={update("businessName")}
                        required
                        aria-invalid={!!errors.businessName}
                      />
                    </FormField>
                    <FormField
                      id="services"
                      label="What do you sell / services you offer?"
                      hint="Be as specific as you like. A few clear sentences is plenty."
                      required
                      error={errors.services}
                    >
                      <textarea
                        id="services"
                        name="services"
                        rows={4}
                        className="field-control resize-y"
                        placeholder="Tell us what you offer, what makes it useful, and anything customers should know."
                        value={details.services}
                        onChange={update("services")}
                        required
                        aria-invalid={!!errors.services}
                      />
                    </FormField>
                    <FormField
                      id="audience"
                      label="Who is it for?"
                      required
                      error={errors.audience}
                    >
                      <input
                        id="audience"
                        name="audience"
                        className="field-control"
                        placeholder="e.g. Commuters, new parents, nearby restaurants"
                        value={details.audience}
                        onChange={update("audience")}
                        required
                        aria-invalid={!!errors.audience}
                      />
                    </FormField>
                    <FormField
                      id="location"
                      label="Location / service area"
                      hint="A neighborhood, city, or the places you travel to."
                      required
                      error={errors.location}
                    >
                      <input
                        id="location"
                        name="location"
                        autoComplete="address-level2"
                        className="field-control"
                        placeholder="e.g. East London, or within 15 miles of Bristol"
                        value={details.location}
                        onChange={update("location")}
                        required
                        aria-invalid={!!errors.location}
                      />
                    </FormField>
                    <FormField
                      id="hours"
                      label="Opening hours"
                      hint="Include days and times, or say if hours vary."
                      required
                      error={errors.hours}
                    >
                      <textarea
                        id="hours"
                        name="hours"
                        rows={2}
                        className="field-control resize-y"
                        placeholder="e.g. Tue–Sat, 9am–5pm"
                        value={details.hours}
                        onChange={update("hours")}
                        required
                        aria-invalid={!!errors.hours}
                      />
                    </FormField>
                    <FormField
                      id="contact"
                      label="How can people contact or book you? (phone, WhatsApp, link, etc.)"
                      hint="Include the best number, link, or contact method."
                      required
                      error={errors.contact}
                    >
                      <input
                        id="contact"
                        name="contact"
                        autoComplete="url"
                        className="field-control"
                        placeholder="e.g. +44 7700 900000 or northline.co.uk/book"
                        value={details.contact}
                        onChange={update("contact")}
                        required
                        aria-invalid={!!errors.contact}
                      />
                    </FormField>

                    <div className="grid gap-7 border-t border-white/15 pt-7 md:grid-cols-2">
                      <FormField
                        id="price"
                        label="Starting price or price range"
                        hint="Optional"
                      >
                        <input
                          id="price"
                          name="price"
                          className="field-control"
                          placeholder="e.g. From £25, or £25–£80"
                          value={details.price}
                          onChange={update("price")}
                        />
                      </FormField>
                      <fieldset>
                        <legend className="form-label">
                          Can customers request a booking?
                        </legend>
                        <p className="form-hint">Optional</p>
                        <div className="mt-3 flex gap-2">
                          {["Yes", "No"].map((option) => (
                            <label
                              key={option}
                              className="option-card flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 text-sm"
                            >
                              <input
                                className="accent-[#EDE7DC]"
                                type="radio"
                                name="booking"
                                value={option.toLowerCase()}
                                checked={
                                  details.booking === option.toLowerCase()
                                }
                                onChange={update("booking")}
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  </div>
                  <div className="mt-9 border-t border-white/15 pt-6">
                    {attempted && Object.keys(errors).length > 0 && (
                      <p className="mb-4 text-sm text-[#9C493F]" role="alert">
                        A few details are still missing. Check the marked fields
                        above.
                      </p>
                    )}
                    <button
                      type="submit"
                      className="group flex min-h-[54px] w-full items-center justify-between bg-[#EDE7DC] px-5 text-left text-[13px] font-semibold text-[#12110F] transition-colors hover:bg-white sm:w-auto sm:min-w-[260px]"
                    >
                      Create Kiosk{" "}
                      <ArrowRight
                        size={17}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </button>
                    <p className="mt-4 max-w-[520px] text-[11px] leading-5 text-[#A49D90]">
                      Your details stay on this page for now. Submitting
                      prepares your information for review; it does not publish
                      a listing or deploy an agent endpoint.
                    </p>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
      <Footer variant="dark" />
    </main>
  );
}

export default function App() {
  return <LandingPage />;
}

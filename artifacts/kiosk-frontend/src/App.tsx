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

function Mark({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={`inline-block ${className}`}
      style={style}
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
  const base = paper ? "text-[#12110F]" : "text-[#EDE7DC]";
  const muted = paper ? "text-[#12110F]" : "text-[#EDE7DC]";
  const dropdown = paper ? "border-black/10 bg-[#EDE7DC]" : "border-white/10 bg-[#1C1A16]";
  const item = "block rounded-sm px-4 py-3 text-[13px] transition-colors hover:bg-[#D96845]/10 hover:text-[#D96845] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D96845]";
  return (
    <header className={`relative z-30 border-b ${paper ? "border-black/10 bg-[#EDE7DC]" : "border-white/10 bg-[#12110F]"} ${base}`}>
      <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center justify-between gap-5 px-5 sm:px-6 md:px-12">
        <Wordmark dark={paper}/>
        <nav aria-label="Main navigation" className="hidden items-center gap-7 lg:flex">
          <div className="group relative">
            <button type="button" className={`inline-flex cursor-pointer items-center cursor-pointer gap-2 py-5 text-[12px] font-medium transition-colors hover:text-[#D96845] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D96845] ${muted}`}>For Businesses <span aria-hidden="true">⌄</span></button>
            <div className={`invisible absolute left-0 top-full w-60 translate-y-2 border p-2 opacity-0 shadow-2xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 ${dropdown}`}>
              <Link className={item} href="/create">Create a Kiosk</Link>
              <Link className={item} href="/#how-it-works">How it works</Link>
              {isLoaded && isSignedIn && <Link className={item} href="/dashboard">Business dashboard</Link>}
            </div>
          </div>
          <div className="group relative">
            <button type="button" className={`inline-flex items-center gap-2 py-5 text-[12px] font-medium transition-colors hover:text-[#D96845] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D96845] ${muted}`}>For Customers <span aria-hidden="true">⌄</span></button>
            <div className={`invisible absolute left-0 top-full w-60 translate-y-2 border p-2 opacity-0 shadow-2xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 ${dropdown}`}>
              <Link className={item} href="/marketplace">Explore the marketplace</Link>
              <Link className={item} href="/#for-customers">Discover with AI</Link>
              <Link className={item} href="/#customer-questions">Common questions</Link>
            </div>
          </div>
          <div className="group relative">
            <button type="button" className={`inline-flex items-center gap-2 py-5 text-[12px] font-medium transition-colors hover:text-[#D96845] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D96845] ${muted}`}>Resources <span aria-hidden="true">⌄</span></button>
            <div className={`invisible absolute left-0 top-full w-60 translate-y-2 border p-2 opacity-0 shadow-2xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 ${dropdown}`}>
              <Link className={item} href="/journal">Kiosk Journal</Link>
              <Link className={item} href="/about">About Kiosk</Link>
              <Link className={item} href="/legal/terms">Terms and policies</Link>
            </div>
          </div>
          <Link href="/pricing" className={`py-5 text-[12px] font-medium transition-colors hover:text-[#D96845] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D96845] ${muted}`}>Pricing</Link>
        </nav>
        <button className="flex h-10 w-10 items-center justify-center lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen}>{menuOpen ? <X size={20}/> : <Menu size={20}/>}</button>
      </div>
      {menuOpen && <nav aria-label="Mobile navigation" className={`border-t px-5 py-4 lg:hidden ${dropdown}`}>
        <details className="border-b border-white/10"><summary className="cursor-pointer list-none py-3 text-sm font-medium">For Businesses <span className="float-right">＋</span></summary><Link onClick={()=>setMenuOpen(false)} className={item} href="/create">Create a Kiosk</Link><Link onClick={()=>setMenuOpen(false)} className={item} href="/#how-it-works">How it works</Link>{isLoaded&&isSignedIn&&<Link onClick={()=>setMenuOpen(false)} className={item} href="/dashboard">Business dashboard</Link>}</details>
        <details className="border-b border-white/10"><summary className="cursor-pointer list-none py-3 text-sm font-medium">For Customers <span className="float-right">＋</span></summary><Link onClick={()=>setMenuOpen(false)} className={item} href="/marketplace">Explore marketplace</Link><Link onClick={()=>setMenuOpen(false)} className={item} href="/#for-customers">Discover with AI</Link><Link onClick={()=>setMenuOpen(false)} className={item} href="/#customer-questions">Common questions</Link></details>
        <details className="border-b border-white/10"><summary className="cursor-pointer list-none py-3 text-sm font-medium">Resources <span className="float-right">＋</span></summary><Link onClick={()=>setMenuOpen(false)} className={item} href="/journal">Kiosk Journal</Link><Link onClick={()=>setMenuOpen(false)} className={item} href="/about">About Kiosk</Link><Link onClick={()=>setMenuOpen(false)} className={item} href="/legal/terms">Terms and policies</Link></details>
        <Link onClick={()=>setMenuOpen(false)} href="/pricing" className="block py-4 text-sm font-medium hover:text-[#D96845]">Pricing</Link>
      </nav>}
    </header>
  );
}

function ThreeDimensionalMark({ reduceMotion }: { reduceMotion: boolean }) {
  return <div className="relative mx-auto aspect-square w-full max-w-[350px]" style={{perspective:"1000px"}}>
    <div className="absolute inset-[8%] rounded-full border border-[#D96845]/25"/>
    <div className="absolute right-[9%] top-[16%] h-2 w-2 rounded-full bg-[#D96845] shadow-[0_0_22px_#D9684580]"/>
    <motion.div className="absolute inset-0" style={{transformStyle:"preserve-3d"}} animate={reduceMotion?undefined:{rotateY:[0,360]}} transition={reduceMotion?undefined:{duration:9,repeat:Infinity,ease:"linear"}}>
      {[...Array(7)].map((_,i)=><Mark key={i} className="absolute inset-0 h-full w-full text-[#D96845]" style={{transform:`translateZ(${-i*1.5}px)`}}/>)}
      <Mark className="absolute inset-0 h-full w-full text-[#EDE7DC]" style={{transform:"translateZ(1px)",filter:"drop-shadow(12px 18px 20px rgba(0,0,0,.28))"}}/>
    </motion.div>
  </div>;
}

const appear: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// How Kiosk Works

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
      "Review your profile and publish. Your business becomes visible to AI assistants straight away.",
  },
  {
    number: "03",
    label: "Discoverable",
    detail:
      "Your business appears in the Kiosk marketplace and through the Master MCP discovery interface.",
  },
  {
    number: "04",
    label: "Connect",
    detail:
      "Customers can review your details and reach you through the contact channels you provide.",
  },
] as const;

// The Master MCP discovery endpoint for developers to connect AI agents.
// In production, NEXT_PUBLIC_MCP_BASE_URL includes /business-mcp (e.g.
// https://cloudfront-domain/business-mcp). We strip that suffix to get the
// root domain, then append /mcp for the Master MCP discovery endpoint.
// In local dev, master-mcp runs on port 5000 (separate from business-mcp on 5001).
const MASTER_MCP_ENDPOINT = (() => {
  const mcpBase =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MCP_BASE_URL) ||
    "";
  if (mcpBase.includes("/business-mcp")) {
    // Production: strip /business-mcp, append /mcp
    return `${mcpBase.replace(/\/business-mcp$/, "").replace(/\/$/, "")}/mcp`;
  }
  // Local dev: master-mcp runs on localhost:5000
  return "http://localhost:5000/mcp";
})();

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
          <p className="eyebrow mb-5 text-[#D96845]">How it works</p>
          <h2 className="text-[clamp(2.4rem,5.5vw,4.6rem)] font-semibold leading-[.92] tracking-[-.075em] text-[#EDE7DC]">
            Your business,
            <br />
            <span className="serif font-normal italic tracking-[-.055em]">
              open to AI.
            </span>
          </h2>
          <p className="mt-6 max-w-[520px] text-[15px] leading-7 text-[#A49D90]">
            Kiosk gives every local business its own AI-readable endpoint using
            AI assistants. No code required from the business owner. Compatible
            AI assistants can discover your business, browse your services, and
            help customers reach you.
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

        {/* Flow diagram text-based, no heavy dependency */}
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
            "Kiosk discovery",
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
                  ? "px-1 text-[#D96845]"
                  : "border border-white/10 px-2 py-1 text-[#A49D90]"
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

          <div className="border-t border-white/10 pt-5">
            <p className="mono mb-2 text-[10px] text-[#8A8478]">MCP SERVER URL</p>
            <div className="flex flex-col gap-3 border border-white/15 bg-[#12110F] px-4 py-4 sm:flex-row sm:items-center">
              <code className="mono min-w-0 flex-1 break-all text-[12px] leading-6 text-[#EDE7DC]">
                {MASTER_MCP_ENDPOINT}
              </code>
              <button
                type="button"
                onClick={copyEndpoint}
                className="inline-flex shrink-0 items-center justify-center gap-2 self-start border border-[#D96845]/50 px-4 py-2.5 text-[12px] font-semibold text-[#EDE7DC] transition-colors hover:bg-[#D96845]/10 sm:self-auto"
                aria-label="Copy Kiosk MCP server URL"
              >
                {copied ? "Copied" : "Copy URL"}
              </button>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-[#8A8478]">
              Copy this URL into an MCP-compatible client that supports custom server connections.
            </p>
          </div>
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([
        { "@context": "https://schema.org", "@type": "Organization", "name": "Kiosk", "description": "A platform that helps independent businesses publish structured information for discovery by compatible AI assistants." },
        { "@context": "https://schema.org", "@type": "WebSite", "name": "Kiosk", "description": "Discover independent businesses through structured, AI-readable business information." }
      ]) }} />
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
            className="kiosk-origin-reveal relative mx-auto aspect-square w-[min(62vw,310px)] md:mx-0 md:w-[min(29vw,350px)]"
          >
            <ThreeDimensionalMark reduceMotion={!!reduceMotion} />
          </motion.div>
          <motion.div
            initial={reduceMotion ? false : "hidden"}
            animate={reduceMotion ? undefined : "visible"}
            variants={appear}
            className="max-w-[680px] md:pl-3"
          >
            <p className="eyebrow mb-5 text-[#D96845]">
              Independent businesses. Right around you.
            </p>
            <h1 className="text-[clamp(3.8rem,8.2vw,7.6rem)] font-semibold leading-[.88] tracking-[-.085em] text-[#EDE7DC]">
              Find local.
              <br />
              <span className="serif font-normal italic tracking-[-.065em] text-[#D8CFC0]">Connect directly.</span>
            </h1>
            <p className="mt-7 max-w-[520px] text-[15px] leading-7 text-[#B7AFA1] md:text-[17px]">
              Discover independent businesses, see what they offer, and reach the people behind them. Kiosk gives local businesses a clear presence across the places people search—including compatible AI assistants.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/marketplace"
                className="group inline-flex min-h-[54px] items-center gap-7 bg-[#D96845] px-6 text-[13px] font-semibold text-[#12110F] transition-colors hover:bg-[#E47B59]"
              >
                Explore local businesses{" "}
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
              <Link
                href="/create"
                className="inline-flex min-h-[54px] items-center gap-3 border border-white/20 px-5 text-[13px] font-semibold text-[#EDE7DC] transition-colors hover:border-[#D96845] hover:bg-white/5"
              >
                List your business <ArrowUpRight size={16} />
              </Link>
            </div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-1/2 hidden h-12 w-px bg-gradient-to-b from-[#8A8478]/50 to-transparent md:block" />
      </section>

      <section aria-label="Early ecosystem trust" className="border-b border-white/10 bg-[#171613]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-12">
          <p className="eyebrow text-[#8A8478]">Early trust</p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <span className="text-[11px] uppercase tracking-[.16em] text-[#8A8478]">Trusted by</span>
            <span className="kiosk-wordmark text-2xl font-semibold tracking-[-.04em] text-[#EDE7DC]">Steepychain</span>
          </div>
          <p className="max-w-md text-xs leading-5 text-[#8A8478]">We’ll add more organisations here as real relationships grow.</p>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#1C1A16]">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-20 md:grid-cols-[.8fr_1.2fr] md:gap-20 md:px-12 md:py-28">
          <motion.div {...reveal}>
            <p className="eyebrow mb-5 text-[#D96845]">The problem</p>
            <h2 className="max-w-[400px] text-[clamp(2.7rem,5.3vw,5rem)] font-semibold leading-[.94] tracking-[-.075em]">
              Missing out
              <br />
              on customers.
            </h2>
          </motion.div>
          <motion.div {...reveal} className="md:pt-2">
            <p className="serif max-w-[670px] text-[clamp(1.55rem,2.5vw,2.4rem)] leading-[1.27] text-[#D0C9BC]">
              When someone asks an AI assistant to find a local business, it
              often directs them to large chains with websites. Small businesses
              without a technical team are left out. Kiosk changes that.
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
            <p className="eyebrow mb-6 text-[#D96845]">What Kiosk does</p>
            <h2 className="max-w-[600px] text-[clamp(2.8rem,6vw,5.7rem)] font-semibold leading-[.9] tracking-[-.08em]">
              Be found.
              <br />
              <span className="serif font-normal italic tracking-[-.055em]">
                Be reached.
              </span>
            </h2>
          </motion.div>
          <motion.div
            {...reveal}
            className="relative border-l border-white/15 py-2 pl-8 md:pl-14"
          >
            <span className="absolute -left-[4px] top-0 h-2 w-2 bg-[#EDE7DC]" />
            <p className="serif max-w-[480px] text-[clamp(1.7rem,3vw,2.8rem)] leading-[1.18] text-[#D0C9BC]">
              Give your business one clear place in the local commerce
              network. Kiosk makes your information easier to discover and
              gives customers a direct path to reach you.
            </p>
            <Link
              href="/create"
              className="group mt-9 inline-flex items-center gap-3 text-[13px] font-semibold text-[#EDE7DC]"
            >
              Connect with more customers{" "}
              <span className="grid h-9 w-9 place-items-center rounded-full border border-white/25 transition-colors group-hover:bg-[#EDE7DC] group-hover:text-[#12110F]">
                <ArrowUpRight size={16} />
              </span>
            </Link>
          </motion.div>
        </div>
      </section>

      <section id="for-customers" className="border-b border-white/10 bg-[#171613]">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-20 md:grid-cols-2 md:items-center md:px-12 md:py-28">
          <motion.div {...reveal}>
            <p className="eyebrow mb-5 text-[#D96845]">For customers</p>
            <h2 className="max-w-xl text-[clamp(2.5rem,5vw,4.8rem)] font-semibold leading-[.94] tracking-[-.07em]">Find the business. Then reach the people behind it.</h2>
            <p className="serif mt-6 max-w-xl text-[clamp(1.35rem,2.4vw,2rem)] leading-[1.3] text-[#C5BFB2]">Ask a compatible AI assistant for a nearby service, a particular product or a business that fits what you need. Kiosk helps the assistant discover structured information from participating businesses.</p>
            <div className="mt-8 space-y-4">
              {[["01 / ASK","Describe what you need in your own words."],["02 / DISCOVER","The assistant can search business profiles and compare the information available."],["03 / CONNECT","Review the details and contact the business directly to confirm availability, prices and next steps."]].map(([n,t])=><div key={n} className="flex gap-4 border-t border-white/10 pt-4"><span className="mono min-w-24 text-[10px] text-[#D96845]">{n}</span><p className="text-sm leading-6 text-[#D0C9BC]">{t}</p></div>)}
            </div>
            <p className="mt-6 text-xs leading-5 text-[#8A8478]">Kiosk helps with discovery. The business confirms bookings, orders, prices and fulfilment directly. Customer checkout is not currently processed by Kiosk.</p>
          </motion.div>
          <motion.div {...reveal} className="relative min-h-[360px] overflow-hidden border border-white/10 bg-[#1C1A16]">
            <img src="https://images.unsplash.com/photo-1753351052277-a7ff634f0bd5?auto=format&fit=crop&w=1200&q=85" alt="Customer and shop owner completing an in-person transaction" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-75"/>
            <div className="absolute inset-0 bg-gradient-to-t from-[#12110F]/90 via-transparent to-transparent"/>
            <div className="absolute bottom-6 left-6 right-6 border border-white/15 bg-[#12110F]/85 p-5 backdrop-blur-sm">
              <p className="eyebrow text-[#D96845]">Discovery to connection</p>
              <p className="serif mt-2 text-2xl leading-tight text-[#EDE7DC]">A useful answer should lead to a real local business.</p>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="local-commerce-network" className="relative overflow-hidden border-b border-white/10 bg-[#12110F]">
        <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-12 md:py-32">
          <div className="grid gap-10 md:grid-cols-[.9fr_1.1fr] md:items-end">
            <div>
              <p className="eyebrow mb-5 text-[#D96845]">The Kiosk network</p>
              <h2 className="max-w-xl text-[clamp(2.8rem,6vw,5.4rem)] font-semibold leading-[.92] tracking-[-.075em] text-[#EDE7DC]">
                From being found
                <br /><span className="serif font-normal italic text-[#D8CFC0]">to being reached.</span>
              </h2>
            </div>
            <p className="serif max-w-2xl text-[clamp(1.35rem,2.3vw,2rem)] leading-[1.3] text-[#C5BFB2]">
              Kiosk connects three parts of local commerce: independent businesses with useful information, people looking for something nearby, and the AI tools that can help bring them together.
            </p>
          </div>
          <div className="relative mt-16 grid gap-3 md:grid-cols-3">
            {[
              {n:"01",title:"Local businesses",body:"Businesses publish the services, products, location and contact details they want customers to find.",meta:"BUSINESS PROFILE"},
              {n:"02",title:"Kiosk discovery layer",body:"Kiosk organises that information and makes it available through the marketplace and compatible discovery interfaces.",meta:"STRUCTURED NETWORK"},
              {n:"03",title:"Customers & assistants",body:"People can explore participating businesses, compare useful details and continue directly to the business to confirm next steps.",meta:"DISCOVER → CONNECT"},
            ].map((item,i)=>(
              <article key={item.n} className="relative border border-white/10 bg-[#1C1A16] p-6 md:p-7">
                <div className="flex items-center justify-between"><span className="mono text-[10px] text-[#D96845]">{item.n}</span><span className="h-2 w-2 rounded-full bg-[#D96845] shadow-[0_0_14px_#D9684580]"/></div>
                <p className="eyebrow mt-10 text-[#8A8478]">{item.meta}</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-.05em] text-[#EDE7DC]">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-[#A49D90]">{item.body}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-5 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm leading-6 text-[#8A8478]">The network grows business by business. Explore the participating businesses already published on Kiosk.</p>
            <Link href="/marketplace" className="inline-flex items-center gap-3 text-sm font-semibold text-[#EDE7DC] transition-colors hover:text-[#D96845]">Explore the marketplace <ArrowUpRight size={16}/></Link>
          </div>
        </div>
      </section>

      <section id="product-preview" className="border-b border-white/10 bg-[#171613]">
        <div className="mx-auto max-w-[1440px] px-6 py-24 md:px-12 md:py-28">
          <div className="mb-14 grid gap-8 md:grid-cols-[.85fr_1.15fr] md:items-end">
            <div><p className="eyebrow mb-5 text-[#D96845]">Inside the network</p><h2 className="max-w-xl text-[clamp(2.8rem,5.5vw,5rem)] font-semibold leading-[.93] tracking-[-.075em] text-[#EDE7DC]">One business profile. More ways to be discovered.</h2></div>
            <p className="serif max-w-2xl text-[clamp(1.3rem,2.2vw,1.8rem)] leading-[1.35] text-[#C5BFB2]">A business manages its information in Kiosk. Customers can explore that information on the marketplace or through compatible AI discovery experiences.</p>
          </div>
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.35fr_.65fr]">
            <div className="relative rounded-[18px] border border-white/15 bg-[#0B0A09] p-2 shadow-[0_35px_100px_rgba(0,0,0,.45)]">
              <div className="overflow-hidden rounded-[11px] border border-white/10 bg-[#EDE7DC] text-[#171613]">
                <div className="flex h-10 items-center justify-between border-b border-black/10 bg-[#F5F0E7] px-4"><span className="kiosk-wordmark text-sm">Kiosk</span><span className="text-[9px] uppercase tracking-[.14em] text-[#81796D]">Business window · Example view</span><span className="h-2 w-2 rounded-full bg-[#D96845]"/></div>
                <div className="grid min-h-[290px] sm:grid-cols-[150px_1fr]">
                  <aside className="hidden border-r border-black/10 bg-[#E6DFD3] p-4 sm:block"><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#81796D]">Workspace</p>{["Overview","Business profile","Services","Contact channels"].map((x,i)=><div key={x} className={`mt-3 px-2 py-2 text-[10px] ${i===1?"bg-[#D96845]/15 font-semibold text-[#A9472B]":"text-[#696257]"}`}>{x}</div>)}</aside>
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[.14em] text-[#81796D]">Your business profile</p><h3 className="mt-1 text-xl font-semibold tracking-[-.05em]">A clearer local presence.</h3><p className="mt-1 text-[10px] text-[#81796D]">Manage the information customers use to find you.</p></div><span className="border border-[#47745F]/30 bg-[#47745F]/10 px-2 py-1 text-[9px] font-semibold text-[#47745F]">PROFILE PREVIEW</span></div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="border border-black/10 bg-[#F7F3EC] p-4"><p className="text-[9px] uppercase tracking-[.12em] text-[#81796D]">Business details</p><div className="mt-3 h-2 w-3/4 bg-[#B8B0A3]"/><div className="mt-2 h-2 w-full bg-[#D7D0C5]"/><div className="mt-2 h-2 w-2/3 bg-[#D7D0C5]"/><p className="mt-4 text-[10px] font-semibold">Name · Location · Opening hours</p></div>
                      <div className="border border-black/10 bg-[#F7F3EC] p-4"><p className="text-[9px] uppercase tracking-[.12em] text-[#81796D]">Services & offers</p>{["Service descriptions","Price guidance","What customers should know"].map(x=><div key={x} className="mt-3 flex items-center gap-2 text-[10px]"><span className="h-1.5 w-1.5 rounded-full bg-[#D96845]"/>{x}</div>)}</div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border border-black/10 bg-[#F7F3EC] p-3"><span className="text-[10px] text-[#696257]">Contact details stay connected to the business profile.</span><span className="bg-[#D96845] px-3 py-2 text-[9px] font-semibold text-[#12110F]">Preview profile ↗</span></div>
                  </div>
                </div>
              </div>
              <div className="mx-auto h-3 w-[24%] rounded-b-xl bg-[#282521]"/>
              <div className="mx-auto h-1 w-[34%] rounded-b-full bg-[#48433B]"/>
            </div>
            <div className="mx-auto w-[min(72%,260px)] rounded-[34px] border-[5px] border-[#39352F] bg-[#090908] p-2 shadow-[0_30px_80px_rgba(0,0,0,.55)] lg:-ml-14">
              <div className="overflow-hidden rounded-[25px] bg-[#EDE7DC] text-[#171613]">
                <div className="flex h-8 items-center justify-center bg-[#E4DDD1]"><span className="h-1 w-12 rounded-full bg-[#81796D]"/></div>
                <div className="p-4">
                  <div className="flex items-center justify-between"><span className="kiosk-wordmark text-lg">Kiosk</span><span className="text-[9px] text-[#81796D]">Discovery preview</span></div>
                  <p className="mt-5 text-[9px] uppercase tracking-[.14em] text-[#81796D]">A customer asks</p>
                  <div className="mt-2 rounded-xl rounded-tr-sm bg-[#D96845] p-3 text-[11px] leading-5 text-[#12110F]">Find a nearby salon that offers braids.</div>
                  <div className="mt-4 rounded-xl border border-black/10 bg-[#F7F3EC] p-3">
                    <p className="text-[9px] uppercase tracking-[.12em] text-[#81796D]">Participating business</p><h4 className="mt-2 text-sm font-semibold">Independent salon</h4><p className="mt-1 text-[10px] leading-4 text-[#696257]">Services · Location · Contact details</p><div className="mt-3 flex items-center justify-between border-t border-black/10 pt-3"><span className="text-[9px] text-[#81796D]">Review business details</span><span className="text-[10px] font-semibold text-[#B64F32]">View ↗</span></div>
                  </div>
                  <p className="mt-4 text-center text-[9px] leading-4 text-[#81796D]">Illustrative customer journey. Results depend on participating businesses and compatible AI clients.</p>
                </div>
                <div className="h-5 bg-[#E4DDD1]"/>
              </div>
            </div>
          </div>
          <p className="mt-7 text-[10px] leading-5 text-[#81796D]">Illustrative interface preview—not a live merchant record or a claim of customer activity.</p>
        </div>
      </section>

      <section id="customer-questions" className="border-b border-white/10 bg-[#12110F]">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-20 md:grid-cols-[.8fr_1.2fr] md:px-12 md:py-24">
          <div><p className="eyebrow mb-5 text-[#D96845]">Questions, answered</p><h2 className="text-4xl font-semibold tracking-[-.06em]">What to know before using Kiosk.</h2></div>
          <div className="divide-y divide-white/10">
            {[["Does Kiosk sell the products or services listed?","No. Businesses create and manage their own listings. Customers arrange purchases and services directly with the business."],["Does Kiosk guarantee that an AI assistant will recommend a business?","No. Kiosk makes structured business information available to compatible systems, but each AI assistant decides what to retrieve and show."],["Are bookings automatically confirmed?","No. A request is not a confirmed booking until the business accepts it directly."],["Does Kiosk process customer payments?","Not currently. Customers pay businesses through the payment methods those businesses arrange. Business subscriptions to Kiosk are separate."],["Can a business update its details?","Business owners can manage their listing through the account and dashboard features available to them."]].map(([q,a])=><details key={q} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-base font-medium text-[#EDE7DC] hover:text-[#D96845]">{q}<span className="text-xl text-[#D96845] transition-transform group-open:rotate-45">＋</span></summary><p className="max-w-2xl pt-4 text-sm leading-7 text-[#A49D90]">{a}</p></details>)}
          </div>
        </div>
      </section>

      {/* How it works */}
      <div id="how-it-works"><KioskMcpSection reduceMotion={!!reduceMotion} /></div>

      <section className="bg-[#EDE7DC] text-[#12110F]">
        <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-20 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="kiosk-wordmark text-[clamp(4rem,10vw,9rem)] leading-[.78]">
              Kiosk
            </h2>
            <p className="serif mt-8 text-[clamp(1.7rem,3.4vw,3rem)]">
              Be found by every assistant.
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
                  Weâ€™ve brought your information together for the next step.
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
                    01 â€” 06
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
                        placeholder="e.g. Tueâ€“Sat, 9amâ€“5pm"
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
                          placeholder="e.g. From Â£25, or Â£25â€“Â£80"
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

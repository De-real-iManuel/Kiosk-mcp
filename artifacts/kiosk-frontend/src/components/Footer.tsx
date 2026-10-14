"use client";

import Link from "next/link";
import { Github, ExternalLink } from "lucide-react";

function FooterMark() {
  return (
    <svg
      className="inline-block w-[15px] shrink-0"
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

function FooterWordmark({ muted }: { muted: string }) {
  return (
    <div className="inline-flex items-center gap-3">
      <FooterMark />
      <span className="kiosk-wordmark text-[23px] leading-none">Kiosk</span>
    </div>
  );
}

const PRODUCT_LINKS = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "Create a Kiosk", href: "/create" },
  { label: "Dashboard", href: "/dashboard" },
];

const COMPANY_LINKS = [
  { label: "About", href: "#" },
  { label: "Blog", href: "#" },
  { label: "Careers", href: "#" },
];

const LEGAL_LINKS = [
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Cookie Policy", href: "/legal/cookies" },
];

interface FooterProps {
  variant?: "dark" | "paper";
}

export function Footer({ variant = "dark" }: FooterProps) {
  const isDark = variant === "dark";

  const bg = isDark
    ? "bg-[#12110F] text-[#EDE7DC]"
    : "bg-[#EDE7DC] text-[#12110F] border-t border-black/10";
  const muted = isDark ? "text-[#8A8478]" : "text-[#777064]";
  const linkHover = isDark ? "hover:opacity-100" : "hover:opacity-100";
  const divider = isDark ? "border-white/10" : "border-black/10";

  return (
    <footer className={`${bg} px-6 py-14 md:px-12 md:py-16`}>
      <div className="mx-auto max-w-[1440px]">
        {/* Top row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <FooterWordmark muted={muted} />
          <p className={`eyebrow ${muted}`}>The stall for agent commerce</p>
        </div>

        {/* Link columns */}
        <div
          className={`mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-t pt-10 sm:grid-cols-4 ${divider}`}
        >
          {/* Product */}
          <div>
            <p className={`eyebrow mb-4 ${muted}`}>Product</p>
            <ul className="space-y-0">
              {PRODUCT_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className={`block text-[13px] leading-8 opacity-70 transition-opacity ${linkHover}`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className={`eyebrow mb-4 ${muted}`}>Company</p>
            <ul className="space-y-0">
              {COMPANY_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className={`block text-[13px] leading-8 opacity-70 transition-opacity ${linkHover}`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className={`eyebrow mb-4 ${muted}`}>Legal</p>
            <ul className="space-y-0">
              {LEGAL_LINKS.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className={`block text-[13px] leading-8 opacity-70 transition-opacity ${linkHover}`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <p className={`eyebrow mb-4 ${muted}`}>Connect</p>
            <ul className="space-y-0">
              <li>
                <a
                  href="#"
                  className={`inline-flex items-center gap-2 text-[13px] leading-8 opacity-70 transition-opacity ${linkHover}`}
                >
                  Twitter / X <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className={`inline-flex items-center gap-2 text-[13px] leading-8 opacity-70 transition-opacity ${linkHover}`}
                >
                  GitHub <Github size={12} />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className={`mt-10 flex flex-col gap-2 border-t pt-6 sm:flex-row sm:items-center sm:justify-between ${divider}`}
        >
          <p className={`text-[11px] ${muted}`}>
            © {new Date().getFullYear()} Kiosk Technologies Ltd. All rights
            reserved.
          </p>
          <span className={`mono text-[10px] ${muted}`}>
            A first step, not a deployment.
          </span>
        </div>
      </div>
    </footer>
  );
}

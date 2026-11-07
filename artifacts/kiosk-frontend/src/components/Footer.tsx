"use client";

import Link from "next/link";


function FooterMark() {
  return (
    <svg className="inline-block w-[15px] shrink-0" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true" focusable="false">
      <path fillRule="evenodd" d="M7 11h86v11H83v52c0 10.5-6.5 17-17 17H34c-10.5 0-17-6.5-17-17V22H7V11Zm28 34h30v19H35V45Z" />
    </svg>
  );
}

function FooterWordmark() {
  return <div className="inline-flex items-center gap-3"><FooterMark /><span className="kiosk-wordmark text-[23px] leading-none">Kiosk</span></div>;
}

const PRODUCT_LINKS = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "For businesses", href: "/create" },
  { label: "Pricing", href: "/pricing" },
];
const COMPANY_LINKS = [
  { label: "About Kiosk", href: "/about" },
  { label: "Kiosk Journal", href: "/journal" },
];
const LEGAL_LINKS = [
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Cookie Policy", href: "/legal/cookies" },
  { label: "Business Listing Policy", href: "/legal/business-listing" },
  { label: "Acceptable Use", href: "/legal/acceptable-use" },
];

interface FooterProps { variant?: "dark" | "paper"; }

export function Footer({ variant = "dark" }: FooterProps) {
  const isDark = variant === "dark";
  const bg = isDark ? "bg-[#12110F] text-[#EDE7DC]" : "bg-[#EDE7DC] text-[#12110F] border-t border-black/10";
  const muted = isDark ? "text-[#8A8478]" : "text-[#777064]";
  const divider = isDark ? "border-white/10" : "border-black/10";
  return (
    <footer className={`${bg} px-6 py-14 md:px-12 md:py-16`}>
      <div className="mx-auto max-w-[1440px]">
        <div className="flex flex-col gap-5 border-b pb-9 sm:flex-row sm:items-end sm:justify-between ${divider}">
          <div>
            <FooterWordmark />
            <p className={`mt-4 max-w-[360px] text-[13px] leading-6 ${muted}`}>Helping independent businesses become easier for AI assistants to find and understand.</p>
          </div>
          <p className={`eyebrow ${muted}`}>Local businesses belong in the AI economy.</p>
        </div>
        <div className={`mt-9 grid grid-cols-2 gap-x-6 gap-y-8 border-b pb-10 sm:grid-cols-4 ${divider}`}>
          {[
            { title: "Product", links: PRODUCT_LINKS },
            { title: "Company", links: COMPANY_LINKS },
            { title: "Legal", links: LEGAL_LINKS },
          ].map((group) => (
            <div key={group.title}>
              <p className={`eyebrow mb-4 ${muted}`}>{group.title}</p>
              <ul className="space-y-1">
                {group.links.map((link) => (
                  <li key={link.href}><Link href={link.href} className={`inline-flex min-h-8 items-center text-[13px] opacity-75 transition-colors hover:text-[#D96845] hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D96845]`}>{link.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className={`eyebrow mb-4 ${muted}`}>Connect</p>
            <p className={`text-[13px] leading-6 ${muted}`}>Our social channels are coming soon. Follow along as we build.</p>
            <p className={`mt-3 text-[12px] leading-6 ${muted}`}>Follow Kiosk on X, LinkedIn, Instagram and YouTube. Our official channels will be added here soon.</p>
          </div>
        </div>
        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className={`text-[11px] ${muted}`}>© {new Date().getFullYear()} Kiosk. All rights reserved.</p>
          <p className={`max-w-[540px] text-[10px] leading-5 ${muted}`}>Kiosk is currently operated by its founders as individuals and is not yet an incorporated company.</p>
        </div>
      </div>
    </footer>
  );
}

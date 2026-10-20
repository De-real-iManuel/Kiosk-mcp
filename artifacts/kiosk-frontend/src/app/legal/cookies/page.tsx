import Link from "next/link";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Cookie Policy — Kiosk",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-white/10 pt-8 mt-8 first:mt-0 first:border-0 first:pt-0">
      <h2 className="text-[18px] font-semibold tracking-[-.04em] text-[#EDE7DC] mb-4">
        {title}
      </h2>
      <div className="space-y-3 text-[14px] leading-7 text-[#A49D90]">
        {children}
      </div>
    </section>
  );
}

export default function CookiesPage() {
  return (
    <main className="grain min-h-[100dvh] bg-[#12110F] text-[#EDE7DC]">
      <header className="border-b border-white/10 bg-[#12110F]">
        <div className="mx-auto flex h-[74px] max-w-[1440px] items-center px-6 md:px-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-[#8A8478] transition-colors hover:text-[#EDE7DC]"
          >
            <ArrowLeft size={14} /> Back to Kiosk
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[760px] px-6 py-16 md:px-12 md:py-24">
        <p className="eyebrow text-[#8A8478] mb-5">Legal</p>
        <h1 className="text-[clamp(2.4rem,5vw,3.8rem)] font-semibold leading-[.92] tracking-[-.07em] text-[#EDE7DC]">
          Cookie Policy
        </h1>
        <p className="mono text-[11px] text-[#8A8478] mt-4 mb-12">
          Effective date: October 2026 · Version 1.0
        </p>

        <div className="p-4 border border-[#8A8478]/30 bg-[#1C1A16] mb-10">
          <p className="text-[12px] leading-6 text-[#A49D90]">
            <strong className="text-[#EDE7DC]">Notice:</strong> This is an
            initial cookie policy prepared for the Kiosk platform. It reflects
            the browser storage used by the current application as built.
          </p>
        </div>

        <Section title="1. What are cookies and browser storage?">
          <p>
            Cookies are small pieces of data stored in your browser by websites
            you visit. Browsers also provide other storage mechanisms including
            localStorage and sessionStorage. Kiosk uses these mechanisms
            primarily to support authentication.
          </p>
        </Section>

        <Section title="2. Essential authentication storage">
          <p>
            Kiosk uses <strong className="text-[#EDE7DC]">Clerk</strong> for
            user authentication. When you sign in, Clerk stores session tokens
            in your browser to keep you signed in across page loads. This
            storage is essential for the platform to function — without it, you
            would not be able to sign in or access your dashboard.
          </p>
          <p>
            Clerk may store data using cookies, localStorage, or sessionStorage
            depending on your browser and session type. This data is used only
            for authentication and session management. It is not used for
            advertising or tracking.
          </p>
          <p>
            For details on what Clerk stores in your browser, see the{" "}
            <a
              href="https://clerk.com/privacy"
              className="text-[#EDE7DC] underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              Clerk Privacy Policy
            </a>
            .
          </p>
        </Section>

        <Section title="3. Theme preference">
          <p>
            Kiosk stores your interface theme preference (light or dark mode) in
            localStorage under the key{" "}
            <code className="mono text-[12px] text-[#EDE7DC]">kiosk-theme</code>
            . This data stays in your browser and is not sent to any server.
          </p>
        </Section>

        <Section title="4. Analytics and tracking">
          <p>
            Kiosk does not currently use third-party analytics services such as
            Google Analytics. No advertising cookies or cross-site tracking
            cookies are used by this platform.
          </p>
          <p>
            Server-side event logging (for example, recording that a business
            profile was viewed) is handled through the platform&apos;s own
            database and does not use browser-side tracking.
          </p>
        </Section>

        <Section title="5. How to control cookies">
          <p>
            You can control and delete cookies through your browser settings.
            Most browsers allow you to:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>View cookies and storage currently set by a website</li>
            <li>Delete cookies for a specific site or all sites</li>
            <li>Block cookies from specific sites or all sites</li>
          </ul>
          <p>
            If you block or delete Clerk&apos;s authentication cookies, you will
            be signed out and will need to sign in again the next time you
            visit. Other platform features that do not require authentication
            will continue to work normally.
          </p>
          <p>
            Your browser&apos;s help pages will explain how to manage cookies
            for your specific browser.
          </p>
        </Section>

        <Section title="6. Changes to this policy">
          <p>
            If the platform adds new cookies or storage mechanisms, this policy
            will be updated. The effective date at the top of the page will
            reflect when the policy was last changed.
          </p>
        </Section>
      </div>

      <Footer variant="dark" />
    </main>
  );
}

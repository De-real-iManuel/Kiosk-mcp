import Link from "next/link";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service — Kiosk",
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

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="mono text-[11px] text-[#8A8478] mt-4 mb-12">
          Effective date: October 2026 · Version 1.0
        </p>

        <div className="p-4 border border-[#8A8478]/30 bg-[#1C1A16] mb-10">
          <p className="text-[12px] leading-6 text-[#A49D90]">
            <strong className="text-[#EDE7DC]">Notice:</strong> These are
            initial product terms prepared for the Kiosk platform. They have not
            been reviewed by a qualified legal professional. Before commercial
            use, these terms should be reviewed and updated by appropriate legal
            counsel.
          </p>
        </div>

        <Section title="1. About Kiosk">
          <p>
            Kiosk is a platform that allows business owners to create a
            structured business profile and make that profile accessible to AI
            agents through the Model Context Protocol (MCP). Kiosk provides the
            infrastructure; it does not operate the businesses listed on it.
          </p>
          <p>
            By using Kiosk, you agree to these terms. If you do not agree, do
            not use the platform.
          </p>
        </Section>

        <Section title="2. Account responsibility">
          <p>
            You are responsible for maintaining the security of your account
            credentials. You must not share your account with others or use
            another person&apos;s account without their permission.
          </p>
          <p>
            You are responsible for all activity that occurs under your account.
            If you believe your account has been compromised, you should take
            steps to secure it immediately.
          </p>
          <p>
            Kiosk uses Clerk for authentication. Your account credentials are
            managed by Clerk subject to their own terms and privacy policy.
          </p>
        </Section>

        <Section title="3. Business information">
          <p>
            When you create a business profile, you are responsible for the
            accuracy of the information you provide. You must not submit false,
            misleading, or fraudulent business information.
          </p>
          <p>
            You represent that you have the right to publish the business
            information you submit — including business name, description,
            services, contact details, and opening hours.
          </p>
          <p>
            Kiosk stores the information you provide in its database.
            Information is processed in accordance with the Privacy Policy.
          </p>
        </Section>

        <Section title="4. Publishing and discovery">
          <p>
            When you publish a business profile, that profile becomes
            discoverable by AI agents and other users of the Kiosk platform.
            Published profiles are publicly accessible through the Kiosk
            marketplace and through the MCP endpoints provisioned by the
            platform.
          </p>
          <p>
            You can unpublish a business profile at any time. Unpublishing
            removes the profile from public discovery. Published information may
            have been accessed, cached, or indexed by third-party AI agents
            before unpublishing.
          </p>
          <p>
            Kiosk does not guarantee that published information will appear in
            any particular search result or that AI agents will discover your
            business.
          </p>
        </Section>

        <Section title="5. AI agents and MCP integrations">
          <p>
            Kiosk provides MCP endpoints that allow compatible AI agents to
            discover and retrieve information about published businesses. These
            integrations are provided as-is.
          </p>
          <p>
            Kiosk does not control the behaviour of third-party AI agents that
            connect to the platform. The platform is not responsible for how
            external AI systems interpret, use, or act on business information.
          </p>
          <p>
            Order requests and booking requests recorded through Kiosk are
            intents only. They do not constitute confirmed orders, guaranteed
            bookings, or payment obligations. Businesses are responsible for
            confirming and fulfilling any requests independently.
          </p>
          <p>
            Kiosk does not process payments. Any financial transactions between
            customers and businesses occur outside the platform.
          </p>
        </Section>

        <Section title="6. Prohibited use">
          <p>You must not use Kiosk to:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Submit false, misleading, or fraudulent business information
            </li>
            <li>Impersonate another business or person</li>
            <li>
              Publish content that is unlawful, defamatory, or infringes the
              rights of others
            </li>
            <li>
              Attempt to disrupt, damage, or gain unauthorised access to the
              platform or its infrastructure
            </li>
            <li>
              Use the platform in a way that violates applicable laws or
              regulations in your jurisdiction
            </li>
            <li>
              Scrape, extract, or systematically copy platform data without
              authorisation
            </li>
          </ul>
        </Section>

        <Section title="7. Service availability and changes">
          <p>
            Kiosk is provided on a best-efforts basis. We do not guarantee
            uninterrupted availability of the platform or its MCP endpoints.
          </p>
          <p>
            We may modify, suspend, or discontinue any part of the platform at
            any time. We will try to provide reasonable notice where possible,
            but are not obligated to do so.
          </p>
          <p>
            These terms may be updated from time to time. Continued use of the
            platform after changes are published constitutes acceptance of the
            updated terms.
          </p>
        </Section>

        <Section title="8. Limitation of liability">
          <p>
            Kiosk is provided &quot;as is&quot; without warranties of any kind.
            To the maximum extent permitted by applicable law, Kiosk and its
            creators are not liable for any indirect, incidental, or
            consequential damages arising from your use of the platform.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            This platform was built by Emmanuel Okechukwu Nwajari as part of the
            Amazon Builders Challenge 2026. For questions about these terms,
            open an issue on the{" "}
            <a
              href="https://github.com/De-real-iManuel/Kiosk-mcp"
              className="text-[#EDE7DC] underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              project repository
            </a>
            .
          </p>
        </Section>
      </div>

      <Footer variant="dark" />
    </main>
  );
}

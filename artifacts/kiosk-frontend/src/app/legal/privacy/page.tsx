import Link from "next/link";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — Kiosk",
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

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="mono text-[11px] text-[#8A8478] mt-4 mb-12">
          Effective date: October 2026 · Version 1.0
        </p>

        <div className="p-4 border border-[#8A8478]/30 bg-[#1C1A16] mb-10">
          <p className="text-[12px] leading-6 text-[#A49D90]">
            <strong className="text-[#EDE7DC]">Notice:</strong> This is an
            initial privacy policy prepared for the Kiosk platform. It has not
            been reviewed by a qualified legal or privacy professional. Before
            commercial use, this policy should be reviewed by appropriate
            counsel.
          </p>
        </div>

        <Section title="1. What information Kiosk collects">
          <p>
            <strong className="text-[#EDE7DC]">Account information.</strong>{" "}
            When you sign up, Kiosk receives your email address and basic
            account identifiers from Clerk, the authentication provider used by
            the platform.
          </p>
          <p>
            <strong className="text-[#EDE7DC]">Business profile data.</strong>{" "}
            When you create a business profile, Kiosk stores the information you
            provide: business name, description, category, services, location,
            contact details, opening hours, and any other fields you complete.
          </p>
          <p>
            <strong className="text-[#EDE7DC]">Usage and event data.</strong>{" "}
            Kiosk records events such as when a business profile is viewed,
            contacted, or accessed through an MCP endpoint. These events are
            associated with the business profile, not directly with individual
            visitors.
          </p>
          <p>
            <strong className="text-[#EDE7DC]">Agent interaction data.</strong>{" "}
            When an AI agent connects to a business MCP endpoint, Kiosk logs
            session events and tool calls. These logs are used for the analytics
            shown to business owners.
          </p>
        </Section>

        <Section title="2. How Kiosk uses your information">
          <p>Kiosk uses the information you provide to operate the platform:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>To create and display your business profile</li>
            <li>
              To provision and serve your business&apos;s MCP endpoint to
              compatible AI agents
            </li>
            <li>
              To display analytics about how your profile has been accessed
            </li>
            <li>To maintain platform security and prevent abuse</li>
          </ul>
          <p>
            Kiosk does not sell your personal information to third parties.
            Kiosk does not use your information for advertising targeting.
          </p>
        </Section>

        <Section title="3. Published business information">
          <p>
            When you publish a business profile, the information in that profile
            becomes publicly accessible. This includes your business name,
            description, services, location, contact details, and opening hours.
          </p>
          <p>
            Published profiles are accessible through the Kiosk marketplace, the
            Kiosk Master MCP endpoint, and business-specific MCP endpoints.
            Compatible AI agents may access, store, and use this information
            according to their own policies.
          </p>
          <p>
            Your account email address and Clerk user identifier are never
            included in public-facing responses.
          </p>
        </Section>

        <Section title="4. Third-party providers">
          <p>Kiosk uses the following third-party services to operate:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-[#EDE7DC]">Clerk</strong> — handles user
              authentication, sign-in, and sign-up. Your email and account
              credentials are stored and managed by Clerk. See{" "}
              <a
                href="https://clerk.com/privacy"
                className="text-[#EDE7DC] underline underline-offset-4"
                target="_blank"
                rel="noreferrer"
              >
                clerk.com/privacy
              </a>
              .
            </li>
            <li>
              <strong className="text-[#EDE7DC]">Supabase / PostgreSQL</strong>{" "}
              — stores business profiles, categories, capabilities, analytics
              events, and agent interaction logs. Data is stored in a PostgreSQL
              database hosted on Supabase.
            </li>
            <li>
              <strong className="text-[#EDE7DC]">Amazon Web Services</strong> —
              the platform infrastructure runs on AWS ECS Fargate. Application
              logs are collected by Amazon CloudWatch. See{" "}
              <a
                href="https://aws.amazon.com/privacy/"
                className="text-[#EDE7DC] underline underline-offset-4"
                target="_blank"
                rel="noreferrer"
              >
                aws.amazon.com/privacy
              </a>
              .
            </li>
          </ul>
        </Section>

        <Section title="5. Data retention">
          <p>
            Business profile data is retained while your account remains active.
            If you delete a business profile, its data is removed from the
            database. Agent event logs associated with a deleted business are
            set to null but may remain in the database for operational purposes.
          </p>
          <p>
            We do not currently have an automated process for account deletion.
            To request deletion of your account and associated data, contact us
            through the project repository.
          </p>
        </Section>

        <Section title="6. Security">
          <p>
            Kiosk uses reasonable technical measures to protect stored
            information, including encrypted connections and secure credential
            management through AWS Secrets Manager.
          </p>
          <p>
            No system is completely secure. We cannot guarantee that information
            stored on the platform will never be accessed without authorisation.
          </p>
        </Section>

        <Section title="7. Your rights">
          <p>
            You can edit or delete your business profile at any time through
            your dashboard. You can request deletion of your account and
            associated data by contacting us through the project repository.
          </p>
          <p>
            This platform does not make specific claims about compliance with
            any regional privacy regulations. If you have concerns about how
            your data is handled, please contact us.
          </p>
        </Section>

        <Section title="8. Contact">
          <p>
            For privacy-related questions, open an issue on the{" "}
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

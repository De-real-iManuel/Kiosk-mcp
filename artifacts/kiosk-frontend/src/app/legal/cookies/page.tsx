import Link from "next/link";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Cookie Policy — Kiosk",
  description: "How Kiosk uses cookies and similar browser storage technologies.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-8 border-t border-white/10 pt-8 first:mt-0 first:border-0 first:pt-0"><h2 className="mb-4 text-[18px] font-semibold tracking-[-.04em] text-[#EDE7DC]">{title}</h2><div className="space-y-3 text-[14px] leading-7 text-[#A49D90]">{children}</div></section>;
}

export default function CookiesPage() {
  return (
    <main className="grain min-h-[100dvh] bg-[#12110F] text-[#EDE7DC]">
      <header className="border-b border-white/10"><div className="mx-auto flex h-[74px] max-w-[1440px] items-center px-6 md:px-12"><Link href="/" className="inline-flex items-center gap-2 text-xs text-[#8A8478] hover:text-[#D96845]"><ArrowLeft size={14}/> Back to Kiosk</Link></div></header>
      <article className="mx-auto max-w-[760px] px-6 py-16 md:px-12 md:py-24">
        <p className="eyebrow mb-5 text-[#8A8478]">Legal / Browser storage</p><h1 className="text-[clamp(2.4rem,5vw,3.8rem)] font-semibold leading-[.92] tracking-[-.07em]">Cookie Policy</h1>
        <p className="mono mt-4 mb-10 text-[11px] text-[#8A8478]">Effective date: 7 November 2026 · Draft for technical review</p>
        <div className="mb-10 border border-[#D96845]/35 bg-[#1C1A16] p-4"><p className="text-[12px] leading-6 text-[#C5BFB2]"><strong className="text-[#EDE7DC]">Important:</strong> This policy describes the storage purposes currently understood from the application. The production cookies and browser storage must be audited in each supported browser before publication. Provider implementations may change.</p></div>
        <Section title="1. What are cookies and similar technologies?"><p>Cookies are small files stored by a website in your browser. Websites may also use local storage, session storage and similar technologies to remember settings, maintain sign-in sessions, protect the service and understand how features are used.</p></Section>
        <Section title="2. Essential authentication and security"><p>Kiosk uses Clerk for authentication. Clerk and the application may use cookies or other browser storage to maintain sign-in sessions, protect account access and support authentication flows. These technologies are necessary for account and dashboard features to work properly.</p><p>If you block or clear essential authentication storage, you may be signed out or unable to use features that require an account. Public pages may remain accessible.</p></Section>
        <Section title="3. Preferences"><p>The application may store interface preferences, such as a selected theme, in browser storage so that your choice is remembered on your device. Preference storage is not intended to identify you across unrelated websites.</p></Section>
        <Section title="4. Analytics and server logs"><p>Kiosk may collect server-side operational logs and service events, such as endpoint requests, timestamps, errors and feature usage. Server-side logging is not the same as an advertising cookie. The team will disclose any analytics or measurement tools that are added to the website and will provide consent controls where required by law.</p><p>At the date of this draft, Kiosk does not intend to use advertising cookies or cross-site behavioural advertising. This statement must be rechecked against the live production configuration before publication.</p></Section>
        <Section title="5. Managing browser storage"><p>You can usually view, block or delete cookies and other site storage through your browser settings. The available controls differ by browser and device. Blocking essential storage may prevent sign-in or account features from working.</p><p>If Kiosk adds non-essential cookies that require consent in your jurisdiction, we will provide an appropriate notice and consent mechanism before setting them.</p></Section>
        <Section title="6. Third-party services"><p>Authentication and other embedded or integrated providers may set or access their own storage when you use their services. Their practices are governed by their own privacy and cookie notices. Kiosk will update this policy if additional providers introduce relevant browser technologies.</p></Section>
        <Section title="7. Updates and contact"><p>We may update this policy when the application or its providers change. Please check the effective date at the top of this page.</p><p>For questions about cookies or browser storage, contact the Kiosk founders using the contact details published on the Kiosk website. A dedicated Kiosk domain email will be added when it is configured.</p></Section>
      </article>
      <Footer variant="dark"/>
    </main>
  );
}

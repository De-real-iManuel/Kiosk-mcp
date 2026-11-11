import Link from "next/link";
import { Footer } from "@/components/Footer";
import { ArrowUpRight } from "lucide-react";

export const metadata = {
  title: "About Kiosk",
  description: "Kiosk is building a connection layer between independent local businesses, customers and AI assistants.",
};

const principles = [
  { n: "01", title: "Local businesses deserve to be found", body: "A great business should not need a custom website, software team or complicated integration before people can understand what it offers. Kiosk gives independent businesses a clear, structured presence they can manage." },
  { n: "02", title: "Discovery should lead somewhere", body: "Finding a business is only the beginning. Useful information should help a customer understand the offer, decide whether it fits and reach the people behind the business to confirm availability and next steps." },
  { n: "03", title: "Technology should stay out of the way", body: "Business owners should be able to describe their work in familiar terms. Kiosk handles the structured publishing and discovery layer behind the scenes, including interfaces designed for compatible AI systems." },
];

export default function AboutPage() {
  return (
    <main className="grain min-h-screen bg-[#12110F] text-[#EDE7DC]">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between px-6 md:px-12">
          <Link href="/" className="kiosk-wordmark text-2xl">Kiosk</Link>
          <nav className="flex items-center gap-5 text-xs text-[#A49D90]"><Link href="/journal" className="hover:text-[#D96845]">Journal</Link><Link href="/marketplace" className="hover:text-[#D96845]">Marketplace ↗</Link></nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1440px] gap-12 px-6 py-20 md:grid-cols-[1.05fr_.95fr] md:items-center md:px-12 md:py-32">
        <div>
          <p className="eyebrow mb-6 text-[#D96845]">About Kiosk · Local commerce infrastructure</p>
          <h1 className="max-w-3xl text-[clamp(3rem,7vw,6.8rem)] font-semibold leading-[.9] tracking-[-.08em]">Local businesses should be part of the way people search.</h1>
          <p className="serif mt-8 max-w-2xl text-[clamp(1.45rem,2.4vw,2rem)] leading-[1.3] text-[#C5BFB2]">We’re building a connection layer between independent businesses, customers and AI assistants—so local discovery can lead to a real conversation with the business.</p>
          <Link href="/marketplace" className="mt-9 inline-flex items-center gap-3 bg-[#D96845] px-6 py-4 text-sm font-semibold text-[#12110F] hover:bg-[#E47B59]">Explore local businesses <ArrowUpRight size={16}/></Link>
        </div>
        <div className="relative min-h-[360px] overflow-hidden border border-white/10 bg-[#1C1A16]">
          <img src="https://images.unsplash.com/photo-1753351054656-48517dde5059?auto=format&fit=crop&w=1200&q=85" alt="Independent local shop" className="absolute inset-0 h-full w-full object-cover opacity-75"/>
          <div className="absolute inset-0 bg-gradient-to-t from-[#12110F]/90 via-[#12110F]/10 to-transparent"/>
          <div className="absolute bottom-6 left-6 right-6"><p className="eyebrow text-[#D96845]">The idea</p><p className="serif mt-2 max-w-md text-2xl leading-tight">Make it easier to find the right local business—and reach the person behind it.</p></div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#1C1A16]">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-20 md:grid-cols-[.8fr_1.2fr] md:px-12 md:py-28">
          <div><p className="eyebrow mb-5 text-[#D96845]">The problem we see</p><h2 className="max-w-lg text-[clamp(2.5rem,5vw,4.5rem)] font-semibold leading-[.95] tracking-[-.07em]">Being online is not the same as being reachable.</h2></div>
          <div className="space-y-5 text-[15px] leading-7 text-[#C5BFB2]">
            <p>A business can have a physical location, loyal customers and a good reputation while still being difficult for a new customer—or a software assistant—to understand. Its services may live in a social post, its prices in a chat, its hours on a sign and its contact details somewhere else.</p>
            <p>Even when a business appears in a search result or on a map, that does not necessarily tell a customer what it offers, whether it fits their needs or how to take the next step. Discovery often stops before a useful interaction begins.</p>
            <p>Large businesses can invest in websites, booking systems and integrations. Independent businesses should not need the same technical resources just to be represented clearly.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-20 md:px-12 md:py-28">
        <div className="grid gap-10 md:grid-cols-[.8fr_1.2fr]">
          <div><p className="eyebrow mb-5 text-[#D96845]">What Kiosk is building</p><h2 className="max-w-lg text-[clamp(2.5rem,5vw,4.5rem)] font-semibold leading-[.95] tracking-[-.07em]">A network, not another global store.</h2></div>
          <div className="space-y-5 text-[15px] leading-7 text-[#C5BFB2]">
            <p>Kiosk is focused on independent businesses around the customer: the salon in their neighbourhood, the repairer nearby, the tailor across town, the restaurant they have not discovered yet.</p>
            <p>Businesses publish structured information through Kiosk. That information can be explored in the Kiosk marketplace and made available through compatible AI discovery interfaces. Customers can review what a business offers and continue to its available contact channel.</p>
            <p>Our ambition is to make the journey more useful over time: from discovery to enquiry, quotation, booking and—where the business supports it—transaction. Each step has to work reliably and make sense for the business and the customer. We will earn that capability through real usage, not promises.</p>
          </div>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {principles.map((item) => <article key={item.n} className="border border-white/10 bg-[#1C1A16] p-6 md:p-7"><span className="mono text-xs text-[#D96845]">{item.n}</span><h3 className="mt-8 text-xl font-semibold tracking-[-.04em]">{item.title}</h3><p className="mt-3 text-sm leading-7 text-[#A49D90]">{item.body}</p></article>)}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#171613]">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-6 py-20 md:grid-cols-2 md:px-12 md:py-24">
          <div><p className="eyebrow mb-5 text-[#D96845]">How the network works</p><h2 className="text-[clamp(2.5rem,5vw,4.2rem)] font-semibold leading-[.95] tracking-[-.07em]">Three parts. One useful connection.</h2></div>
          <div className="space-y-0">
            {[["01 / BUSINESSES","Publish accurate details about services, products, location and ways to make contact."],["02 / KIOSK","Organises business information and provides discovery through the marketplace and compatible interfaces."],["03 / CUSTOMERS","Explore options, understand what a business offers and contact it to confirm the details."]].map(([label,body])=><div key={label} className="border-t border-white/10 py-5"><p className="mono text-[10px] text-[#D96845]">{label}</p><p className="mt-3 max-w-xl text-sm leading-7 text-[#C5BFB2]">{body}</p></div>)}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#EDE7DC] text-[#12110F]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-16 md:flex-row md:items-end md:justify-between md:px-12">
          <div><p className="eyebrow text-[#8A8478]">Build with us</p><h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-.06em]">A more connected local economy starts with real businesses.</h2><p className="mt-4 max-w-xl text-sm leading-6 text-[#686257]">We’re starting with the businesses and communities willing to help shape a more useful way to be discovered and reached.</p></div>
          <Link href="/create" className="inline-flex shrink-0 items-center gap-3 bg-[#D96845] px-6 py-4 text-sm font-semibold text-[#12110F] hover:bg-[#c75c3c]">List your business <ArrowUpRight size={16}/></Link>
        </div>
      </section>
      <Footer/>
    </main>
  );
}

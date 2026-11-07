import Link from "next/link";
import { Footer } from "@/components/Footer";
import { ArrowUpRight, BookOpen } from "lucide-react";

export const metadata = { title: "Kiosk Journal", description: "Practical guides to local business discovery, AI assistants and making business information understandable to agents." };

const articles = [
{tag:"AI DISCOVERY",title:"Why AI assistants can miss the best local businesses",intro:"A practical look at scattered business information, incomplete listings and why independent businesses can be hard for AI tools to understand.",read:"5 min read",image:"https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1000&q=85"},
{tag:"FOR BUSINESS OWNERS",title:"What does it mean to make a business AI-discoverable?",intro:"A plain-language guide to structured business information, service descriptions, location details and contact channels.",read:"4 min read",image:"https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1000&q=85"},
{tag:"TECHNOLOGY, EXPLAINED",title:"MCP explained: how AI assistants connect to useful information",intro:"Understand the Model Context Protocol without needing to be a developer—and why it matters for business discovery.",read:"6 min read",image:"https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=85"},
{tag:"PRACTICAL GUIDE",title:"The business details an AI assistant needs to answer well",intro:"A checklist for writing clear descriptions, accurate hours, service lists, price guidance and ways for customers to reach you.",read:"4 min read",image:"https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1000&q=85"},
];

export default function JournalPage() {
 return <main className="grain min-h-screen bg-[#12110F] text-[#EDE7DC]"><header className="border-b border-white/10"><div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between px-6 md:px-12"><Link href="/" className="kiosk-wordmark text-2xl">Kiosk</Link><Link href="/about" className="text-xs text-[#A49D90] hover:text-[#D96845]">About Kiosk ↗</Link></div></header>
 <section className="mx-auto max-w-[1440px] px-6 py-20 md:px-12 md:py-28"><p className="eyebrow mb-5 text-[#D96845]">The Kiosk Journal</p><div className="grid gap-8 md:grid-cols-[1fr_.7fr] md:items-end"><h1 className="max-w-4xl text-[clamp(3rem,7vw,6.8rem)] font-semibold leading-[.9] tracking-[-.08em]">Make the new internet easier to understand.</h1><p className="serif max-w-xl text-xl leading-8 text-[#C5BFB2]">Notes, explainers and practical guides for independent businesses navigating AI-powered discovery.</p></div>
 <div className="mt-16 grid gap-6 md:grid-cols-2">{articles.map((a,i)=><article key={a.title} className="group overflow-hidden border border-white/10 bg-[#1C1A16]"><div className="relative aspect-[16/9] overflow-hidden"><img src={a.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"/><span className="absolute left-4 top-4 bg-[#12110F]/85 px-3 py-2 text-[9px] tracking-[.16em] text-[#EDE7DC]">{a.tag}</span></div><div className="p-6 md:p-8"><div className="flex items-center gap-2 text-[10px] text-[#8A8478]"><BookOpen size={12}/><span>{a.read}</span><span>·</span><span>{i===0?"Foundations":"Field notes"}</span></div><h2 className="mt-5 max-w-xl text-2xl font-semibold leading-tight tracking-[-.04em]">{a.title}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#A49D90]">{a.intro}</p><span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-[#D96845]">Coming in the Journal <ArrowUpRight size={14}/></span></div></article>)}</div>
 <p className="mt-10 border-l-2 border-[#D96845] pl-4 text-xs leading-6 text-[#8A8478]">These are planned editorial topics, not published articles or claims of customer results. Full articles will be added as they are researched and written.</p>
 </section><Footer/></main>;
}

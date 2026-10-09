'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BusinessDetailPage } from '@/Surfaces';

function DetailRoute() {
  const params = useSearchParams();
  const slug = params?.get('slug') ?? '';
  if (!slug) return <main className="min-h-[100dvh] bg-[#EDE7DC] px-5 py-20 text-[#12110F]"><div className="mx-auto max-w-3xl"><p className="eyebrow text-[#777064]">Marketplace / Missing listing</p><h1 className="mt-6 text-4xl font-semibold tracking-[-.07em]">No Kiosk was selected.</h1><a className="surface-link mt-5 inline-block text-sm" href="/marketplace">Return to the marketplace</a></div></main>;
  return <BusinessDetailPage slug={slug} />;
}

export default function BusinessDetailRoute() {
  return <Suspense fallback={<main className="min-h-[100dvh] animate-pulse bg-[#EDE7DC]" />}><DetailRoute /></Suspense>;
}

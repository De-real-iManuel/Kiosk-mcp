"use client";

import { useAuth, useClerk, useUser } from "@clerk/react";
import { ArrowLeft, LogOut } from "lucide-react";
import Link from "next/link";

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-black/10 py-5">
      <div>
        <p className="text-[14px] font-semibold tracking-[-.02em]">{label}</p>
        {description && (
          <p className="mt-1 text-[12px] text-[#777064]">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();

  if (!isLoaded) {
    return (
      <main className="grain min-h-[100dvh] bg-[#EDE7DC] text-[#12110F]">
        <div className="mx-auto max-w-[760px] animate-pulse px-5 py-24">
          <div className="h-10 w-1/3 bg-black/10" />
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="grain min-h-[100dvh] bg-[#EDE7DC] text-[#12110F]">
        <div className="mx-auto max-w-[760px] px-5 py-20">
          <p className="eyebrow text-[#777064]">Settings</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-.07em]">
            Sign in to access settings.
          </h1>
          <Link
            href="/sign-in?redirect_url=%2Fsettings"
            className="surface-button mt-8"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const displayName =
    user?.fullName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress ??
    "Your account";
  const email = user?.primaryEmailAddress?.emailAddress;
  const initials = (user?.fullName ?? user?.username ?? "?")
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="grain min-h-[100dvh] bg-[#EDE7DC] text-[#12110F]">
      <div className="mx-auto max-w-[760px] px-5 py-12 md:px-8 md:py-16">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs text-[#625D53] transition-colors hover:text-[#12110F]"
        >
          <ArrowLeft size={14} /> Dashboard
        </Link>

        {/* Profile header */}
        <div className="mt-10 flex items-center gap-5 border-b border-black/10 pb-8">
          <div className="grid h-14 w-14 place-items-center bg-[#12110F] text-[#EDE7DC] text-[18px] font-semibold tracking-tight">
            {initials}
          </div>
          <div>
            <p className="text-[20px] font-semibold tracking-[-.04em]">
              {displayName}
            </p>
            {email && (
              <p className="mt-0.5 text-[13px] text-[#777064]">{email}</p>
            )}
          </div>
        </div>

        <h1 className="mt-8 text-[clamp(2rem,5vw,3rem)] font-semibold leading-[.92] tracking-[-.07em]">
          Settings
        </h1>

        <section className="mt-8">
          <p className="eyebrow mb-2 text-[#777064]">Account</p>
          <SettingRow
            label="Your Kiosks"
            description="Manage your business windows and activity."
          >
            <Link
              href="/dashboard"
              className="surface-button surface-button-light !min-h-10 !px-4 !text-[12px]"
            >
              Dashboard
            </Link>
          </SettingRow>
          <SettingRow
            label="Sign out"
            description="Sign out of your Kiosk account on this device."
          >
            <button
              onClick={() => signOut({ redirectUrl: "/" })}
              className="inline-flex items-center gap-2 border border-black/20 px-4 py-2 text-[12px] font-semibold text-[#625D53] transition-colors hover:border-[#9C493F] hover:text-[#9C493F]"
            >
              <LogOut size={13} /> Sign out
            </button>
          </SettingRow>
        </section>

        {/* Danger zone */}
        <section className="mt-10 border-t border-black/10 pt-8">
          <p className="eyebrow mb-2 text-[#777064]">Danger zone</p>
          <div className="border border-[#D1786B]/30 bg-[#D1786B]/5 p-5">
            <p className="text-[14px] font-semibold">Delete account</p>
            <p className="mt-1 text-[12px] text-[#777064]">
              Permanently delete your account and all associated Kiosk profiles.
              This cannot be undone.
            </p>
            <p className="mt-3 text-[11px] text-[#777064]">
              To delete your account, contact us at{" "}
              <a href="mailto:support@kiosk.so" className="surface-link">
                support@kiosk.so
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

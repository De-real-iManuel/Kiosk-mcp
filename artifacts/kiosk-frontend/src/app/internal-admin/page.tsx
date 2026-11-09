import { InternalAdminDashboard } from "@/components/internal-admin/InternalAdminDashboard";

export const metadata = {
  title: "Internal Admin | Kiosk",
  robots: { index: false, follow: false },
};

export default function InternalAdminPage() {
  return <InternalAdminDashboard />;
}

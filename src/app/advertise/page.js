import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import AdvertiseStudio from "@/components/AdvertiseStudio";
import { isAdminUser } from "@/lib/admin";

export const metadata = {
  title: "Advertise Studio | Capital Region Investor Hub",
  robots: { index: false, follow: false },
};

// Checked on the server, so the page never reaches a non-admin browser.
export default async function AdvertisePage() {
  const user = await currentUser();

  if (!isAdminUser(user)) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          padding: 32,
          textAlign: "center",
          fontFamily: "'DM Sans', sans-serif",
          background: "var(--b-navy-deep)",
          color: "var(--b-white)",
        }}
      >
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 34, letterSpacing: 2, margin: 0 }}>
          Not available on this account
        </h1>
        <p style={{ color: "var(--b-gray-muted)", fontSize: 14, margin: 0, maxWidth: 380 }}>
          The Advertise Studio is limited to Empire staff accounts.
        </p>
        <Link href="/" style={{ color: "var(--b-green-light)", fontWeight: 700, fontSize: 14 }}>
          Back to the Investor Hub
        </Link>
      </main>
    );
  }

  return <AdvertiseStudio />;
}

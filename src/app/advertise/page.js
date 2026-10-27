import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import AdvertiseStudio from "@/components/AdvertiseStudio";
import { isAdminUser } from "@/lib/admin";

export const metadata = {
  title: "Advertise Studio | Capital Region Investor Hub",
  robots: { index: false, follow: false },
};

// Checked on the server, so the Studio never reaches a non-admin browser.
// Everyone else gets a plain 404, which doesn't reveal the page exists.
export default async function AdvertisePage() {
  const user = await currentUser();
  if (!isAdminUser(user)) notFound();
  return <AdvertiseStudio />;
}

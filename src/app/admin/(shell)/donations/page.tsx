import { prisma } from "@/lib/prisma";
import DonationsManager from "@/components/admin/DonationsManager";

export default async function AdminDonationsPage() {
  const donations = await prisma.donation.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Donations</h1>
      <p className="mt-1 text-sm text-stone-500">
        Track donations submitted from the website and record manual/offline donations.
      </p>
      <DonationsManager initialDonations={donations} />
    </div>
  );
}

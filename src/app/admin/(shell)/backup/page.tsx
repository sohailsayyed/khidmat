import { prisma } from "@/lib/prisma";
import BackupManager from "@/components/admin/BackupManager";

export default async function AdminBackupPage() {
  const [causes, gallery, testimonials, donations, expenses] = await Promise.all([
    prisma.cause.count(),
    prisma.galleryImage.count(),
    prisma.testimonial.count(),
    prisma.donation.count(),
    prisma.expense.count(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Backup &amp; Restore</h1>
      <p className="mt-1 text-sm text-stone-500">
        Download a full backup before doing any maintenance, and restore from it if something goes wrong.
      </p>
      <BackupManager counts={{ causes, gallery, testimonials, donations, expenses }} />
    </div>
  );
}

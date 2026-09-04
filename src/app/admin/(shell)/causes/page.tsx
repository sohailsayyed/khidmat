import { prisma } from "@/lib/prisma";
import CausesManager from "@/components/admin/CausesManager";

export default async function AdminCausesPage() {
  const causes = await prisma.cause.findMany({
    orderBy: { order: "asc" },
    include: { images: { orderBy: { order: "asc" } } },
  });
  return (
    <div>
      <h1 className="text-2xl font-semibold text-stone-900">Causes</h1>
      <p className="mt-1 text-sm text-stone-500">Manage the causes/programs shown on the homepage.</p>
      <CausesManager initialCauses={causes} />
    </div>
  );
}

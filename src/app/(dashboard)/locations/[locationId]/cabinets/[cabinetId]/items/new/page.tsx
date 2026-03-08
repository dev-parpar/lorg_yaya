import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { PageHeader } from "@/components/ui/page-header";
import { ItemForm } from "@/components/items/item-form";
import { ROUTES } from "@/lib/constants";

type Props = {
  params: Promise<{ locationId: string; cabinetId: string }>;
  searchParams: Promise<{ shelfId?: string }>;
};

export default async function NewItemPage({ params, searchParams }: Props) {
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect(ROUTES.LOGIN);

  const { locationId, cabinetId } = await params;
  const { shelfId: preselectedShelfId } = await searchParams;

  const [cabinet, shelves] = await Promise.all([
    prisma.cabinet.findFirst({
      where: { id: cabinetId, deletedAt: null, location: { userId } },
      include: { location: true },
    }),
    prisma.shelf.findMany({
      where: { cabinetId, deletedAt: null },
      orderBy: { position: "asc" },
    }),
  ]);
  if (!cabinet) notFound();

  return (
    <div>
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap">
        <Link href="/locations" className="hover:text-foreground transition-colors">Locations</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/locations/${locationId}`} className="hover:text-foreground transition-colors">{cabinet.location.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/locations/${locationId}/cabinets/${cabinetId}`} className="hover:text-foreground transition-colors">{cabinet.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Add Item</span>
      </nav>
      <PageHeader title="Add Item" description={`Storing in: ${cabinet.name}`} />
      <ItemForm
        cabinetId={cabinetId}
        locationId={locationId}
        shelves={shelves}
        preselectedShelfId={preselectedShelfId}
      />
    </div>
  );
}

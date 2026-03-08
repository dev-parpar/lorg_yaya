import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { PageHeader } from "@/components/ui/page-header";
import { ItemForm } from "@/components/items/item-form";
import { ROUTES } from "@/lib/constants";

type Props = { params: Promise<{ locationId: string; cabinetId: string; itemId: string }> };

export default async function EditItemPage({ params }: Props) {
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect(ROUTES.LOGIN);

  const { locationId, cabinetId, itemId } = await params;

  const [item, shelves] = await Promise.all([
    prisma.item.findFirst({
      where: { id: itemId, deletedAt: null, cabinet: { location: { userId } } },
      include: { cabinet: { include: { location: true } } },
    }),
    prisma.shelf.findMany({
      where: { cabinetId, deletedAt: null },
      orderBy: { position: "asc" },
    }),
  ]);
  if (!item) notFound();

  return (
    <div>
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap">
        <Link href="/locations" className="hover:text-foreground transition-colors">Locations</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/locations/${locationId}`} className="hover:text-foreground transition-colors">{item.cabinet.location.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/locations/${locationId}/cabinets/${cabinetId}`} className="hover:text-foreground transition-colors">{item.cabinet.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Edit Item</span>
      </nav>
      <PageHeader title={`Edit: ${item.name}`} />
      <ItemForm cabinetId={cabinetId} locationId={locationId} shelves={shelves} existing={item} />
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Layers, Package, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ShelfCard } from "@/components/shelves/shelf-card";
import { ItemCard } from "@/components/items/item-card";
import { Separator } from "@/components/ui/separator";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locationId: string; cabinetId: string }> };

export default async function CabinetDetailPage({ params }: Props) {
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect(ROUTES.LOGIN);

  const { locationId, cabinetId } = await params;

  const cabinet = await prisma.cabinet.findFirst({
    where: { id: cabinetId, deletedAt: null, location: { userId } },
    include: { location: true },
  });
  if (!cabinet) notFound();

  const [shelves, items] = await Promise.all([
    prisma.shelf.findMany({
      where: { cabinetId, deletedAt: null },
      include: { _count: { select: { items: { where: { deletedAt: null } } } } },
      orderBy: { position: "asc" },
    }),
    prisma.item.findMany({
      where: { cabinetId, deletedAt: null },
      include: { shelf: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const unshelfedItems = items.filter((i) => i.shelfId === null);

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap">
        <Link href="/locations" className="hover:text-foreground transition-colors">Locations</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/locations/${locationId}`} className="hover:text-foreground transition-colors">
          {cabinet.location.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{cabinet.name}</span>
      </nav>

      <PageHeader
        title={cabinet.name}
        description={cabinet.description ?? undefined}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/locations/${locationId}/cabinets/${cabinetId}/edit`} className={buttonVariants({ variant: "outline" })}>
              Edit
            </Link>
            <Link href={`/locations/${locationId}/cabinets/${cabinetId}/shelves/new`} className={cn(buttonVariants({ variant: "outline" }), "flex items-center gap-2")}>
              <Plus className="h-4 w-4" />
              Shelf
            </Link>
            <Link href={`/locations/${locationId}/cabinets/${cabinetId}/items/new`} className={cn(buttonVariants(), "flex items-center gap-2")}>
              <Plus className="h-4 w-4" />
              Item
            </Link>
          </div>
        }
      />

      {/* Shelves section */}
      {shelves.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Shelves
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shelves.map((shelf) => (
              <ShelfCard
                key={shelf.id}
                shelf={shelf}
                locationId={locationId}
                cabinetId={cabinetId}
              />
            ))}
          </div>
        </section>
      )}

      {shelves.length > 0 && <Separator className="mb-8" />}

      {/* Items section */}
      <section>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Package className="h-4 w-4" />
          {shelves.length > 0 ? "Unassigned Items" : "Items"}
          <span className="text-sm font-normal text-muted-foreground">
            ({shelves.length > 0 ? unshelfedItems.length : items.length})
          </span>
        </h2>

        {items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No items yet"
            description="Add items to track what's stored in this cabinet."
          action={
            <Link href={`/locations/${locationId}/cabinets/${cabinetId}/items/new`} className={buttonVariants()}>
              Add first item
            </Link>
          }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(shelves.length > 0 ? unshelfedItems : items).map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                locationId={locationId}
                cabinetId={cabinetId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

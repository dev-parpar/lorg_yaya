import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Plus, Archive, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CabinetCard } from "@/components/cabinets/cabinet-card";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locationId: string }> };

export default async function LocationDetailPage({ params }: Props) {
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect(ROUTES.LOGIN);

  const { locationId } = await params;

  const location = await prisma.location.findFirst({
    where: { id: locationId, userId, deletedAt: null },
  });
  if (!location) notFound();

  const cabinets = await prisma.cabinet.findMany({
    where: { locationId, deletedAt: null },
    include: {
      _count: {
        select: {
          shelves: { where: { deletedAt: null } },
          items: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link href="/locations" className="hover:text-foreground transition-colors">
          Locations
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{location.name}</span>
      </nav>

      <PageHeader
        title={location.name}
        description={location.address ?? undefined}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/locations/${locationId}/edit`} className={buttonVariants({ variant: "outline" })}>
              Edit
            </Link>
            <Link href={`/locations/${locationId}/cabinets/new`} className={cn(buttonVariants(), "flex items-center gap-2")}>
              <Plus className="h-4 w-4" />
              Add cabinet
            </Link>
          </div>
        }
      />

      <div className="flex items-center gap-2 mb-6">
        <Badge variant="secondary">{location.type}</Badge>
        <span className="text-sm text-muted-foreground">
          {cabinets.length} cabinet{cabinets.length !== 1 ? "s" : ""}
        </span>
      </div>

      {cabinets.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="No cabinets yet"
          description="Add cabinets to start organising items in this location."
          action={
            <Link href={`/locations/${locationId}/cabinets/new`} className={buttonVariants()}>
              Add first cabinet
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cabinets.map((cabinet) => (
            <CabinetCard key={cabinet.id} cabinet={cabinet} locationId={locationId} />
          ))}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { Plus, Home } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LocationCard } from "@/components/locations/location-card";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect(ROUTES.LOGIN);

  const locations = await prisma.location.findMany({
    where: { userId, deletedAt: null },
    include: { _count: { select: { cabinets: { where: { deletedAt: null } } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="My Locations"
        description="Homes, offices, and anywhere else you store things"
        action={
          <Link href="/locations/new" className={cn(buttonVariants(), "flex items-center gap-2")}>
            <Plus className="h-4 w-4" />
            Add location
          </Link>
        }
      />

      {locations.length === 0 ? (
        <EmptyState
          icon={Home}
          title="No locations yet"
          description="Add your first home or office to start tracking inventory."
          action={
            <Link href="/locations/new" className={buttonVariants()}>
              Add your first location
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((location) => (
            <LocationCard key={location.id} location={location} />
          ))}
        </div>
      )}
    </div>
  );
}

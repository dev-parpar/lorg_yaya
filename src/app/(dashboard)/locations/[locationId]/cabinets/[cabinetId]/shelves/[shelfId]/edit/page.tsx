import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { PageHeader } from "@/components/ui/page-header";
import { ShelfForm } from "@/components/shelves/shelf-form";
import { ROUTES } from "@/lib/constants";

type Props = {
  params: Promise<{ locationId: string; cabinetId: string; shelfId: string }>;
};

export default async function EditShelfPage({ params }: Props) {
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect(ROUTES.LOGIN);

  const { locationId, cabinetId, shelfId } = await params;

  const shelf = await prisma.shelf.findFirst({
    where: {
      id: shelfId,
      deletedAt: null,
      cabinet: { id: cabinetId, deletedAt: null, location: { userId } },
    },
    include: { cabinet: { include: { location: true } } },
  });
  if (!shelf) notFound();

  return (
    <div>
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap">
        <Link href="/locations" className="hover:text-foreground transition-colors">
          Locations
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/locations/${locationId}`} className="hover:text-foreground transition-colors">
          {shelf.cabinet.location.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/locations/${locationId}/cabinets/${cabinetId}`}
          className="hover:text-foreground transition-colors"
        >
          {shelf.cabinet.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/locations/${locationId}/cabinets/${cabinetId}?shelf=${shelfId}`}
          className="hover:text-foreground transition-colors"
        >
          {shelf.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Edit</span>
      </nav>

      <PageHeader title={`Edit: ${shelf.name}`} />
      <ShelfForm cabinetId={cabinetId} locationId={locationId} existing={shelf} />
    </div>
  );
}

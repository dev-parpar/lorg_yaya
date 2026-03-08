import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { PageHeader } from "@/components/ui/page-header";
import { LocationForm } from "@/components/locations/location-form";
import { ROUTES } from "@/lib/constants";

type Props = { params: Promise<{ locationId: string }> };

export default async function EditLocationPage({ params }: Props) {
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect(ROUTES.LOGIN);

  const { locationId } = await params;

  const location = await prisma.location.findFirst({
    where: { id: locationId, userId, deletedAt: null },
  });
  if (!location) notFound();

  return (
    <div>
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link href="/locations" className="hover:text-foreground transition-colors">Locations</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/locations/${locationId}`} className="hover:text-foreground transition-colors">{location.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">Edit</span>
      </nav>
      <PageHeader title={`Edit: ${location.name}`} />
      <LocationForm existing={location} />
    </div>
  );
}

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { PageHeader } from "@/components/ui/page-header";
import { CabinetForm } from "@/components/cabinets/cabinet-form";
import { ROUTES } from "@/lib/constants";

type Props = { params: Promise<{ locationId: string; cabinetId: string }> };

export default async function EditCabinetPage({ params }: Props) {
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect(ROUTES.LOGIN);

  const { locationId, cabinetId } = await params;

  const cabinet = await prisma.cabinet.findFirst({
    where: { id: cabinetId, deletedAt: null, location: { userId } },
    include: { location: true },
  });
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
        <span className="text-foreground">Edit</span>
      </nav>
      <PageHeader title={`Edit: ${cabinet.name}`} />
      <CabinetForm locationId={locationId} existing={cabinet} />
    </div>
  );
}

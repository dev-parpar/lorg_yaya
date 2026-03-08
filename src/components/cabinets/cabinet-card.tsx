"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CabinetWithCounts } from "@/types";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface CabinetCardProps {
  cabinet: CabinetWithCounts;
  locationId: string;
}

export function CabinetCard({ cabinet, locationId }: CabinetCardProps) {
  const router = useRouter();

  async function handleDelete() {
    try {
      const res = await fetch(`/api/cabinets/${cabinet.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete cabinet");
      toast.success("Cabinet deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete cabinet");
    }
  }

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/locations/${locationId}/cabinets/${cabinet.id}`}
            className="flex items-start gap-3 flex-1 min-w-0"
          >
            <div className="rounded-lg bg-orange-500/10 p-2 shrink-0">
              <Archive className="h-5 w-5 text-orange-500" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{cabinet.name}</CardTitle>
              {cabinet.description && (
                <CardDescription className="line-clamp-2 mt-0.5">
                  {cabinet.description}
                </CardDescription>
              )}
            </div>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted">
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Link
                  href={`/locations/${locationId}/cabinets/${cabinet.id}/edit`}
                  className="flex items-center gap-2 w-full"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <ConfirmDialog
                trigger={(open) => (
                  <DropdownMenuItem
                    onClick={open}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                )}
                title="Delete cabinet?"
                description={`This will soft-delete "${cabinet.name}" and all its contents.`}
                onConfirm={handleDelete}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-3 mt-2 pl-11 text-xs text-muted-foreground">
          <span>{cabinet._count.shelves} shelf{cabinet._count.shelves !== 1 ? "ves" : ""}</span>
          <span>·</span>
          <span>{cabinet._count.items} item{cabinet._count.items !== 1 ? "s" : ""}</span>
        </div>
      </CardHeader>
    </Card>
  );
}

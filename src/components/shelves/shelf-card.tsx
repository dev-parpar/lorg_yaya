"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ShelfWithCounts } from "@/types";
import {
  Card,
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

interface ShelfCardProps {
  shelf: ShelfWithCounts;
  locationId: string;
  cabinetId: string;
}

export function ShelfCard({ shelf, locationId, cabinetId }: ShelfCardProps) {
  const router = useRouter();

  async function handleDelete() {
    try {
      const res = await fetch(`/api/shelves/${shelf.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete shelf");
      toast.success("Shelf deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete shelf");
    }
  }

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/locations/${locationId}/cabinets/${cabinetId}?shelf=${shelf.id}`}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <div className="rounded-lg bg-blue-500/10 p-2 shrink-0">
              <Layers className="h-4 w-4 text-blue-500" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm truncate">{shelf.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {shelf._count.items} item{shelf._count.items !== 1 ? "s" : ""} · Position {shelf.position + 1}
              </p>
            </div>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted">
              <MoreVertical className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Link
                  href={`/locations/${locationId}/cabinets/${cabinetId}/shelves/${shelf.id}/edit`}
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
                title="Delete shelf?"
                description={`Items on "${shelf.name}" will become unassigned.`}
                onConfirm={handleDelete}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Home, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { LocationWithCounts } from "@/types";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface LocationCardProps {
  location: LocationWithCounts;
}

export function LocationCard({ location }: LocationCardProps) {
  const router = useRouter();
  const Icon = location.type === "OFFICE" ? Building2 : Home;

  async function handleDelete() {
    try {
      const res = await fetch(`/api/locations/${location.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete location");
      toast.success("Location deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete location");
    }
  }

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/locations/${location.id}`}
            className="flex items-start gap-3 flex-1 min-w-0"
          >
            <div className="rounded-lg bg-primary/10 p-2 shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{location.name}</CardTitle>
              {location.address && (
                <CardDescription className="truncate mt-0.5">
                  {location.address}
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
                <Link href={`/locations/${location.id}/edit`} className="flex items-center gap-2 w-full">
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
                title="Delete location?"
                description={`This will soft-delete "${location.name}" and all its contents.`}
                onConfirm={handleDelete}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 mt-2 pl-11">
          <Badge variant="secondary" className="text-xs">
            {location.type}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {location._count.cabinets} cabinet{location._count.cabinets !== 1 ? "s" : ""}
          </span>
        </div>
      </CardHeader>
    </Card>
  );
}

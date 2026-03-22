"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Item, Shelf } from "@prisma/client";
import {
  Card,
  CardContent,
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

type ItemWithShelf = Item & { shelf: Shelf | null };

interface ItemCardProps {
  item: ItemWithShelf;
  locationId: string;
  cabinetId: string;
}

export function ItemCard({ item, locationId, cabinetId }: ItemCardProps) {
  const router = useRouter();

  async function handleDelete() {
    try {
      const res = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete item");
      toast.success("Item deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete item");
    }
  }

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {item.signedImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.signedImageUrl}
                alt={item.name}
                className="h-10 w-10 rounded-md object-cover shrink-0"
              />
            ) : (
              <div className="rounded-lg bg-muted p-2 shrink-0">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <CardTitle className="text-sm truncate">{item.name}</CardTitle>
              {item.shelf && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  On: {item.shelf.name}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted">
              <MoreVertical className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Link
                  href={`/locations/${locationId}/cabinets/${cabinetId}/items/${item.id}/edit`}
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
                title="Delete item?"
                description={`Remove "${item.name}" from inventory.`}
                onConfirm={handleDelete}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pl-14">
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {item.description}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            Qty: {item.quantity}
          </Badge>
          {item.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

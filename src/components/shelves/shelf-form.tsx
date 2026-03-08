"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Shelf } from "@prisma/client";

interface ShelfFormProps {
  cabinetId: string;
  locationId: string;
  existing?: Shelf;
}

export function ShelfForm({ cabinetId, locationId, existing }: ShelfFormProps) {
  const router = useRouter();
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name ?? "");
  const [position, setPosition] = useState(existing?.position?.toString() ?? "0");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(
        isEdit ? `/api/shelves/${existing.id}` : "/api/shelves",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cabinetId,
            name,
            position: parseInt(position, 10),
          }),
        },
      );

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Request failed");
      }

      toast.success(isEdit ? "Shelf updated" : "Shelf created");
      router.push(`/locations/${locationId}/cabinets/${cabinetId}`);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Top Shelf, Middle Row"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="position">Position (0 = top)</Label>
        <Input
          id="position"
          type="number"
          min={0}
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Update shelf" : "Create shelf"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

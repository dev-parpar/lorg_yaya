import Link from "next/link";
import { MapPin, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Item, Cabinet, Location, Shelf } from "@prisma/client";

type SearchItem = Item & {
  cabinet: Cabinet & { location: Location };
  shelf: Shelf | null;
};

interface SearchResultsProps {
  results: SearchItem[];
  query: string;
}

export function SearchResults({ results, query }: SearchResultsProps) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
      </p>
      <div className="space-y-3">
        {results.map((item) => (
          <Link
            key={item.id}
            href={`/locations/${item.cabinet.locationId}/cabinets/${item.cabinetId}`}
            className="block"
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-muted p-2 shrink-0">
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{item.name}</CardTitle>
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    Qty: {item.quantity}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0 pl-14">
                {/* Location breadcrumb */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span>{item.cabinet.location.name}</span>
                  <span>›</span>
                  <span>{item.cabinet.name}</span>
                  {item.shelf && (
                    <>
                      <span>›</span>
                      <span>{item.shelf.name}</span>
                    </>
                  )}
                </div>

                {item.tags.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBar } from "@/components/search/search-bar";
import { SearchResults } from "@/components/search/search-results";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const userId = await getAuthenticatedUserId();
  if (!userId) redirect(ROUTES.LOGIN);

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let results: Awaited<ReturnType<typeof fetchResults>> = [];

  if (query.length >= 2) {
    results = await fetchResults(query, userId);
  }

  return (
    <div>
      <PageHeader
        title="Search"
        description="Find any item across all your locations"
      />

      <div className="max-w-xl mb-8">
        <SearchBar defaultValue={query} />
      </div>

      {query.length < 2 ? (
        <EmptyState
          icon={Search}
          title="Start searching"
          description="Enter at least 2 characters to search by name, description, or tags."
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No items found"
          description={`Nothing matched "${query}". Try a different search term.`}
        />
      ) : (
        <SearchResults results={results} query={query} />
      )}
    </div>
  );
}

async function fetchResults(query: string, userId: string) {
  return prisma.item.findMany({
    where: {
      deletedAt: null,
      cabinet: { deletedAt: null, location: { userId, deletedAt: null } },
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { tags: { has: query } },
      ],
    },
    include: {
      cabinet: { include: { location: true } },
      shelf: true,
    },
    orderBy: { name: "asc" },
    take: 50,
  });
}

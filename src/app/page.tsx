import { redirect } from "next/navigation";
import { getAuthenticatedUserId } from "@/lib/auth/supabase-server";
import { ROUTES } from "@/lib/constants";

export default async function RootPage() {
  const userId = await getAuthenticatedUserId();

  if (userId) {
    redirect(ROUTES.LOCATIONS);
  } else {
    redirect(ROUTES.LOGIN);
  }
}

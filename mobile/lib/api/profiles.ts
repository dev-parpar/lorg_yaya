import { apiClient } from "./client";
import { API_BASE_URL } from "@/lib/constants";

export interface Profile {
  id: string;
  userId: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

export const profilesApi = {
  /** Check if a username is available. No auth required. */
  checkUsername: async (username: string): Promise<{ available: boolean; error?: string }> => {
    const res = await fetch(
      `${API_BASE_URL}/api/profiles/check-username?username=${encodeURIComponent(username)}`,
    );
    return res.json();
  },

  /** Get the current user's profile. */
  getMe: () => apiClient.get<Profile | null>("/api/profiles"),

  /** Create a profile for the current user. */
  create: (username: string) =>
    apiClient.post<Profile>("/api/profiles", { username }),
};

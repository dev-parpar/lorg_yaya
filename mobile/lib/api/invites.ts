import { apiClient } from "./client";
import type { Invite, LocationMember } from "@/types";

export const invitesApi = {
  /** GET /api/invites — pending invites for the current user */
  list: async (): Promise<Invite[]> => {
    const res = await apiClient.get<{ data: Invite[] }>("/api/invites");
    return res.data;
  },

  /** PATCH /api/invites/[id] — accept or decline */
  respond: async (inviteId: string, action: "accept" | "decline"): Promise<void> => {
    await apiClient.patch(`/api/invites/${inviteId}`, { action });
  },

  /** POST /api/locations/[locationId]/invites — send invite by username */
  send: async (locationId: string, username: string): Promise<LocationMember> => {
    const res = await apiClient.post<{ data: LocationMember }>(
      `/api/locations/${locationId}/invites`,
      { username },
    );
    return res.data;
  },

  /** GET /api/locations/[locationId]/invites — list members */
  getMembers: async (locationId: string): Promise<{ owner: { userId: string; username: string | null }; members: LocationMember[] }> => {
    const res = await apiClient.get<{ data: { owner: { userId: string; username: string | null }; members: LocationMember[] } }>(
      `/api/locations/${locationId}/invites`,
    );
    return res.data;
  },

  /** DELETE /api/locations/[locationId]/members/[memberId] — remove or leave */
  removeMember: async (locationId: string, memberId: string): Promise<void> => {
    await apiClient.delete(`/api/locations/${locationId}/members/${memberId}`);
  },
};

import { apiClient } from "./client";
import type { Invite, LocationMember } from "@/types";

export const invitesApi = {
  /** GET /api/invites — pending invites for the current user */
  list: (): Promise<Invite[]> =>
    apiClient.get<Invite[]>("/api/invites"),

  /** PATCH /api/invites/[id] — accept or decline */
  respond: (inviteId: string, action: "accept" | "decline"): Promise<void> =>
    apiClient.patch<void>(`/api/invites/${inviteId}`, { action }),

  /** POST /api/locations/[locationId]/invites — send invite by username */
  send: (locationId: string, username: string): Promise<LocationMember> =>
    apiClient.post<LocationMember>(`/api/locations/${locationId}/invites`, { username }),

  /** GET /api/locations/[locationId]/invites — owner + accepted members */
  getMembers: (
    locationId: string,
  ): Promise<{ owner: { userId: string; username: string | null }; members: LocationMember[] }> =>
    apiClient.get<{ owner: { userId: string; username: string | null }; members: LocationMember[] }>(
      `/api/locations/${locationId}/invites`,
    ),

  /** DELETE /api/locations/[locationId]/members/[memberId] — remove or leave */
  removeMember: (locationId: string, memberId: string): Promise<void> =>
    apiClient.delete(`/api/locations/${locationId}/members/${memberId}`),
};

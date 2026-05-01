import { apiClient } from "./client";

export interface KeyShare {
  id: string;
  locationId: string;
  recipientId: string;
  encryptedKey: string;
  nonce: string;
  createdAt: string;
  claimedAt: string | null;
}

export const keySharesApi = {
  /** Owner shares encrypted location key with a recipient */
  share: (
    locationId: string,
    data: { recipientId: string; encryptedKey: string; nonce: string },
  ) => apiClient.post<KeyShare>(`/api/locations/${locationId}/key-share`, data),

  /** Get all unclaimed key shares for the current user */
  getPending: () => apiClient.get<KeyShare[]>("/api/key-shares/pending"),

  /** Mark a key share as claimed after storing the decrypted key */
  claim: (id: string) =>
    apiClient.patch<KeyShare>(`/api/key-shares/${id}/claim`, {}),
};

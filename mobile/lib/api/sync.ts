import { apiClient } from "./client";

interface ExportOp {
  seq: number;
  deviceId: string;
  userId: string;
  timestamp: string;
  type: string;
  payload: Record<string, unknown>;
}

export interface ExportResponse {
  locationId: string;
  ops: ExportOp[];
}

export const syncApi = {
  /** Export a location's PostgreSQL data as an op log */
  exportLocation: (locationId: string) =>
    apiClient.get<ExportResponse>(`/api/sync/${locationId}/export`),
};

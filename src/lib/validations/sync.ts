import { z } from "zod";

export const syncManifestSchema = z.object({
  locationId: z.string().uuid(),
  opCount: z.number().int().min(0),
  contentHash: z.string().min(1),
  lastModified: z.string(),
  deviceSeqs: z.record(z.string(), z.number().int().min(0)),
  schemaVersion: z.number().int().min(1),
  compactedAt: z.string().nullable(),
});

export const pushBodySchema = z.object({
  oplog: z.string().min(1), // base64-encoded encrypted oplog
  manifest: syncManifestSchema,
});

export type SyncManifestInput = z.infer<typeof syncManifestSchema>;
export type PushBodyInput = z.infer<typeof pushBodySchema>;

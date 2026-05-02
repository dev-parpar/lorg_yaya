import { z } from "zod";

export const createKeyShareSchema = z.object({
  recipientId: z.string().min(1, "recipientId is required"),
  encryptedKey: z.string().min(1, "encryptedKey is required"),
  nonce: z.string().min(1, "nonce is required"),
});

export type CreateKeyShareInput = z.infer<typeof createKeyShareSchema>;

import { z } from "zod";

export const createLocationSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  type: z.enum(["HOME", "OFFICE"]),
  address: z.string().max(1000).optional(),
});

export const updateLocationSchema = createLocationSchema
  .partial()
  .extend({ imagePath: z.string().nullable().optional() });

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

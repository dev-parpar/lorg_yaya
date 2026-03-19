import { z } from "zod";

export const createShelfSchema = z.object({
  cabinetId: z.string().uuid("cabinetId must be a valid UUID"),
  name: z.string().min(1, "Name is required").max(255),
  position: z.number().int().min(0).optional(),
});

export const updateShelfSchema = createShelfSchema
  .omit({ cabinetId: true })
  .partial()
  .extend({ imagePath: z.string().nullable().optional() });

export type CreateShelfInput = z.infer<typeof createShelfSchema>;
export type UpdateShelfInput = z.infer<typeof updateShelfSchema>;

import { z } from "zod";

export const createCabinetSchema = z.object({
  locationId: z.string().uuid("locationId must be a valid UUID"),
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(1000).optional(),
});

export const updateCabinetSchema = createCabinetSchema
  .omit({ locationId: true })
  .partial()
  .extend({ imagePath: z.string().nullable().optional() });

export type CreateCabinetInput = z.infer<typeof createCabinetSchema>;
export type UpdateCabinetInput = z.infer<typeof updateCabinetSchema>;

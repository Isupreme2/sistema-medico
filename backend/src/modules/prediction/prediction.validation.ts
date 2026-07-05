import { z } from "zod";

export const getPredictionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "ID de paciente invalido"),
  }),
});

export type GetPredictionParams = z.infer<typeof getPredictionSchema>["params"];

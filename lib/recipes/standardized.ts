import { z } from "zod";

export const standardizedIngredientSchema = z.object({
  name: z.string(),
  quantity: z.number().nonnegative().nullable().optional(),
  unit: z.string().nullable().optional(),
  preparation: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  pantryCategory: z.string().nullable().optional(),
});

export const standardizedStepSchema = z.object({
  number: z.number().int().positive(),
  instruction: z.string(),
  durationMinutes: z.number().nonnegative().nullable().optional(),
  equipment: z.array(z.string()).optional(),
  ingredients: z.array(z.string()).optional(),
  tips: z.string().nullable().optional(),
});

export const standardizedRecipeSchema = z.object({
  metadata: z.object({
    title: z.string(),
    summary: z.string().nullable().optional(),
    servings: z.number().int().positive().nullable().optional(),
    prepMinutes: z.number().int().nonnegative().nullable().optional(),
    cookMinutes: z.number().int().nonnegative().nullable().optional(),
    totalMinutes: z.number().int().nonnegative().nullable().optional(),
    cuisines: z.array(z.string()).optional(),
    diets: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  }),
  ingredients: z.array(standardizedIngredientSchema).default([]),
  steps: z.array(standardizedStepSchema).default([]),
  equipment: z.array(z.string()).default([]),
  nutrition: z
    .object({
      calories: z.number().nonnegative().nullable().optional(),
      fatGrams: z.number().nonnegative().nullable().optional(),
      carbsGrams: z.number().nonnegative().nullable().optional(),
      proteinGrams: z.number().nonnegative().nullable().optional(),
    })
    .partial()
    .optional(),
  notes: z.array(z.string()).default([]),
  source: z
    .object({
      id: z.union([z.string(), z.number()]).optional(),
      url: z.string().url().optional(),
      provider: z.string().optional(),
    })
    .optional(),
  model: z
    .object({
      name: z.string(),
      temperature: z.number().optional(),
      promptVersion: z.string().optional(),
    })
    .optional(),
});

export type StandardizedIngredient = z.infer<typeof standardizedIngredientSchema>;
export type StandardizedStep = z.infer<typeof standardizedStepSchema>;
export type StandardizedRecipeDetails = z.infer<typeof standardizedRecipeSchema>;

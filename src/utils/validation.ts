// src/utils/validation.ts
import { z } from "zod";

export const ActionDeviceSchema = z.object({
  type: z.literal("device"),
  device_id: z.string().uuid().or(z.string().nullable()), // may be null if AI couldn't map
  command: z.record(z.any()), // flexible command payload
  topic: z.string().optional(), // optional custom MQTT topic
});

export const TriggerSchema = z.union([
  z.object({ type: z.literal("time"), cron: z.string() }), // cron-like
  z.object({
    type: z.literal("device"),
    device_id: z.string().uuid(),
    event: z.string(), // e.g. "motion.detected", "power.changed"
    conditions: z.record(z.any()).optional(),
  }),
  z.object({ type: z.literal("nlu"), phrase: z.string() }), // natural language trigger
]);

export const AutomationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string(),
  estate_id: z.string().uuid().optional(),
  created_by: z.string().uuid().optional(),
  enabled: z.boolean().optional().default(true),
  trigger: TriggerSchema,
  action: ActionDeviceSchema,
  metadata: z.record(z.any()).optional(),
  ai_generated: z.boolean().optional().default(false),
  created_at: z.string().optional(),
});

export const AutomationInputSchema = AutomationSchema.omit({ id: true }).partial({ created_at: true });

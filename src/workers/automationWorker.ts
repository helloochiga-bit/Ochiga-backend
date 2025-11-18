// src/workers/automationWorker.ts
import { Worker, Queue, Job } from "bullmq";
import IORedis from "ioredis";
import { supabaseAdmin } from "../supabase/client";
import { publishDeviceAction } from "../device/bridge";

// Redis connection for BullMQ
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");

// Queue to enqueue automations
export const automationQueue = new Queue("automations", { connection });

/**
 * Enqueue a new automation job
 */
export async function enqueueAutomation(automationId: string) {
  await automationQueue.add(
    "run_automation",
    { automationId },
    { removeOnComplete: true, removeOnFail: true }
  );
}

/**
 * Start the automation worker
 */
export async function startWorkers() {
  const worker = new Worker(
    "automations",
    async (job: Job) => {
      const { automationId } = job.data;

      // fetch automation from Supabase
      const { data: automation, error } = await supabaseAdmin
        .from("automations")
        .select("*")
        .eq("id", automationId)
        .single();

      if (error || !automation) throw new Error("Automation not found");

      // only support device actions for now
      if (automation.action?.type === "device") {
        const { device_id, command, topic } = automation.action;
        const deviceTopic =
          topic || `ochiga/estate/${automation.estate_id}/device/${device_id}/set`;

        // Publish action to device via MQTT
        publishDeviceAction(deviceTopic, command);

        // log event in Supabase
        await supabaseAdmin.from("device_events").insert([
          {
            device_id,
            user_id: automation.created_by,
            action: "automation_run",
            params: command,
          },
        ]);
      } else {
        console.warn("Unsupported automation action type", automation.action?.type);
      }
    },
    { connection }
  );

  worker.on("completed", (job) => {
    console.log("Automation job completed:", job.id);
  });

  worker.on("failed", (job, err) => {
    console.error("Automation job failed:", job?.id, err);
  });

  return worker;
}

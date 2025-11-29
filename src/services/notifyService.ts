// src/services/notifyService.ts
// Minimal stub: you already have notifications util. This will call existing logic (email/whatsapp/share)
import { supabaseAdmin } from "../supabase/client";

export async function sendVisitorLinkNotification({ residentId, phone, link, code, visitorName }: { residentId: string, phone?: string, link: string, code: string, visitorName: string }) {
  try {
    // create notification in notifications table
    await supabaseAdmin.from("notifications").insert([{
      user_id: residentId,
      title: "Visitor pass created",
      message: `Visitor ${visitorName} - Code: ${code}. Share this link: ${link}`,
      type: "visitor_pass",
      payload: { link, code }
    }]);
  } catch (err) {
    console.warn("sendVisitorLinkNotification error", err);
  }
}

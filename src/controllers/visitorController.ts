// src/controllers/visitorController.ts
import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase/supabaseClient";
import { generateAccessCode } from "../services/codeService";
import { createQrForLink } from "../services/qrService";
import { notifyUser, NotificationPayload } from "../services/notificationService";

const DEFAULT_EXPIRES_HOURS = Number(process.env.VISITOR_DEFAULT_EXPIRES_HOURS || 12);
const VISITOR_LINK_BASE = process.env.VISITOR_LINK_BASE || "";

/* ---------------------------------------------------------
 * CREATE VISITOR
 * --------------------------------------------------------- */
export async function createVisitor(req: Request, res: Response) {
  try {
    const authed = req as any;
    const residentId = authed.user?.id;

    const { estateId, visitorName, visitorPhone, purpose, houseId, navigationMode } = req.body;
    if (!estateId || !visitorName)
      return res.status(400).json({ error: "estateId and visitorName required" });

    const accessCode = await generateAccessCode();
    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRES_HOURS * 3600 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from("visitor_access")
      .insert([{
        estate_id: estateId,
        resident_id: residentId,
        visitor_name: visitorName,
        visitor_phone: visitorPhone || null,
        purpose: purpose || null,
        house_id: houseId || null,
        access_code: accessCode,
        navigation_mode: navigationMode || "mapbox",
        status: "pending",
        expires_at: expiresAt
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const visitorId = data.id;
    const link = `${VISITOR_LINK_BASE}/${visitorId}`;

    const qrS3Url = await createQrForLink(link, visitorId);
    await supabaseAdmin.from("visitor_access").update({ qr_s3_url: qrS3Url }).eq("id", visitorId);

    const payload: NotificationPayload = {
      type: "visitor",
      entityId: visitorId,
      message: `New visitor "${visitorName}" created for your estate`,
      data: { link, accessCode, visitorName }
    };
    await notifyUser(residentId, payload);

    return res.json({
      id: visitorId,
      link,
      code: accessCode,
      qr: qrS3Url,
      status: "pending",
      expiresAt
    });

  } catch (err: any) {
    console.error("createVisitor error", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

/* ---------------------------------------------------------
 * APPROVE VISITOR
 * --------------------------------------------------------- */
export async function approveVisitor(req: Request, res: Response) {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "id required" });

    const { data, error } = await supabaseAdmin
      .from("visitor_access")
      .update({
        status: "approved",
        verified_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const payload: NotificationPayload = {
      type: "visitor",
      entityId: id,
      message: `Visitor "${data.visitor_name}" approved.`,
      data: { visitorId: id, visitorName: data.visitor_name }
    };
    await notifyUser(data.resident_id, payload);

    return res.json({ ok: true, visitor: data });

  } catch (err: any) {
    console.error("approveVisitor", err);
    return res.status(500).json({ error: err.message });
  }
}

/* ---------------------------------------------------------
 * MARK ENTRY
 * --------------------------------------------------------- */
export async function markEntry(req: Request, res: Response) {
  try {
    const id = req.params.id;

    const { data: va } = await supabaseAdmin
      .from("visitor_access")
      .select("*")
      .eq("id", id)
      .single();

    if (!va) return res.status(404).json({ error: "not found" });

    const arrivedAt = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("visitor_analytics")
      .insert([{
        visitor_access_id: id,
        estate_id: va.estate_id,
        arrived_at: arrivedAt,
        created_at: arrivedAt
      }])
      .select()
      .single();

    await supabaseAdmin.from("visitor_access").update({ status: "entered" }).eq("id", id);

    const payload: NotificationPayload = {
      type: "visitor",
      entityId: id,
      message: `Visitor "${va.visitor_name}" has entered the estate.`,
      data: { visitorId: id, arrivedAt }
    };
    await notifyUser(va.resident_id, payload);

    return res.json({ ok: true, analytics: data });

  } catch (err: any) {
    console.error("markEntry", err);
    return res.status(500).json({ error: err.message });
  }
}

/* ---------------------------------------------------------
 * MARK EXIT
 * --------------------------------------------------------- */
export async function markExit(req: Request, res: Response) {
  try {
    const id = req.params.id;

    const { data: analytics } = await supabaseAdmin
      .from("visitor_analytics")
      .select("*")
      .eq("visitor_access_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!analytics) return res.status(404).json({ error: "analytics not found" });

    const exitedAt = new Date().toISOString();
    const durationMinutes = Math.round(
      (new Date(exitedAt).getTime() - new Date(analytics.arrived_at).getTime()) / 60000
    );

    await supabaseAdmin
      .from("visitor_analytics")
      .update({ exited_at: exitedAt, duration_minutes: durationMinutes })
      .eq("id", analytics.id);

    await supabaseAdmin.from("visitor_access").update({ status: "exited" }).eq("id", id);

    const { data: va } = await supabaseAdmin
      .from("visitor_access")
      .select("*")
      .eq("id", id)
      .single();

    const payload: NotificationPayload = {
      type: "visitor",
      entityId: id,
      message: `Visitor "${va.visitor_name}" has exited the estate.`,
      data: { visitorId: id, exitedAt, durationMinutes }
    };
    await notifyUser(va.resident_id, payload);

    return res.json({ ok: true, durationMinutes });

  } catch (err: any) {
    console.error("markExit", err);
    return res.status(500).json({ error: err.message });
  }
}

/* ---------------------------------------------------------
 * GET ANALYTICS FOR ESTATE
 * --------------------------------------------------------- */
export async function getAnalyticsForEstate(req: Request, res: Response) {
  try {
    const estateId = req.params.estateId;
    if (!estateId) return res.status(400).json({ error: "estateId required" });

    // Get all visitor analytics for the estate
    const { data: analytics, error } = await supabaseAdmin
      .from("visitor_analytics")
      .select("*")
      .eq("estate_id", estateId);

    if (error) return res.status(500).json({ error: error.message });

    // Compute summaries
    const totalVisitors = analytics.length;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const todayVisitors = analytics.filter(a =>
      a.arrived_at?.slice(0, 10) === todayStr
    ).length;

    const exitedVisitors = analytics.filter(a => a.exited_at != null).length;

    return res.json({
      estateId,
      totalVisitors,
      todayVisitors,
      exitedVisitors,
      records: analytics
    });

  } catch (err: any) {
    console.error("getAnalyticsForEstate", err);
    return res.status(500).json({ error: err.message });
  }
}

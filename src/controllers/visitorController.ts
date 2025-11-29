// src/controllers/visitorController.ts

import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase/supabaseClient";
import { generateAccessCode } from "../services/codeService";
import { createQrForLink } from "../services/qrService";
import { sendVisitorLinkNotification } from "../services/notifyService";
import { parseISO } from "date-fns";

const DEFAULT_EXPIRES_HOURS = Number(process.env.VISITOR_DEFAULT_EXPIRES_HOURS || 12);
const VISITOR_LINK_BASE = process.env.VISITOR_LINK_BASE || "";

export async function createVisitor(req: Request, res: Response) {
  try {
    const authed = req as any;
    const residentId = authed.user?.id;

    const { estateId, visitorName, visitorPhone, purpose, houseId, vehiclePlate, navigationMode } = req.body;
    if (!estateId || !visitorName) return res.status(400).json({ error: "estateId and visitorName required" });

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
        vehicle_plate: vehiclePlate || null,
        access_code: accessCode,
        house_id: houseId || null,
        navigation_mode: navigationMode || "mapbox",
        expires_at: expiresAt
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const visitorId = data.id;
    const link = `${VISITOR_LINK_BASE}/${visitorId}`;

    // FIXED: createQrForLink now accepts 2 args
    const qrS3Url = await createQrForLink(link, visitorId);

    await supabaseAdmin.from("visitor_access").update({ qr_s3_url: qrS3Url }).eq("id", visitorId);

    try {
      await sendVisitorLinkNotification({
        residentId,
        phone: visitorPhone,
        link,
        code: accessCode,
        visitorName
      });
    } catch (err) {
      console.warn("notify failed:", err);
    }

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

export async function getVisitorInfo(req: Request, res: Response) {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "id required" });

    const { data, error } = await supabaseAdmin
      .from("visitor_access")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return res.status(404).json({ error: "Visitor not found" });

    if (data.status === "approved") {
      const { data: mapMeta } = await supabaseAdmin
        .from("estate_maps")
        .select("*")
        .eq("estate_id", data.estate_id)
        .limit(1)
        .single();

      return res.json({
        status: "approved",
        visitor: data,
        map: mapMeta || null,
      });
    }

    return res.json({
      status: data.status,
      visitor: {
        id: data.id,
        visitor_name: data.visitor_name,
        expires_at: data.expires_at,
      },
      rules: [
        "Visitors must not loiter",
        "Follow estate rules",
        "Have ID ready for guard check"
      ]
    });

  } catch (err: any) {
    console.error("getVisitorInfo error", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

export async function verifyVisitor(req: Request, res: Response) {
  try {
    const { type, value } = req.body;
    if (!type || !value) return res.status(400).json({ error: "type and value required" });

    if (type === "code") {
      const { data, error } = await supabaseAdmin
        .from("visitor_access")
        .select("*")
        .eq("access_code", value)
        .in("status", ["pending", "approved"])
        .single();

      if (error || !data) return res.status(404).json({ error: "Code not found or expired" });
      return res.json({ matched: true, visitor: data });
    }

    if (type === "qr") {
      const visitorId = value.includes("/") ? value.split("/").pop() : value;
      const { data, error } = await supabaseAdmin
        .from("visitor_access")
        .select("*")
        .eq("id", visitorId)
        .single();

      if (error || !data) return res.status(404).json({ error: "QR not found" });
      return res.json({ matched: true, visitor: data });
    }

    return res.status(400).json({ error: "invalid type" });

  } catch (err: any) {
    console.error("verifyVisitor", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}

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

    return res.json({ ok: true, visitor: data });

  } catch (err: any) {
    console.error("approveVisitor", err);
    return res.status(500).json({ error: err.message });
  }
}

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

    return res.json({ ok: true, analytics: data });

  } catch (err: any) {
    console.error("markEntry", err);
    return res.status(500).json({ error: err.message });
  }
}

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

    return res.json({ ok: true, durationMinutes });

  } catch (err: any) {
    console.error("markExit", err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getAnalyticsForEstate(req: Request, res: Response) {
  try {
    const estateId = req.params.estateId;

    const { data, error } = await supabaseAdmin
      .from("visitor_analytics")
      .select("*")
      .eq("estate_id", estateId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return res.status(500).json({ error: error.message });

    return res.json(data);

  } catch (err: any) {
    console.error("getAnalyticsForEstate", err);
    return res.status(500).json({ error: err.message });
  }
}

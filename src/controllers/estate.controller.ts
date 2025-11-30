import { Request, Response } from "express";
import { supabaseAdmin as supabase } from "../supabase/supabaseClient";

// Type-safe home payload
export interface HomePayload {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  estate_id?: string;
  owner_id?: string;
  [key: string]: any;
}

// Create Home
export const createHome = async (req: Request, res: Response) => {
  try {
    const { name, estate_id, owner_id, latitude, longitude } = req.body;

    if (!name || !estate_id) {
      return res.status(400).json({ message: "name and estate_id are required" });
    }

    const payload: HomePayload = {
      name,
      estate_id,
      owner_id: owner_id || null,
      latitude: latitude || null,
      longitude: longitude || null,
    };

    const { data, error } = await supabase
      .from("homes")
      .insert([payload])
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        message: "Failed to create home",
        error: error.message,
      });
    }

    return res.status(201).json({
      message: "Home created successfully",
      data,
    });
  } catch (err: any) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// Get all homes in an estate
export const getHomesByEstate = async (req: Request, res: Response) => {
  try {
    const { estateId } = req.params;

    const { data, error } = await supabase
      .from("homes")
      .select("*")
      .eq("estate_id", estateId);

    if (error) return res.status(400).json({ message: error.message });

    return res.status(200).json({
      message: "Homes fetched successfully",
      data,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Get home by ID
export const getHome = async (req: Request, res: Response) => {
  try {
    const { homeId } = req.params;

    const { data, error } = await supabase
      .from("homes")
      .select("*")
      .eq("id", homeId)
      .single();

    if (error) return res.status(404).json({ message: "Home not found" });

    return res.status(200).json({
      message: "Home retrieved successfully",
      data,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Update home
export const updateHome = async (req: Request, res: Response) => {
  try {
    const { homeId } = req.params;
    const updates: Partial<HomePayload> = req.body;

    const { data, error } = await supabase
      .from("homes")
      .update(updates)
      .eq("id", homeId)
      .select()
      .single();

    if (error)
      return res.status(400).json({ message: "Failed to update home", error: error.message });

    return res.status(200).json({
      message: "Home updated successfully",
      data,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// Delete home
export const deleteHome = async (req: Request, res: Response) => {
  try {
    const { homeId } = req.params;

    const { error } = await supabase.from("homes").delete().eq("id", homeId);

    if (error)
      return res.status(400).json({ message: "Failed to delete home", error: error.message });

    return res.status(200).json({ message: "Home deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

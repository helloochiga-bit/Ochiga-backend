import { Request, Response } from "express";
import { supabaseAdmin as supabase } from "../supabase/client";

// Type-safe home payload
export interface HomePayload {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  estateId?: string;
  ownerId?: string;
  [key: string]: any; // allow extra fields
}

// Create Home
export const createHome = async (req: Request, res: Response) => {
  try {
    const form: HomePayload = req.body;

    if (!form || !form.name) {
      return res.status(400).json({
        message: "Home name is required",
        received: form,
      });
    }

    const { data, error } = await supabase
      .from("homes")
      .insert([form])
      .select();

    if (error) {
      return res.status(400).json({
        message: "Failed to create home",
        error: error.message,
      });
    }

    return res.status(201).json({
      message: "Home created successfully",
      data: data?.[0],
    });
  } catch (err: any) {
    return res.status(500).json({
      message: "Server error",
      error: err?.message ?? "Unknown error",
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
      .eq("estateId", estateId);

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(200).json({
      message: "Homes fetched successfully",
      data,
    });
  } catch (err: any) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
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

    if (error) {
      return res.status(404).json({ message: "Home not found" });
    }

    return res.status(200).json({
      message: "Home retrieved successfully",
      data,
    });
  } catch (err: any) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
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

    if (error) {
      return res.status(400).json({
        message: "Failed to update home",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Home updated successfully",
      data,
    });
  } catch (err: any) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

// Delete home
export const deleteHome = async (req: Request, res: Response) => {
  try {
    const { homeId } = req.params;

    const { error } = await supabase
      .from("homes")
      .delete()
      .eq("id", homeId);

    if (error) {
      return res.status(400).json({
        message: "Failed to delete home",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Home deleted successfully",
    });
  } catch (err: any) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

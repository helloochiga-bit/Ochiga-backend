import { Request, Response } from "express";
import { AppDataSource } from "../config/data-source";
import { Device } from "../entities/Device";
import { io } from "../server";
import { calculateDistance } from "../utils/geoMath";

export async function updateDeviceLocation(req: Request, res: Response) {
  try {
    const { deviceId } = req.params;
    const { lat, lng, installationPoint } = req.body;

    const repo = AppDataSource.getRepository(Device);
    const device = await repo.findOne({ where: { id: deviceId } });

    if (!device) return res.status(404).json({ error: "Device not found" });

    device.latitude = lat;
    device.longitude = lng;
    device.installationPoint = installationPoint || device.installationPoint;
    device.lastLocationUpdate = new Date();

    await repo.save(device);

    // ★ REALTIME MAP UPDATES ★
    io.emit("device:location:update", {
      id: deviceId,
      lat,
      lng,
      installationPoint,
    });

    return res.json({
      message: "Device location updated",
      device,
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getDevicesNearPoint(req: Request, res: Response) {
  try {
    const { lat, lng, radius = 100 } = req.query; // radius = meters

    const deviceRepo = AppDataSource.getRepository(Device);
    const devices = await deviceRepo.find();

    const filtered = devices
      .filter((d) => d.latitude && d.longitude)
      .map((d) => ({
        ...d,
        distance: calculateDistance(
          Number(lat),
          Number(lng),
          d.latitude!,
          d.longitude!
        ),
      }))
      .filter((d) => d.distance <= Number(radius));

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
}

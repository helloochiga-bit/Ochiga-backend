// src/utils/geocode.ts
import axios from "axios";

export async function reverseGeocode(lat: number, lng: number) {
  try {
    const res = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: {
        format: "json",
        lat,
        lon: lng,
        zoom: 18,
        addressdetails: 1,
      },
      headers: {
        "User-Agent": "Ochiga-Backend/1.0 (+https://your-domain.com)",
      },
      timeout: 5000,
    });

    if (res.data && res.data.display_name) return res.data.display_name;
    return null;
  } catch (err: any) {
    console.warn("reverseGeocode error", err?.message || err);
    return null;
  }
}

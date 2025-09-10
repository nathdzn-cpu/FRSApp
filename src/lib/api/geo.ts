import { callFn } from '../callFunction';

export const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  try {
    const { location } = await callFn<{ location: string }>('reverse-geocode', { lat, lon });
    return location;
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    return "Unknown location";
  }
};
import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const APISH_BASE = "https://api.api.sh";
const LOCATIONS = {
  Toscane: { lat: 43.35, lng: 11.25, query: "Tuscany, Italy", sub: "Siena · Chianti · Val d'Orcia" },
  Amalfi: { lat: 40.635, lng: 14.602, query: "Amalfi Coast, Italy", sub: "Amalfi · Ravello · Positano · Sorrento" },
  Puglia: { lat: 40.725, lng: 17.58, query: "Puglia, Italy", sub: "Ostuni · Alberobello · Monopoli · Lecce" },
  Rome: { lat: 41.9028, lng: 12.4964, query: "Rome, Italy", sub: "Rome · Trastevere · Centro Storico" },
  "Lake Como": { lat: 45.98, lng: 9.26, query: "Lake Como, Italy", sub: "Como · Bellagio · Varenna" },
  "Lake Garda": { lat: 45.62, lng: 10.68, query: "Lake Garda, Italy", sub: "Sirmione · Garda · Malcesine" },
  Sicily: { lat: 37.5, lng: 14.0, query: "Sicily, Italy", sub: "Taormina · Noto · Ortigia · Syracuse" },
  "Umbria": { lat: 42.95, lng: 12.55, query: "Umbria, Italy", sub: "Assisi · Montefalco · Orvieto" }
};
const areaNames = Object.keys(LOCATIONS);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function apiReady() { return Boolean(process.env.APISH_KEY); }
function apiHeaders() { return { "x-api-key": process.env.APISH_KEY, Accept: "application/json" }; }
function validDate(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")); }

app.get("/api/health", (req, res) => res.json({ ok: true, apiConfigured: apiReady(), provider: "API.SH" }));
app.get("/api/locations", (req, res) => res.json(LOCATIONS));

app.get("/api/accommodations", async (req, res) => {
  const location = areaNames.includes(req.query.location) ? req.query.location : "Toscane";
  const info = LOCATIONS[location];
  const checkin = validDate(req.query.checkin) ? String(req.query.checkin) : "2027-06-12";
  const checkout = validDate(req.query.checkout) ? String(req.query.checkout) : "2027-06-15";
  const adults = clamp(Number(req.query.adults || 2), 1, 14);
  const sort = ["relevance", "price", "price_desc", "rating", "distance", "stars"].includes(String(req.query.sort)) ? String(req.query.sort) : "rating";
  if (!apiReady()) return res.status(503).json({ error: "API.SH is not configured. Add APISH_KEY to .env.", results: [] });

  const params = new URLSearchParams({
    q: info.query,
    checkin,
    checkout,
    adults: String(adults),
    rooms: "1",
    currency: "EUR",
    sort,
    limit: "18",
    offset: "0"
  });
  try {
    const r = await fetch(`${APISH_BASE}/booking/v1/search?${params}`, { headers: apiHeaders(), signal: AbortSignal.timeout(30000) });
    const text = await r.text();
    if (!r.ok) return res.status(r.status).json({ error: `API.SH returned ${r.status}`, detail: text.slice(0, 500) });
    const json = JSON.parse(text);
    const results = (json.hotels || []).map(x => {
      const facilities = Array.isArray(x.facilities) ? x.facilities : [];
      return {
        id: String(x.id),
        name: x.name || "Accommodatie",
        address: x.address || x.city || location,
        area: x.district || x.city || location,
        lat: Number(x.latitude) || info.lat,
        lng: Number(x.longitude) || info.lng,
        price: Number(x.price_amount) || null,
        currency: x.currency || "EUR",
        rating: Number(x.review_score || x.rating) || null,
        reviewCount: Number(x.review_count || x.review_count_total) || 0,
        stars: Number(x.stars) || 0,
        amenities: facilities.slice(0, 10),
        image: x.image || x.images?.[0]?.url || null,
        bookingUrl: x.url || null,
        available: x.sold_out !== true,
        freeCancellation: Boolean(x.free_cancellation),
        sustainable: Boolean(x.sustainable),
        priceLabel: x.price || null,
        secondaryScore: Number(x.secondary_score) || null,
        description: x.description || ""
      };
    });
    res.json({ location, count: results.length, results, source: "API.SH → Booking.com public data", creditsUsed: json.credits_used || null, nextOffset: json.next_offset ?? null });
  } catch (e) {
    res.status(502).json({ error: "Accommodation provider unavailable", detail: e.message });
  }
});

app.get("/api/accommodation/:id", async (req, res) => {
  res.status(501).json({ error: "Use the booking URL from the search result for the live property page." });
});

app.post("/api/route", async (req, res) => {
  const stops = Array.isArray(req.body?.stops) ? req.body.stops : [];
  if (stops.length < 2) return res.json({ distanceKm: 0, durationText: "—", geometry: [], legs: [] });
  const coords = stops.map(s => `${Number(s.lng)},${Number(s.lat)}`).join(";");
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`);
    if (!r.ok) throw new Error("Routing service error");
    const j = await r.json(); const route = j.routes?.[0];
    if (!route) throw new Error("No route");
    const minutes = Math.round(route.duration / 60), h = Math.floor(minutes / 60), m = minutes % 60;
    const legs = (route.legs || []).map(leg => ({ distanceKm: Math.round(leg.distance / 1000), minutes: Math.round(leg.duration / 60) }));
    res.json({ distanceKm: Math.round(route.distance / 1000), durationText: h ? `${h}u ${m}min` : `${m} min`, geometry: route.geometry.coordinates, legs });
  } catch (e) { res.status(502).json({ error: "Route service unavailable", detail: e.message }); }
});

app.get("/{*splat}", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.listen(PORT, () => console.log(`Honeymoon Atlas running on http://localhost:${PORT}`));

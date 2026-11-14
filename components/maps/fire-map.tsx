"use client";
import type * as GeoJSON from "geojson";
import { useEffect, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource, type Map as GLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { spatial, gridKey } from "@/lib/harmonization";
import type { Fire, Bounds } from "@/types/fire";
import type { PlatformDictionary } from "@/lib/i18n/platform";
type Props = {
  records: Fire[];
  bounds: Bounds;
  visible: boolean;
  grid: number;
  aggregated: boolean;
  onSelect: (r: Fire) => void;
  onExtent?: (b: Bounds) => void;
  t: PlatformDictionary;
  compare?: boolean;
};
export default function FireMap(p: Props) {
  const containers = useRef<(HTMLDivElement | null)[]>([]),
    maps = useRef<GLMap[]>([]),
    latest = useRef(p);
  latest.current = p;
  const [error, setError] = useState(false);
  useEffect(() => {
    let syncing = false;
    const instances = (p.compare ? [0, 1] : [0]).map((i) => {
      const map = new maplibregl.Map({
        container: containers.current[i]!,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [
            {
              id: "basemap",
              type: "raster",
              source: "osm",
              paint: {
                "raster-saturation": -0.9,
                "raster-brightness-max": 0.48,
              },
            },
          ],
        },
        bounds: [
          [p.bounds[0], p.bounds[1]],
          [p.bounds[2], p.bounds[3]],
        ],
        fitBoundsOptions: { padding: 24 },
        maxZoom: 16,
      });
      map.addControl(
        new maplibregl.NavigationControl({ visualizePitch: false }),
        "top-right",
      );
      map.on("error", () => setError(true));
      map.on("load", () => {
        map.addSource("fires", {
          type: "geojson",
          data: geo(latest.current, i),
          cluster: true,
          clusterMaxZoom: 7,
          clusterRadius: 35,
        });
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "fires",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#a85530",
            "circle-radius": [
              "step",
              ["get", "point_count"],
              13,
              100,
              19,
              1000,
              25,
            ],
            "circle-opacity": 0.8,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#edb384",
          },
        });
        map.addLayer({
          id: "points",
          type: "circle",
          source: "fires",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "#e08a4b",
            "circle-radius": 4,
            "circle-opacity": 0.85,
            "circle-stroke-color": "#30211a",
            "circle-stroke-width": 1,
          },
        });
        map.on("click", "points", (e) => {
          const id = e.features?.[0]?.properties?.id;
          const r = latest.current.records.find((r) => r.id === id);
          if (r) latest.current.onSelect(r);
        });
        map.on("click", "clusters", async (e) => {
          const f = e.features?.[0];
          if (!f || f.geometry.type !== "Point") return;
          const zoom = await (
            map.getSource("fires") as GeoJSONSource
          ).getClusterExpansionZoom(Number(f.properties?.cluster_id));
          map.easeTo({
            center: f.geometry.coordinates as [number, number],
            zoom,
          });
        });
        for (const layer of ["points", "clusters"]) {
          map.on("mouseenter", layer, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", layer, () => {
            map.getCanvas().style.cursor = "";
          });
        }
      });
      map.on("move", () => {
        if (syncing) return;
        syncing = true;
        for (const other of maps.current)
          if (other !== map)
            other.jumpTo({
              center: map.getCenter(),
              zoom: map.getZoom(),
              bearing: map.getBearing(),
              pitch: map.getPitch(),
            });
        syncing = false;
      });
      return map;
    });
    maps.current = instances;
    return () => {
      instances.forEach((m) => m.remove());
      maps.current = [];
    };
    // Maps persist across visual/filter updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.compare]);
  useEffect(() => {
    maps.current.forEach((m, i) => {
      const update = () => {
        const src = m.getSource("fires") as GeoJSONSource | undefined;
        src?.setData(geo(p, i));
        for (const id of ["points", "clusters"])
          if (m.getLayer(id))
            m.setLayoutProperty(
              id,
              "visibility",
              p.visible ? "visible" : "none",
            );
      };
      if (m.isStyleLoaded()) update();
      else m.once("load", update);
    });
  }, [p.records, p.visible, p.grid, p.aggregated]);
  useEffect(() => {
    maps.current.forEach((m) =>
      m.fitBounds(
        [
          [p.bounds[0], p.bounds[1]],
          [p.bounds[2], p.bounds[3]],
        ],
        { padding: 24, duration: 400 },
      ),
    );
  }, [p.bounds]);
  function extent() {
    const b = maps.current[0]?.getBounds();
    if (b)
      p.onExtent?.([
        Math.max(-180, b.getWest()),
        Math.max(-90, b.getSouth()),
        Math.min(180, b.getEast()),
        Math.min(90, b.getNorth()),
      ]);
  }
  return (
    <section aria-label={p.t.map} className="map-panel">
      {error && (
        <p role="status" className="status">
          {p.t.mapError}
        </p>
      )}
      <div className={p.compare ? "map-pair" : ""}>
        {(p.compare ? [0, 1] : [0]).map((i) => (
          <div key={i} className="map-wrap">
            {p.compare && (
              <span className="map-label" dir="ltr">
                {i === 0 ? "MODIS" : "VIIRS"}
              </span>
            )}
            <div
              ref={(el) => {
                containers.current[i] = el;
              }}
              className="fire-map"
            />
          </div>
        ))}
      </div>
      {p.onExtent && (
        <button type="button" onClick={extent} className="extent-button">
          {p.t.extent}
        </button>
      )}
    </section>
  );
}
function geo(p: Props, index: number): GeoJSON.FeatureCollection {
  const records = p.records.filter(
    (r) =>
      !p.compare ||
      (index === 0 ? r.instrument === "MODIS" : r.instrument === "VIIRS"),
  );
  if (!p.aggregated)
    return {
      type: "FeatureCollection",
      features: records.map((r) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [r.longitude, r.latitude] },
        properties: { id: r.id },
      })),
    };
  const representative = new Map<string, Fire>();
  for (const r of records) {
    const key = gridKey(r, p.grid);
    if (!representative.has(key)) representative.set(key, r);
  }
  return {
    type: "FeatureCollection",
    features: spatial(records, p.grid).map((c) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [c.longitude, c.latitude] },
      properties: { id: representative.get(c.cell)!.id, count: c.count },
    })),
  };
}

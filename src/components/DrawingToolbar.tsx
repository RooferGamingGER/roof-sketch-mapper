// src/components/DrawTools.tsx
import { useEffect } from "react";
import L from "leaflet";
import "leaflet-draw";
import "leaflet-geometryutil";

interface DrawToolsProps {
  map: L.Map | null;
}

export const DrawTools = ({ map }: DrawToolsProps) => {
  useEffect(() => {
    if (!map) {
      console.warn("🛑 DrawTools skipped: map is null");
      return;
    }

    const tryEnableDrawTools = () => {
      if (!map._controlCorners) {
        console.warn("⏳ map._controlCorners not ready, retrying...");
        setTimeout(tryEnableDrawTools, 200);
        return;
      }

      console.log("✅ Enabling DrawTools");

      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);

      const drawControl = new L.Control.Draw({
        position: "topright",
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: {
              color: "#f97316", // tailwind orange-500
              weight: 3,
            },
            title: "Dachfläche messen",
          },
          marker: false,
          polyline: false,
          rectangle: false,
          circle: false,
          circlemarker: false,
        },
        edit: {
          featureGroup: drawnItems,
          remove: true,
        },
      });

      try {
        map.addControl(drawControl);
        console.log("✅ Draw control added");
      } catch (error) {
        console.error("❌ Failed to add drawControl:", error);
      }

      map.on(L.Draw.Event.CREATED, (e: L.DrawEvents.Created) => {
        const layer = e.layer;
        drawnItems.addLayer(layer);

        if ("getLatLngs" in layer) {
          const latlngs = (layer as L.Polygon).getLatLngs()[0] as L.LatLng[];
          const area = L.GeometryUtil.geodesicArea(latlngs);
          const readable = `${(area / 1_000_000).toLocaleString("de-DE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} m²`;

          const center = (layer as L.Polygon).getBounds().getCenter();
          const label = L.marker(center, {
            icon: L.divIcon({
              className: "area-label",
              html: `<strong>${readable}</strong>`,
            }),
          });

          map.addLayer(label);
        }
      });

      // Cleanup
      return () => {
        console.log("🧹 Cleaning up DrawTools");
        map.removeLayer(drawnItems);
        map.removeControl(drawControl);
      };
    };

    // Call once map is fully ready
    setTimeout(tryEnableDrawTools, 100);
  }, [map]);

  return null;
};

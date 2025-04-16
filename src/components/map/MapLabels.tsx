
import { useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import { generateLengthLabels } from '@/utils/mapUtils';
import { Position } from 'geojson';
import { DrawingRef } from '@/hooks/useMapDrawing';

interface MapLabelsProps {
  drawRef: React.MutableRefObject<DrawingRef>;
  map: mapboxgl.Map | null;
  drawMode: string;
  drawnFeatures: GeoJSON.Feature[];
  addAreaLabel: (map: mapboxgl.Map, center: mapboxgl.LngLat, area: number) => mapboxgl.Marker | null;
  clearAreaLabels: () => void;
}

export function useMapLabels({ 
  drawRef, 
  map, 
  drawMode,
  drawnFeatures, 
  addAreaLabel, 
  clearAreaLabels
}: MapLabelsProps) {
  const updateAllPolygonLabels = useCallback(() => {
    if (!map || !drawRef.current.lengthLabelsSource) return;
    
    const allLabelFeatures: GeoJSON.Feature[] = [];
    
    drawnFeatures.forEach(feature => {
      if (feature.geometry.type === 'Polygon') {
        const coords = feature.geometry.coordinates[0];
        const labels = generateLengthLabels(coords as Position[]);
        allLabelFeatures.push(...labels.features);
      }
    });
    
    if (drawMode === 'draw' && drawRef.current.currentPoints.length >= 2) {
      const tempPolygonCoords = [...drawRef.current.currentPoints];
      if (tempPolygonCoords.length >= 3) {
        const tempClosedPolygon = [...tempPolygonCoords, tempPolygonCoords[0]];
        const tempLabels = generateLengthLabels(tempClosedPolygon);
        allLabelFeatures.push(...tempLabels.features);
      } else {
        const tempLineLabels = generateLengthLabels(tempPolygonCoords);
        allLabelFeatures.push(...tempLineLabels.features);
      }
    }
    
    drawRef.current.lengthLabelsSource.setData({
      type: 'FeatureCollection',
      features: allLabelFeatures
    });
  }, [map, drawRef, drawnFeatures, drawMode]);

  const updateAllAreaLabels = useCallback(() => {
    if (!map) return;
    
    clearAreaLabels();
    
    drawnFeatures.forEach(feature => {
      if (feature.geometry.type === 'Polygon' && feature.properties?.area) {
        const polygon = feature.geometry as GeoJSON.Polygon;
        const coordinates = polygon.coordinates[0];
        const center = turf.center(turf.polygon([coordinates])).geometry.coordinates;
        addAreaLabel(map, new mapboxgl.LngLat(center[0], center[1]), feature.properties.area);
      }
    });
  }, [map, clearAreaLabels, drawnFeatures, addAreaLabel]);

  return {
    updateAllPolygonLabels,
    updateAllAreaLabels
  };
}

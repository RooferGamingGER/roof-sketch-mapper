
import { useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { Position } from 'geojson';
import { checkSnapToVertex, positionsToCoordinates } from '@/utils/mapUtils';
import { DrawingRef } from '@/hooks/useMapDrawing';

export function useMapMouseInteraction(
  drawRef: React.MutableRefObject<DrawingRef>,
  updateAllPolygonLabels: () => void
) {
  const handleMouseMove = useCallback((
    e: mapboxgl.MapMouseEvent, 
    map: mapboxgl.Map | null,
    drawMode: string
  ) => {
    if (!map) return;
    
    // Handle snapping and drawing preview
    if (drawMode === 'draw' && drawRef.current.currentPoints.length > 0) {
      const snapResult = checkSnapToVertex(
        e.point, 
        map, 
        drawRef.current.currentPoints, 
        drawRef.current.snapDistance, 
        false
      );
      
      if (snapResult.snapped) {
        map.getCanvas().style.cursor = 'pointer';
      } else {
        map.getCanvas().style.cursor = 'crosshair';
      }
      
      if (drawRef.current.currentLineSource && drawRef.current.currentPoints.length > 0) {
        const movePoint = snapResult.snapped ? snapResult.position : [e.lngLat.lng, e.lngLat.lat];
        if (movePoint) {
          const tempPoints = [...drawRef.current.currentPoints, movePoint];
          
          drawRef.current.currentLineSource.setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: positionsToCoordinates(tempPoints)
            }
          });

          if (drawRef.current.currentPoints.length >= 3 && drawRef.current.currentPolygonSource) {
            const tempPolygonCoords = [...drawRef.current.currentPoints, movePoint];
            if (tempPolygonCoords.length >= 3) {
              drawRef.current.currentPolygonSource.setData({
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'Polygon',
                  coordinates: [positionsToCoordinates([...tempPolygonCoords, tempPolygonCoords[0]])]
                }
              });
            }
          }
          
          if (drawRef.current.lengthLabelsSource) {
            updateAllPolygonLabels();
          }
        }
      }
    }
  }, [drawRef, updateAllPolygonLabels]);

  const handleFeatureClick = useCallback((
    e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] },
    onFeatureSelect: (id: string | null) => void,
    onMeasurementUpdate: (results: { area: number; perimeter: number }) => void,
    features: GeoJSON.Feature[],
    drawMode: string,
    createEditMarkersForPolygon: (
      map: mapboxgl.Map,
      coordinates: Position[], 
      selectedFeatureId: string,
      features: GeoJSON.Feature[]
    ) => void,
    map: mapboxgl.Map | null
  ) => {
    if (!e.features || e.features.length === 0 || !map) return;
    
    const featureId = e.features[0].properties?.id;
    onFeatureSelect(featureId || null);
    
    const feature = features.find(f => f.id === featureId);
    if (feature && feature.geometry.type === 'Polygon') {
      const area = feature.properties?.area || 0;
      const polygon = feature.geometry as GeoJSON.Polygon;
      const perimeter = feature.properties?.perimeter || 0;
      
      onMeasurementUpdate({
        area,
        perimeter
      });
      
      if (drawMode === 'edit') {
        createEditMarkersForPolygon(map, polygon.coordinates[0] as Position[], featureId, features);
      }
    }
  }, []);

  return {
    handleMouseMove,
    handleFeatureClick
  };
}

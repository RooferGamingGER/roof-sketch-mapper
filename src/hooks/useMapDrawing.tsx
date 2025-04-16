
import { useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import { toast } from 'sonner';
import { VertexMarker } from '@/components/VertexMarker';
import { Position } from 'geojson';
import {
  calculateMeasurements,
  positionsToCoordinates,
  checkSnapToVertex,
  positionToLngLat
} from '@/utils/mapUtils';

export interface DrawingRef {
  currentPoints: Position[];
  currentMarkers: mapboxgl.Marker[];
  editMarkers: VertexMarker[];
  areaLabels: mapboxgl.Marker[];
  currentLineSource?: mapboxgl.GeoJSONSource;
  currentPolygonSource?: mapboxgl.GeoJSONSource;
  lengthLabelsSource?: mapboxgl.GeoJSONSource;
  snap: boolean;
  snapDistance: number;
}

export function useMapDrawing(
  onFeatureAdd: (feature: GeoJSON.Feature) => void,
  onFeatureUpdate: (id: string, feature: GeoJSON.Feature) => void,
  onMeasurementUpdate: (results: { area: number; perimeter: number }) => void,
  onSelectionChange: (id: string | null) => void
) {
  const drawRef = useRef<DrawingRef>({
    currentPoints: [],
    currentMarkers: [],
    editMarkers: [],
    areaLabels: [],
    snap: true,
    snapDistance: 15
  });

  const createAreaLabelElement = useCallback((areaText: string) => {
    const el = document.createElement('div');
    el.className = 'area-label';
    el.innerHTML = `<strong>${areaText} m²</strong>`;
    el.style.backgroundColor = 'rgba(52, 152, 219, 0.8)';
    el.style.color = 'white';
    el.style.padding = '4px 8px';
    el.style.borderRadius = '4px';
    el.style.fontSize = '12px';
    return el;
  }, []);

  const addAreaLabel = useCallback((map: mapboxgl.Map, center: mapboxgl.LngLat, area: number) => {
    if (!map) return null;
    
    const formattedArea = (area).toFixed(2);
    
    const marker = new mapboxgl.Marker({
      element: createAreaLabelElement(formattedArea),
      anchor: 'center'
    })
    .setLngLat(center)
    .addTo(map);
    
    drawRef.current.areaLabels.push(marker);
    return marker;
  }, [createAreaLabelElement]);

  const clearAreaLabels = useCallback(() => {
    drawRef.current.areaLabels.forEach(marker => marker.remove());
    drawRef.current.areaLabels = [];
  }, []);

  const clearEditMarkers = useCallback(() => {
    drawRef.current.editMarkers.forEach(marker => marker.remove());
    drawRef.current.editMarkers = [];
  }, []);

  const resetCurrentDraw = useCallback(() => {
    drawRef.current.currentPoints = [];
    drawRef.current.currentMarkers.forEach(marker => marker.remove());
    drawRef.current.currentMarkers = [];

    if (drawRef.current.currentLineSource) {
      drawRef.current.currentLineSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      });
    }

    if (drawRef.current.currentPolygonSource) {
      drawRef.current.currentPolygonSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[]]
        }
      });
    }
  }, []);

  const checkSnapToFirst = useCallback((map: mapboxgl.Map, point: mapboxgl.Point): Position | null => {
    if (drawRef.current.currentPoints.length < 3) return null;

    const firstPoint = drawRef.current.currentPoints[0];
    if (!map || !firstPoint) return null;

    const firstPointPixel = map.project([firstPoint[0], firstPoint[1]]);
    const distance = Math.sqrt(
      Math.pow(firstPointPixel.x - point.x, 2) + 
      Math.pow(firstPointPixel.y - point.y, 2)
    );

    if (distance <= drawRef.current.snapDistance) {
      return firstPoint;
    }
    return null;
  }, []);

  const completePolygon = useCallback((map: mapboxgl.Map) => {
    if (drawRef.current.currentPoints.length < 3) {
      toast.error('Ein Polygon benötigt mindestens 3 Punkte');
      return false;
    }

    const firstPoint = drawRef.current.currentPoints[0];
    const polygonCoords = [...drawRef.current.currentPoints, firstPoint];
    const polygonFeature = turf.polygon([positionsToCoordinates(polygonCoords)]);
    polygonFeature.id = `polygon-${Date.now()}`;
    
    const { area, perimeter } = calculateMeasurements(polygonCoords);
    
    polygonFeature.properties = {
      id: polygonFeature.id,
      area,
      perimeter
    };
    
    onFeatureAdd(polygonFeature);
    onSelectionChange(polygonFeature.id as string);
    
    onMeasurementUpdate({
      area,
      perimeter
    });
    
    const polygonCenter = turf.center(polygonFeature).geometry.coordinates;
    addAreaLabel(map, new mapboxgl.LngLat(polygonCenter[0], polygonCenter[1]), area);
    
    toast.success(`Polygon erstellt: ${(area).toFixed(2)} m², Umfang: ${perimeter.toFixed(2)} m`);
    
    resetCurrentDraw();
    return true;
  }, [addAreaLabel, onFeatureAdd, onMeasurementUpdate, onSelectionChange, resetCurrentDraw]);

  const createEditMarkersForPolygon = useCallback((
    map: mapboxgl.Map,
    coordinates: Position[], 
    selectedFeatureId: string,
    features: GeoJSON.Feature[]
  ) => {
    if (!map) return;

    clearEditMarkers();

    coordinates.forEach((coord, index) => {
      // Skip the last point if it's the same as the first (polygon closing)
      if (index === coordinates.length - 1 && 
          coordinates[0][0] === coord[0] && 
          coordinates[0][1] === coord[1]) {
        return;
      }

      const marker = new VertexMarker(coord, index);
      
      marker.addTo(map);
      
      marker.on('dragend', () => {
        if (!selectedFeatureId) return;
        
        const newLngLat = marker.getLngLat();
        const vertexIndex = marker.getVertexIndex();
        
        const feature = features.find(f => f.id === selectedFeatureId);
        if (!feature || feature.geometry.type !== 'Polygon') return;
        
        const polygonCoords = [...feature.geometry.coordinates[0] as Position[]];
        polygonCoords[vertexIndex] = [newLngLat.lng, newLngLat.lat];
        
        if (vertexIndex === 0) {
          polygonCoords[polygonCoords.length - 1] = [newLngLat.lng, newLngLat.lat];
        }

        const updatedFeature = {
          ...feature,
          geometry: {
            ...feature.geometry,
            coordinates: [polygonCoords]
          }
        };
        
        const { area, perimeter } = calculateMeasurements(polygonCoords);
        updatedFeature.properties = {
          ...updatedFeature.properties,
          area,
          perimeter
        };
        
        onFeatureUpdate(selectedFeatureId, updatedFeature);
        
        onMeasurementUpdate({ area, perimeter });
        
        toast.success(`Polygon aktualisiert: ${area.toFixed(2)} m², Umfang: ${perimeter.toFixed(2)} m`);
      });
      
      drawRef.current.editMarkers.push(marker);
    });
  }, [clearEditMarkers, onFeatureUpdate, onMeasurementUpdate]);

  const handleMapClick = useCallback((
    e: mapboxgl.MapMouseEvent, 
    map: mapboxgl.Map, 
    drawMode: string,
    updateAllPolygonLabels: () => void,
    updateMeasurements: () => void
  ) => {
    if (!map || drawMode !== 'draw') return;

    const point = e.point;
    let coords: Position;
    
    const snapPoint = checkSnapToFirst(map, point);
    if (snapPoint) {
      coords = snapPoint;
      completePolygon(map);
      return;
    } else {
      coords = [e.lngLat.lng, e.lngLat.lat];
    }

    drawRef.current.currentPoints.push(coords);

    const marker = new mapboxgl.Marker({ color: '#e67e22', scale: 0.7 })
      .setLngLat(positionToLngLat(coords))
      .addTo(map);
    drawRef.current.currentMarkers.push(marker);

    if (drawRef.current.currentLineSource) {
      drawRef.current.currentLineSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: positionsToCoordinates(drawRef.current.currentPoints)
        }
      });
    }

    if (drawRef.current.currentPoints.length >= 3 && drawRef.current.currentPolygonSource) {
      const tempPolygonCoords = [...drawRef.current.currentPoints];
      drawRef.current.currentPolygonSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [positionsToCoordinates([...tempPolygonCoords, tempPolygonCoords[0]])]
        }
      });
    }
    
    if (drawRef.current.lengthLabelsSource && drawRef.current.currentPoints.length >= 2) {
      updateAllPolygonLabels();
    }

    if (drawRef.current.currentPoints.length >= 3) {
      const tempPolygonCoords = [...drawRef.current.currentPoints];
      const { area, perimeter } = calculateMeasurements([...tempPolygonCoords, tempPolygonCoords[0]]);
      
      onMeasurementUpdate({
        area,
        perimeter
      });
    }
  }, [checkSnapToFirst, completePolygon, onMeasurementUpdate]);

  const handleRightClick = useCallback((
    e: mapboxgl.MapMouseEvent, 
    map: mapboxgl.Map, 
    drawMode: string
  ) => {
    if (!map || drawMode !== 'draw' || drawRef.current.currentPoints.length < 3) {
      return;
    }
    
    e.preventDefault();
    completePolygon(map);
  }, [completePolygon]);

  return {
    drawRef,
    clearAreaLabels,
    clearEditMarkers,
    resetCurrentDraw,
    completePolygon,
    createEditMarkersForPolygon,
    handleMapClick,
    handleRightClick,
    addAreaLabel
  };
}

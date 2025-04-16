import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf';
import { useMapContext } from '@/context/MapContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const Map: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<{
    currentPoints: number[][];
    currentMarkers: mapboxgl.Marker[];
    currentLineSource?: mapboxgl.GeoJSONSource;
    currentPolygonSource?: mapboxgl.GeoJSONSource;
    snap: boolean;
    snapDistance: number;
  }>({
    currentPoints: [],
    currentMarkers: [],
    snap: true,
    snapDistance: 10
  });

  const {
    mapboxToken,
    coordinates,
    drawMode,
    addFeature,
    drawnFeatures,
    selectedFeatureId,
    setSelectedFeatureId,
    setMeasurementResults
  } = useMapContext();

  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string>('Bitte geben Sie Mapbox-Token ein und suchen Sie eine Adresse.');

  useEffect(() => {
    if (!mapboxToken || !mapContainer.current) {
      return;
    }

    try {
      mapboxgl.accessToken = mapboxToken;

      if (!map.current) {
        setIsLoading(true);
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/satellite-streets-v12',
          zoom: 18,
          pitch: 45,
          bearing: 0,
          attributionControl: false
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-right');

        map.current.on('load', () => {
          map.current?.addSource('current-line', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: []
              }
            }
          });

          map.current?.addSource('current-polygon', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [[]]
              }
            }
          });

          map.current?.addLayer({
            id: 'current-line-layer',
            type: 'line',
            source: 'current-line',
            layout: {
              'line-cap': 'round',
              'line-join': 'round'
            },
            paint: {
              'line-color': '#e67e22',
              'line-width': 2,
              'line-dasharray': [2, 1]
            }
          });

          map.current?.addLayer({
            id: 'current-polygon-layer',
            type: 'fill',
            source: 'current-polygon',
            paint: {
              'fill-color': '#e67e22',
              'fill-opacity': 0.3
            }
          });

          map.current?.addLayer({
            id: 'current-polygon-outline',
            type: 'line',
            source: 'current-polygon',
            paint: {
              'line-color': '#e67e22',
              'line-width': 2
            }
          });

          map.current?.addSource('saved-polygons', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
            }
          });

          map.current?.addLayer({
            id: 'saved-polygons-layer',
            type: 'fill',
            source: 'saved-polygons',
            paint: {
              'fill-color': [
                'case',
                ['boolean', ['==', ['get', 'id'], selectedFeatureId], false],
                '#3498db',
                '#1a365d'
              ],
              'fill-opacity': 0.5
            }
          });

          map.current?.addLayer({
            id: 'saved-polygons-outline',
            type: 'line',
            source: 'saved-polygons',
            paint: {
              'line-color': [
                'case',
                ['boolean', ['==', ['get', 'id'], selectedFeatureId], false],
                '#3498db',
                '#1a365d'
              ],
              'line-width': 2
            }
          });

          map.current?.on('click', 'saved-polygons-layer', (e) => {
            if (e.features && e.features.length > 0) {
              const featureId = e.features[0].properties?.id;
              setSelectedFeatureId(featureId || null);
              
              const feature = drawnFeatures.find(f => f.id === featureId);
              if (feature && feature.geometry.type === 'Polygon') {
                const area = turf.area(feature);
                const polygon = feature.geometry as GeoJSON.Polygon;
                const line = turf.lineString(polygon.coordinates[0]);
                const perimeter = turf.length(line, { units: 'meters' });
                
                setMeasurementResults({
                  area,
                  perimeter
                });
                
                toast.success(`Fläche: ${(area).toFixed(2)} m², Umfang: ${perimeter.toFixed(2)} m`);
              }
            }
          });

          drawRef.current.currentLineSource = map.current?.getSource('current-line') as mapboxgl.GeoJSONSource;
          drawRef.current.currentPolygonSource = map.current?.getSource('current-polygon') as mapboxgl.GeoJSONSource;

          setIsLoading(false);
          setMessage('Karte geladen. Sie können nun mit dem Zeichnen beginnen.');
        });

        map.current.on('move', () => {
          updateMeasurements();
        });
      }
    } catch (error) {
      console.error('Fehler beim Initialisieren der Karte:', error);
      toast.error('Fehler beim Laden der Karte. Bitte prüfen Sie Ihren Mapbox-Token.');
      setMessage('Fehler beim Laden der Karte. Bitte prüfen Sie Ihren Mapbox-Token.');
    }

    return () => {
      if (drawRef.current.currentMarkers.length > 0) {
        drawRef.current.currentMarkers.forEach(marker => marker.remove());
        drawRef.current.currentMarkers = [];
      }
    };
  }, [mapboxToken]);

  useEffect(() => {
    if (!map.current || !coordinates) return;

    map.current.flyTo({
      center: coordinates,
      zoom: 18,
      essential: true
    });
  }, [coordinates]);

  const resetCurrentDraw = () => {
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
  };

  const checkSnapToFirst = (point: mapboxgl.Point): [number, number] | null => {
    if (drawRef.current.currentPoints.length < 3) return null;

    const firstPoint = drawRef.current.currentPoints[0];
    if (!map.current || !firstPoint) return null;

    const firstPointPixel = map.current.project(firstPoint as mapboxgl.LngLatLike);
    const distance = Math.sqrt(
      Math.pow(firstPointPixel.x - point.x, 2) + 
      Math.pow(firstPointPixel.y - point.y, 2)
    );

    if (distance <= drawRef.current.snapDistance) {
      return firstPoint;
    }
    return null;
  };

  useEffect(() => {
    if (!map.current) return;

    map.current.off('click', handleMapClick);

    resetCurrentDraw();

    map.current.getCanvas().style.cursor = '';

    if (drawMode === 'draw') {
      map.current.on('click', handleMapClick);
      map.current.getCanvas().style.cursor = 'crosshair';
      setMessage('Klicken Sie auf die Karte, um Punkte hinzuzufügen. Schließen Sie das Polygon durch Klicken auf den ersten Punkt.');
    } else if (drawMode === 'measure') {
      updateMeasurements();
      setMessage('Wählen Sie ein Polygon aus, um dessen Maße anzuzeigen.');
    }
  }, [drawMode]);

  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const source = map.current.getSource('saved-polygons') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: drawnFeatures
      });
    }
  }, [drawnFeatures, selectedFeatureId]);

  const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
    if (!map.current || drawMode !== 'draw') return;

    const point = e.point;
    let coords: [number, number];
    
    const snapPoint = checkSnapToFirst(point);
    if (snapPoint) {
      coords = snapPoint;
      
      const polygonCoords = [...drawRef.current.currentPoints, snapPoint];
      const polygonFeature = turf.polygon([[...polygonCoords, polygonCoords[0]]]);
      polygonFeature.id = `polygon-${Date.now()}`;
      
      const area = turf.area(polygonFeature);
      const line = turf.lineString([...polygonCoords, polygonCoords[0]]);
      const perimeter = turf.length(line, { units: 'meters' });
      
      polygonFeature.properties = {
        id: polygonFeature.id,
        area,
        perimeter
      };
      
      addFeature(polygonFeature);
      
      setMeasurementResults({
        area,
        perimeter
      });
      
      toast.success(`Polygon erstellt: ${(area).toFixed(2)} m², Umfang: ${perimeter.toFixed(2)} m`);
      
      resetCurrentDraw();
      return;
    } else {
      coords = [e.lngLat.lng, e.lngLat.lat];
    }

    drawRef.current.currentPoints.push(coords);

    const marker = new mapboxgl.Marker({ color: '#e67e22', scale: 0.7 })
      .setLngLat(coords)
      .addTo(map.current);
    drawRef.current.currentMarkers.push(marker);

    if (drawRef.current.currentLineSource) {
      drawRef.current.currentLineSource.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: drawRef.current.currentPoints
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
          coordinates: [[...tempPolygonCoords, tempPolygonCoords[0]]]
        }
      });
    }
  };

  const updateMeasurements = () => {
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-border">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-primary font-medium">Karte wird geladen...</p>
          </div>
        </div>
      )}

      {(!mapboxToken || !coordinates) && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 p-6">
          <div className="text-center max-w-md">
            <p className="text-dach-primary font-medium">{message}</p>
          </div>
        </div>
      )}

      <div ref={mapContainer} className="w-full h-full min-h-[400px]" />
      
      <div className="absolute bottom-0 right-0 z-10 text-xs text-white bg-black/50 px-2 py-1">
        © Mapbox
      </div>
    </div>
  );
};

export default Map;

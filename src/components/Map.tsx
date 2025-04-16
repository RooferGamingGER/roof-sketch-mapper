
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

  // Initialisiere die Karte beim ersten Laden oder wenn sich das Token ändert
  useEffect(() => {
    if (!mapboxToken || !mapContainer.current) {
      return;
    }

    try {
      // Setze den Mapbox-Token
      mapboxgl.accessToken = mapboxToken;

      // Initialisiere die Karte, wenn sie noch nicht existiert
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

        // Füge Steuerungselemente hinzu
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-right');

        map.current.on('load', () => {
          // Füge Quellen und Ebenen für das Zeichnen hinzu
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

          // Ebene für die aktuell gezeichnete Linie
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

          // Ebene für das aktuelle Polygon
          map.current?.addLayer({
            id: 'current-polygon-layer',
            type: 'fill',
            source: 'current-polygon',
            paint: {
              'fill-color': '#e67e22',
              'fill-opacity': 0.3
            }
          });

          // Ebene für die Kontur des aktuellen Polygons
          map.current?.addLayer({
            id: 'current-polygon-outline',
            type: 'line',
            source: 'current-polygon',
            paint: {
              'line-color': '#e67e22',
              'line-width': 2
            }
          });

          // Quelle für gespeicherte Polygone hinzufügen
          map.current?.addSource('saved-polygons', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
            }
          });

          // Ebene für gespeicherte Polygone
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

          // Ebene für die Kontur gespeicherter Polygone
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

          // Eventlistener für Klicks auf gespeicherte Polygone
          map.current?.on('click', 'saved-polygons-layer', (e) => {
            if (e.features && e.features.length > 0) {
              const featureId = e.features[0].properties?.id;
              setSelectedFeatureId(featureId || null);
              
              // Berechne Maße für ausgewähltes Polygon
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

        // Eventlistener für Kartenbewegung
        map.current.on('move', () => {
          // Aktualisiert die Maße der gezeichneten Elemente
          updateMeasurements();
        });
      }
    } catch (error) {
      console.error('Fehler beim Initialisieren der Karte:', error);
      toast.error('Fehler beim Laden der Karte. Bitte prüfen Sie Ihren Mapbox-Token.');
      setMessage('Fehler beim Laden der Karte. Bitte prüfen Sie Ihren Mapbox-Token.');
    }

    return () => {
      // Aufräumen
      if (drawRef.current.currentMarkers.length > 0) {
        drawRef.current.currentMarkers.forEach(marker => marker.remove());
        drawRef.current.currentMarkers = [];
      }
    };
  }, [mapboxToken]);

  // Wenn sich die Koordinaten ändern (nach einer Adresssuche), bewege die Karte dorthin
  useEffect(() => {
    if (!map.current || !coordinates) return;

    map.current.flyTo({
      center: coordinates,
      zoom: 18,
      essential: true
    });
  }, [coordinates]);

  // Aktuelle Zeichnung zurücksetzen
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

  // Prüfe, ob der neue Punkt in der Nähe des ersten Punkts ist (für den Punktfang)
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

  // Aktiviere die Zeichenfunktion basierend auf dem aktuellen Zeichenmodus
  useEffect(() => {
    if (!map.current) return;

    // Entferne vorhandene Eventlistener
    map.current.off('click', handleMapClick);

    // Setze die aktuelle Zeichnung zurück
    resetCurrentDraw();

    // Cursor-Stil zurücksetzen
    map.current.getCanvas().style.cursor = '';

    if (drawMode === 'draw') {
      // Füge neuen Eventlistener für das Zeichnen hinzu
      map.current.on('click', handleMapClick);
      map.current.getCanvas().style.cursor = 'crosshair';
      setMessage('Klicken Sie auf die Karte, um Punkte hinzuzufügen. Schließen Sie das Polygon durch Klicken auf den ersten Punkt.');
    } else if (drawMode === 'measure') {
      updateMeasurements();
      setMessage('Wählen Sie ein Polygon aus, um dessen Maße anzuzeigen.');
    }

  }, [drawMode]);

  // Aktualisiere die angezeigten gezeichneten Polygone, wenn sich die Features ändern
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

  // Handler für Klicks auf die Karte im Zeichenmodus
  const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
    if (!map.current || drawMode !== 'draw') return;

    const point = e.point;
    let coords: [number, number];
    
    // Prüfe Punktfang zum ersten Punkt
    const snapPoint = checkSnapToFirst(point);
    if (snapPoint) {
      coords = snapPoint;
      
      // Füge das Polygon zur Liste hinzu
      const polygonCoords = [...drawRef.current.currentPoints, snapPoint];
      const polygonFeature = turf.polygon([[...polygonCoords, polygonCoords[0]]]);
      polygonFeature.id = `polygon-${Date.now()}`;
      
      // Berechne Fläche und Umfang
      const area = turf.area(polygonFeature);
      const line = turf.lineString([...polygonCoords, polygonCoords[0]]);
      const perimeter = turf.length(line, { units: 'meters' });
      
      // Füge Eigenschaften hinzu
      polygonFeature.properties = {
        id: polygonFeature.id,
        area,
        perimeter
      };
      
      // Füge das Feature hinzu
      addFeature(polygonFeature);
      
      // Zeige Maße an
      setMeasurementResults({
        area,
        perimeter
      });
      
      toast.success(`Polygon erstellt: ${(area).toFixed(2)} m², Umfang: ${perimeter.toFixed(2)} m`);
      
      // Setze aktuelle Zeichnung zurück
      resetCurrentDraw();
      return;
    } else {
      coords = [e.lngLat.lng, e.lngLat.lat];
    }

    // Füge den Punkt zur Liste hinzu
    drawRef.current.currentPoints.push(coords);

    // Erstelle einen Marker für den neuen Punkt
    const marker = new mapboxgl.Marker({ color: '#e67e22', scale: 0.7 })
      .setLngLat(coords)
      .addTo(map.current);
    drawRef.current.currentMarkers.push(marker);

    // Aktualisiere die Linie
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

    // Aktualisiere das temporäre Polygon, wenn mindestens 3 Punkte gesetzt wurden
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

  // Funktion zum Aktualisieren der Maße
  const updateMeasurements = () => {
    // Diese Funktion könnte verwendet werden, um dynamisch Maßlinien anzuzeigen
    // während der Benutzer die Karte bewegt oder zoomt
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-border">
      {/* Ladeanzeige */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-primary font-medium">Karte wird geladen...</p>
          </div>
        </div>
      )}

      {/* Infotext wenn kein Token oder Koordinaten */}
      {(!mapboxToken || !coordinates) && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 p-6">
          <div className="text-center max-w-md">
            <p className="text-dach-primary font-medium">{message}</p>
          </div>
        </div>
      )}

      {/* Kartenelement */}
      <div ref={mapContainer} className="w-full h-full min-h-[400px]" />
      
      {/* Bildnachweis */}
      <div className="absolute bottom-0 right-0 z-10 text-xs text-white bg-black/50 px-2 py-1">
        © Mapbox
      </div>
    </div>
  );
};

export default Map;

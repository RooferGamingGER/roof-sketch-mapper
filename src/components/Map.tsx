
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapContext } from '@/context/MapContext';
import { toast } from 'sonner';
import { MAPBOX_TOKEN } from '@/config/mapbox';
import MapControls from './map/MapControls';
import { setupMapLayers, updateSavedPolygonsLayer, mapStyle } from './map/MapLayers';
import { useMapDrawing } from '@/hooks/useMapDrawing';
import { useMapLabels } from './map/MapLabels';
import { useMapVisibility } from '@/hooks/useMapVisibility';
import { useMapMouseInteraction } from '@/hooks/useMapMouseInteraction';
import { Position } from 'geojson';

const Map: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  
  const {
    coordinates,
    drawMode,
    addFeature,
    drawnFeatures,
    updateFeature,
    selectedFeatureId,
    setSelectedFeatureId,
    setMeasurementResults
  } = useMapContext();

  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('Karte wird geladen...');
  const [hoverPoint, setHoverPoint] = useState<mapboxgl.Point | null>(null);

  // Initialize drawing tools and hooks
  const {
    drawRef,
    clearAreaLabels,
    clearEditMarkers,
    resetCurrentDraw,
    completePolygon,
    createEditMarkersForPolygon,
    handleMapClick,
    handleRightClick,
    addAreaLabel
  } = useMapDrawing(
    addFeature,
    updateFeature,
    setMeasurementResults,
    setSelectedFeatureId
  );

  // Map labels hook
  const { updateAllPolygonLabels, updateAllAreaLabels } = useMapLabels({
    drawRef,
    map: map.current,
    drawMode,
    drawnFeatures,
    addAreaLabel: (mapInstance, center, area) => addAreaLabel(mapInstance, center, area),
    clearAreaLabels
  });

  // Map visibility hook
  const { updateLayerVisibility } = useMapVisibility();

  // Map mouse interaction hook
  const { handleMouseMove, handleFeatureClick } = useMapMouseInteraction(
    drawRef,
    updateAllPolygonLabels
  );

  // Update all measurements
  const updateMeasurements = () => {
    if (drawnFeatures.length > 0) {
      updateAllPolygonLabels();
      updateAllAreaLabels();
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    
    const loadTimeout = setTimeout(() => {
      if (isLoading) {
        setMapError('Die Karte konnte nicht geladen werden. Bitte aktualisieren Sie die Seite.');
        setIsLoading(false);
      }
    }, 15000);

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      if (!map.current) {
        setIsLoading(true);
        
        // Replace token placeholder in mapStyle
        const finalMapStyle = JSON.parse(JSON.stringify(mapStyle).replace('{token}', MAPBOX_TOKEN));
        
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: finalMapStyle,
          zoom: 18,
          pitch: 0,
          bearing: 0,
          attributionControl: false,
          center: [7.4652, 51.5135],
          maxBounds: null
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-right');

        map.current.on('load', () => {
          // Setup layers
          const sources = setupMapLayers(map.current!);
          drawRef.current.currentLineSource = sources.currentLineSource;
          drawRef.current.currentPolygonSource = sources.currentPolygonSource;
          drawRef.current.lengthLabelsSource = sources.lengthLabelsSource;

          // Setup event handlers for polygon selection
          map.current!.on('click', 'saved-polygons-layer', (e) => {
            handleFeatureClick(
              e,
              setSelectedFeatureId,
              setMeasurementResults,
              drawnFeatures,
              drawMode,
              createEditMarkersForPolygon,
              map.current
            );
          });

          // Setup mouse movement handler
          map.current!.on('mousemove', (e) => {
            setHoverPoint(e.point);
            handleMouseMove(e, map.current, drawMode);
          });

          setIsLoading(false);
          setMessage('Karte geladen. Sie können nun mit dem Zeichnen beginnen.');
          clearTimeout(loadTimeout);
          
          // Initial layer visibility
          const visibilityResult = updateLayerVisibility(map.current, updateMeasurements);
          if (visibilityResult.message) {
            setMessage(visibilityResult.message);
          }
          
          // Update layers on map move
          map.current!.on('moveend', () => {
            const visibilityResult = updateLayerVisibility(map.current, updateMeasurements);
            if (visibilityResult.message) {
              setMessage(visibilityResult.message);
            }
          });
        });

        map.current.on('error', (e) => {
          console.error('Mapbox Error:', e);
          setMapError('Fehler beim Laden der Karte: ' + (e.error?.message || 'Unbekannter Fehler'));
          setIsLoading(false);
          clearTimeout(loadTimeout);
        });
      }
    } catch (error) {
      console.error('Fehler beim Initialisieren der Karte:', error);
      setMapError('Fehler beim Laden der Karte. Bitte aktualisieren Sie die Seite.');
      setIsLoading(false);
      clearTimeout(loadTimeout);
    }

    return () => {
      clearTimeout(loadTimeout);
      if (drawRef.current.currentMarkers.length > 0) {
        drawRef.current.currentMarkers.forEach(marker => marker.remove());
        drawRef.current.currentMarkers = [];
      }
      clearEditMarkers();
      clearAreaLabels();
    };
  }, []);

  // Handle coordinate changes
  useEffect(() => {
    if (!map.current || !coordinates) return;

    map.current.flyTo({
      center: coordinates,
      zoom: 18,
      essential: true
    });
  }, [coordinates]);

  // Handle draw mode changes
  useEffect(() => {
    if (!map.current) return;

    map.current.off('click', handleMapClick);
    map.current.off('contextmenu', handleRightClick);

    resetCurrentDraw();
    clearEditMarkers();
    clearAreaLabels();
    
    updateAllPolygonLabels();
    updateAllAreaLabels();

    map.current.getCanvas().style.cursor = '';

    if (drawMode === 'draw') {
      // Fix: Wrap the event handlers to properly pass the required arguments
      map.current.on('click', (e) => {
        handleMapClick(e, map.current!, drawMode, updateAllPolygonLabels, updateMeasurements);
      });
      
      map.current.on('contextmenu', (e) => {
        handleRightClick(e, map.current!, drawMode);
      });
      
      map.current.getCanvas().style.cursor = 'crosshair';
      setMessage('Klicken Sie auf die Karte, um Punkte hinzuzufügen. Rechtsklick oder Klicken auf den ersten Punkt zum Abschließen.');
    } else if (drawMode === 'edit') {
      map.current.getCanvas().style.cursor = 'default';
      setMessage('Klicken Sie auf ein Polygon um es zu bearbeiten. Ziehen Sie die Eckpunkte um das Polygon anzupassen.');
      
      if (selectedFeatureId) {
        const feature = drawnFeatures.find(f => f.id === selectedFeatureId);
        if (feature && feature.geometry.type === 'Polygon') {
          createEditMarkersForPolygon(map.current, feature.geometry.coordinates[0] as Position[], selectedFeatureId, drawnFeatures);
        }
      }
    } else {
      setMessage('');
    }
  }, [
    drawMode, 
    selectedFeatureId, 
    drawnFeatures, 
    clearAreaLabels, 
    clearEditMarkers, 
    createEditMarkersForPolygon, 
    handleMapClick, 
    handleRightClick, 
    resetCurrentDraw, 
    updateAllAreaLabels, 
    updateAllPolygonLabels
  ]);

  // Update features when selection changes
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    
    updateSavedPolygonsLayer(map.current, drawnFeatures, selectedFeatureId);
    updateAllPolygonLabels();
    updateAllAreaLabels();
  }, [drawnFeatures, selectedFeatureId, updateAllAreaLabels, updateAllPolygonLabels]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-border">
      <MapControls 
        message={message}
        isLoading={isLoading}
        mapError={mapError}
        coordinates={coordinates}
        onReload={() => window.location.reload()}
      />
      <div ref={mapContainer} className="w-full h-full min-h-[400px]" />
    </div>
  );
};

export default Map;

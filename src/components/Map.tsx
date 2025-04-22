import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import * as turf from '@turf/turf';
import { useMapContext } from '@/context/MapContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MAPBOX_TOKEN } from '@/config/mapbox';
import { VertexMarker } from './VertexMarker';
import { 
  generateLengthLabels,
  generateTempLengthLabels, 
  calculateMeasurements, 
  positionsToCoordinates,
  checkSnapToVertex,
  positionToLngLat
} from '@/utils/mapUtils';
import { Position } from 'geojson';

const Map: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<{
    currentPoints: Position[];
    currentMarkers: mapboxgl.Marker[];
    editMarkers: VertexMarker[];
    currentLineSource?: mapboxgl.GeoJSONSource;
    currentPolygonSource?: mapboxgl.GeoJSONSource;
    lengthLabelsSource?: mapboxgl.GeoJSONSource;
    tempLabelsSource?: mapboxgl.GeoJSONSource;
    areaLabels: mapboxgl.Marker[];
    snap: boolean;
    snapDistance: number;
    lastMousePosition: Position | null;
  }>({
    currentPoints: [],
    currentMarkers: [],
    editMarkers: [],
    areaLabels: [],
    snap: true,
    snapDistance: 15,
    lastMousePosition: null
  });

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
  const hasShownOutOfNRWWarningRef = useRef(false);
  
  const nrwBounds = {
    north: 52.5314,
    south: 50.3230,
    east: 9.4623,
    west: 5.8663
  };

  const isWithinNRW = (lng: number, lat: number): boolean => {
    return lat >= nrwBounds.south && 
           lat <= nrwBounds.north && 
           lng >= nrwBounds.west && 
           lng <= nrwBounds.east;
  };

  const clearEditMarkers = () => {
    drawRef.current.editMarkers.forEach(marker => marker.remove());
    drawRef.current.editMarkers = [];
  };

  const addAreaLabel = (center: mapboxgl.LngLat, area: number) => {
    if (!map.current) return null;
    
    const formattedArea = (area).toFixed(2);
    
    const marker = new mapboxgl.Marker({
      element: createAreaLabelElement(formattedArea),
      anchor: 'center'
    })
    .setLngLat(center)
    .addTo(map.current);
    
    drawRef.current.areaLabels.push(marker);
    return marker;
  };

  const createAreaLabelElement = (areaText: string) => {
    const el = document.createElement('div');
    el.className = 'area-label';
    el.innerHTML = `<strong>${areaText} m²</strong>`;
    el.style.backgroundColor = 'rgba(52, 152, 219, 0.8)';
    el.style.color = 'white';
    el.style.padding = '4px 8px';
    el.style.borderRadius = '4px';
    el.style.fontSize = '12px';
    return el;
  };

  const clearAreaLabels = () => {
    drawRef.current.areaLabels.forEach(marker => marker.remove());
    drawRef.current.areaLabels = [];
  };

  const updateAll = () => {
    updateAllPolygonLabels();
    updateAllAreaLabels();
  };

  const updateAllPolygonLabels = () => {
    if (!map.current || !drawRef.current.lengthLabelsSource) return;
    
    const allLabelFeatures: GeoJSON.Feature[] = [];
    
    drawnFeatures.forEach(feature => {
      if (feature.geometry.type === 'Polygon') {
        const coords = feature.geometry.coordinates[0];
        const labels = generateLengthLabels(coords as Position[]);
        allLabelFeatures.push(...labels.features);
      }
    });
    
    drawRef.current.lengthLabelsSource.setData({
      type: 'FeatureCollection',
      features: allLabelFeatures
    });
    
    if (drawMode === 'draw' && drawRef.current.tempLabelsSource && 
        drawRef.current.lastMousePosition && drawRef.current.currentPoints.length > 0) {
      const tempLabels = generateTempLengthLabels(
        drawRef.current.currentPoints,
        drawRef.current.lastMousePosition
      );
      drawRef.current.tempLabelsSource.setData(tempLabels);
    } else if (drawRef.current.tempLabelsSource) {
      drawRef.current.tempLabelsSource.setData({
        type: 'FeatureCollection',
        features: []
      });
    }
  };

  const updateAllAreaLabels = () => {
    clearAreaLabels();
    
    drawnFeatures.forEach(feature => {
      if (feature.geometry.type === 'Polygon' && feature.properties?.area) {
        const polygon = feature.geometry as GeoJSON.Polygon;
        const coordinates = polygon.coordinates[0];
        const center = turf.center(turf.polygon([coordinates])).geometry.coordinates;
        addAreaLabel(new mapboxgl.LngLat(center[0], center[1]), feature.properties.area);
      }
    });
  };

  const createEditMarkersForPolygon = (coordinates: Position[]) => {
    if (!map.current) return;

    clearEditMarkers();

    coordinates.forEach((coord, index) => {
      if (index === coordinates.length - 1 && 
          coordinates[0][0] === coord[0] && 
          coordinates[0][1] === coord[1]) {
        return;
      }

      const marker = new VertexMarker(coord, index);
      
      marker.addTo(map.current!);
      
      marker.on('dragend', () => {
        if (!selectedFeatureId) return;
        
        const newLngLat = marker.getLngLat();
        const vertexIndex = marker.getVertexIndex();
        
        const feature = drawnFeatures.find(f => f.id === selectedFeatureId);
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
        
        updateFeature(selectedFeatureId, updatedFeature);
        
        setMeasurementResults({ area, perimeter });
        
        updateAllPolygonLabels();
        updateAllAreaLabels();
        
        toast.success(`Polygon aktualisiert: ${area.toFixed(2)} m², Umfang: ${perimeter.toFixed(2)} m`);
      });
      
      drawRef.current.editMarkers.push(marker);
    });
  };

  const handleMapClickWrapper = (e: mapboxgl.MapMouseEvent) => {
    handleMapClick(e);
  };

  const handleRightClickWrapper = (e: mapboxgl.MapMouseEvent) => {
    handleRightClick(e);
  };

  const updateMeasurements = () => {
    updateAllPolygonLabels();
    updateAllAreaLabels();
  };

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
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: {
            version: 8,
            sources: {
              'raster-tiles': {
                type: 'raster',
                tiles: [
                  'https://www.wms.nrw.de/geobasis/wms_nw_dop?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=nw_dop_rgb&WIDTH=256&HEIGHT=256&CRS=EPSG:3857&STYLES=&BBOX={bbox-epsg-3857}'
                ],
                tileSize: 256,
                attribution: '© Geobasis NRW 2023'
              },
              'osm': {
                type: 'raster',
                tiles: [
                  'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
                ],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors'
              },
              'mapbox-satellite': {
                type: 'raster',
                tiles: [
                  'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=' + MAPBOX_TOKEN
                ],
                tileSize: 256,
                attribution: '© Mapbox © OpenStreetMap © DigitalGlobe'
              }
            },
            layers: [
              {
                id: 'simple-tiles',
                type: 'raster',
                source: 'osm',
                minzoom: 0,
                maxzoom: 15
              },
              {
                id: 'nrw-satellite-tiles',
                type: 'raster',
                source: 'raster-tiles',
                minzoom: 15,
                maxzoom: 22,
                layout: {
                  visibility: 'visible'
                }
              },
              {
                id: 'mapbox-satellite-tiles',
                type: 'raster',
                source: 'mapbox-satellite',
                minzoom: 15,
                maxzoom: 22,
                layout: {
                  visibility: 'none'
                }
              }
            ],
            glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
          },
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
          
          map.current?.addSource('length-labels', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
            }
          });
          
          map.current?.addSource('temp-labels', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: []
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
              'line-width': 4,
              'line-dasharray': [2, 2]
            }
          });

          map.current?.addLayer({
            id: 'current-polygon-layer',
            type: 'fill',
            source: 'current-polygon',
            paint: {
              'fill-color': '#e67e22',
              'fill-opacity': 0.2
            }
          });

          map.current?.addLayer({
            id: 'current-polygon-outline',
            type: 'line',
            source: 'current-polygon',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#e67e22',
              'line-width': 4,
              'line-opacity': 0.9
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
            id: 'saved-polygons-glow',
            type: 'line',
            source: 'saved-polygons',
            paint: {
              'line-color': '#000000',
              'line-width': 8,
              'line-opacity': 0.4,
              'line-blur': 3
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
              'fill-opacity': 0.4
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
                '#ffffff'
              ],
              'line-width': 3,
              'line-opacity': 1
            }
          });

          map.current?.addLayer({
            id: 'length-labels',
            type: 'symbol',
            source: 'length-labels',
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': '#000000',
              'text-halo-width': 4,
              'text-halo-blur': 1
            },
            layout: {
              'text-field': ['get', 'length'],
              'text-size': 16,
              'text-allow-overlap': true,
              'text-ignore-placement': true,
              'text-anchor': 'center',
              'text-letter-spacing': 0.05,
              'text-max-angle': 90,
              'text-rotate': ['get', 'bearing'],
              'symbol-placement': 'point',
              'text-font': ['Open Sans Regular']
            }
          });

          map.current?.addLayer({
            id: 'temp-labels',
            type: 'symbol',
            source: 'temp-labels',
            layout: {
              'text-field': ['get', 'length'],
              'text-size': 14,
              'text-anchor': 'center',
              'text-allow-overlap': true,
              'text-letter-spacing': 0.05,
              'text-font': ['Open Sans Regular'],
              'text-padding': 3,
              'text-rotate': ['get', 'bearing'],
              'symbol-placement': 'point'
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': '#e67e22',
              'text-halo-width': 2
            }
          });

          map.current?.on('click', 'saved-polygons-layer', (e) => {
            if (e.features && e.features.length > 0) {
              const featureId = e.features[0].properties?.id;
              setSelectedFeatureId(featureId || null);
              
              const feature = drawnFeatures.find(f => f.id === featureId);
              if (feature && feature.geometry.type === 'Polygon') {
                const area = feature.properties?.area || turf.area(feature);
                const polygon = feature.geometry as GeoJSON.Polygon;
                const perimeter = feature.properties?.perimeter || turf.length(turf.lineString(polygon.coordinates[0]), { units: 'meters' });
                
                setMeasurementResults({
                  area,
                  perimeter
                });
                
                toast.success(`Fläche: ${(area).toFixed(2)} m², Umfang: ${perimeter.toFixed(2)} m`);
                
                if (drawMode === 'edit') {
                  createEditMarkersForPolygon(polygon.coordinates[0] as Position[]);
                }
              }
            }
          });

          map.current.on('mousemove', (e) => {
            setHoverPoint(e.point);
            
            if (drawMode === 'draw' && drawRef.current.currentPoints.length > 0) {
              drawRef.current.lastMousePosition = [e.lngLat.lng, e.lngLat.lat];
              
              const snapResult = checkSnapToVertex(
                e.point, 
                map.current!, 
                drawRef.current.currentPoints, 
                drawRef.current.snapDistance, 
                false
              );
              
              if (snapResult.snapped) {
                map.current.getCanvas().style.cursor = 'pointer';
              } else {
                map.current.getCanvas().style.cursor = 'crosshair';
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

                  if (drawRef.current.currentPoints.length >= 2 && drawRef.current.currentPolygonSource) {
                    const tempPolygonCoords = [...drawRef.current.currentPoints, movePoint];
                    drawRef.current.currentPolygonSource.setData({
                      type: 'Feature',
                      properties: {},
                      geometry: {
                        type: 'Polygon',
                        coordinates: [positionsToCoordinates([...tempPolygonCoords, tempPolygonCoords[0]])]
                      }
                    });
                  }
                  
                  if (drawRef.current.tempLabelsSource) {
                    const tempLabels = generateTempLengthLabels(
                      drawRef.current.currentPoints,
                      movePoint
                    );
                    drawRef.current.tempLabelsSource.setData(tempLabels);
                  }
                  
                  updateAllPolygonLabels();
                }
              }
            }
          });

          drawRef.current.currentLineSource = map.current?.getSource('current-line') as mapboxgl.GeoJSONSource;
          drawRef.current.currentPolygonSource = map.current?.getSource('current-polygon') as mapboxgl.GeoJSONSource;
          drawRef.current.lengthLabelsSource = map.current?.getSource('length-labels') as mapboxgl.GeoJSONSource;
          drawRef.current.tempLabelsSource = map.current?.getSource('temp-labels') as mapboxgl.GeoJSONSource;

          setIsLoading(false);
          setMessage('Karte geladen. Sie können nun mit dem Zeichnen beginnen.');
          clearTimeout(loadTimeout);
          
          const updateLayerVisibility = () => {
            if (!map.current) return;
            
            const center = map.current.getCenter();
            const zoom = map.current.getZoom();
            const isInNRW = isWithinNRW(center.lng, center.lat);
            
            if (zoom >= 15) {
              if (isInNRW) {
                map.current.setLayoutProperty('nrw-satellite-tiles', 'visibility', 'visible');
                map.current.setLayoutProperty('mapbox-satellite-tiles', 'visibility', 'none');
                setMessage('');
              } else {
                map.current.setLayoutProperty('nrw-satellite-tiles', 'visibility', 'none');
                map.current.setLayoutProperty('mapbox-satellite-tiles', 'visibility', 'visible');
                
                if (!hasShownOutOfNRWWarningRef.current) {
                  toast.warning('Sie befinden sich außerhalb von Nordrhein-Westfalen. Es werden Mapbox-Satellitenbilder angezeigt.');
                  hasShownOutOfNRWWarningRef.current = true;
                }
                
                setMessage('Sie befinden sich außerhalb von NRW. Mapbox-Satellitenbilder werden angezeigt.');
              }
            } else {
              map.current.setLayoutProperty('nrw-satellite-tiles', 'visibility', 'none');
              map.current.setLayoutProperty('mapbox-satellite-tiles', 'visibility', 'none');
              setMessage('Bitte zoomen Sie näher heran, um die Satellitenbilder zu sehen.');
            }
            
            updateMeasurements();
          };
          
          map.current.on('moveend', updateLayerVisibility);
          
          updateLayerVisibility();
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

  useEffect(() => {
    if (!map.current || !coordinates) return;

    map.current.flyTo({
      center: coordinates,
      zoom: 18,
      essential: true
    });
  }, [coordinates]);

  useEffect(() => {
    if (!map.current) return;

    map.current.off('click', handleMapClickWrapper);
    map.current.off('contextmenu', handleRightClickWrapper);

    resetCurrentDraw();
    clearEditMarkers();
    clearAreaLabels();
    
    updateAllPolygonLabels();
    updateAllAreaLabels();

    map.current.getCanvas().style.cursor = '';

    if (drawMode === 'draw') {
      map.current.on('click', handleMapClickWrapper);
      map.current.on('contextmenu', handleRightClickWrapper);
      map.current.getCanvas().style.cursor = 'crosshair';
      setMessage('Klicken Sie auf die Karte, um Punkte hinzuzufügen. Rechtsklick oder Klicken auf den ersten Punkt zum Abschließen.');
    } else if (drawMode === 'edit') {
      map.current.getCanvas().style.cursor = 'default';
      setMessage('Klicken Sie auf ein Polygon um es zu bearbeiten. Ziehen Sie die Eckpunkte um das Polygon anzupassen.');
      
      if (selectedFeatureId) {
        const feature = drawnFeatures.find(f => f.id === selectedFeatureId);
        if (feature && feature.geometry.type === 'Polygon') {
          createEditMarkersForPolygon(feature.geometry.coordinates[0] as Position[]);
        }
      }
    } else {
      setMessage('');
    }
  }, [drawMode, selectedFeatureId, drawnFeatures]);

  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    try {
      const source = map.current.getSource('saved-polygons') as mapboxgl.GeoJSONSource;
      if (source) {
        const featureCollection: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: drawnFeatures.map(feature => ({
            ...feature,
            properties: {
              ...(feature.properties || {}),
              id: feature.id
            }
          }))
        };
        
        source.setData(featureCollection);
        
        if (map.current && map.current.isStyleLoaded()) {
          map.current.triggerRepaint();
        }
        
        updateAllPolygonLabels();
        updateAllAreaLabels();
      }
    } catch (error) {
      console.error('Error updating polygon source:', error);
      toast.error('Problem bei der Aktualisierung der Polygone');
    }
  }, [drawnFeatures, selectedFeatureId]);

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
    
    if (drawRef.current.tempLabelsSource) {
      drawRef.current.tempLabelsSource.setData({
        type: 'FeatureCollection',
        features: []
      });
    }
  };

  const checkSnapToFirst = (point: mapboxgl.Point): Position | null => {
    if (drawRef.current.currentPoints.length < 3) return null;

    const firstPoint = drawRef.current.currentPoints[0];
    if (!map.current || !firstPoint) return null;

    const firstPointPixel = map.current.project([firstPoint[0], firstPoint[1]]);
    const distance = Math.sqrt(
      Math.pow(firstPointPixel.x - point.x, 2) + 
      Math.pow(firstPointPixel.y - point.y, 2)
    );

    if (distance <= drawRef.current.snapDistance) {
      return firstPoint;
    }
    return null;
  };

  const completePolygon = () => {
    if (drawRef.current.currentPoints.length < 3) {
      toast.error('Ein Polygon benötigt mindestens 3 Punkte');
      return false;
    }

    try {
      const firstPoint = drawRef.current.currentPoints[0];
      const polygonCoords = [...drawRef.current.currentPoints, firstPoint];
      
      const { area, perimeter } = calculateMeasurements(polygonCoords);
      
      const polygonId = `polygon-${Date.now()}`;
      const polygonFeature = {
        type: 'Feature',
        id: polygonId,
        properties: {
          id: polygonId,
          area,
          perimeter,
          selected: true  // Add selected property
        },
        geometry: {
          type: 'Polygon',
          coordinates: [positionsToCoordinates(polygonCoords)]
        }
      } as GeoJSON.Feature;
      
      // Add feature before clearing drawing state
      addFeature(polygonFeature);
      
      // Update map source directly for immediate visibility
      const source = map.current?.getSource('saved-polygons') as mapboxgl.GeoJSONSource;
      if (source) {
        const currentFeatures = drawnFeatures.map(f => ({
          ...f,
          properties: {
            ...(f.properties || {}),
            id: f.id
          }
        }));
          
        source.setData({
          type: 'FeatureCollection',
          features: [...currentFeatures, polygonFeature]
        });
      }
        
      setSelectedFeatureId(polygonId);
      setMeasurementResults({ area, perimeter });
        
      toast.success(`Polygon erstellt: ${area.toFixed(2)} m², Umfang: ${perimeter.toFixed(2)} m`);
        
      // Clear drawing state after successful feature addition
      drawRef.current.currentMarkers.forEach(marker => marker.remove());
      drawRef.current.currentMarkers = [];
      drawRef.current.currentPoints = [];
        
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
        
      updateAllPolygonLabels();
      updateAllAreaLabels();
        
      return true;
    } catch (error) {
      console.error('Error completing polygon:', error);
      toast.error('Fehler beim Erstellen des Polygons');
      return false;
    }
  };

  const handleRightClick = (e: mapboxgl.MapMouseEvent) => {
    if (!map.current || drawMode !== 'draw') {
      return;
    }
    
    e.preventDefault();
    
    if (drawRef.current.currentPoints.length >= 3) {
      completePolygon();
    } else {
      toast.error('Ein Polygon benötigt mindestens 3 Punkte');
    }
  };

  const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
    if (!map.current || drawMode !== 'draw') return;

    const point = e.point;
    let coords: Position;
    
    const snapPoint = checkSnapToFirst(point);
    if (snapPoint && drawRef.current.currentPoints.length >= 3) {
      coords = snapPoint;
      completePolygon();
      return;
    } else {
      coords = [e.lngLat.lng, e.lngLat.lat];
    }

    drawRef.current.currentPoints.push(coords);

    const marker = new mapboxgl.Marker({ 
      color: '#e67e22', 
      scale: 0.7,
      draggable: false
    })
      .setLngLat(positionToLngLat(coords))
      .addTo(map.current);
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
      
      const { area, perimeter } = calculateMeasurements([...tempPolygonCoords, tempPolygonCoords[0]]);
      setMeasurementResults({ area, perimeter });
    }
    
    if (drawRef.current.lengthLabelsSource && drawRef.current.currentPoints.length >= 2) {
      updateAllPolygonLabels();
    }
  };

  return (
    <div className="relative h-full w-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 z-10">
          <div className="flex flex-col items-center gap-3 text-white">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-white"></div>
            <span>Karte wird geladen...</span>
          </div>
        </div>
      )}
      
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500 bg-opacity-20 z-10">
          <div className="bg-white p-4 rounded-md shadow-lg max-w-md">
            <h3 className="

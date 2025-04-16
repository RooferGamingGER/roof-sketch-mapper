
import { useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { toast } from 'sonner';

// NRW (North Rhine-Westphalia) boundaries
const nrwBounds = {
  north: 52.5314,
  south: 50.3230,
  east: 9.4623,
  west: 5.8663
};

export function useMapVisibility() {
  const hasShownOutOfNRWWarningRef = useRef(false);
  
  const isWithinNRW = useCallback((lng: number, lat: number): boolean => {
    return lat >= nrwBounds.south && 
          lat <= nrwBounds.north && 
          lng >= nrwBounds.west && 
          lng <= nrwBounds.east;
  }, []);

  const updateLayerVisibility = useCallback((map: mapboxgl.Map | null, updateMeasurements: () => void) => {
    if (!map) return;
    
    const center = map.getCenter();
    const zoom = map.getZoom();
    const isInNRW = isWithinNRW(center.lng, center.lat);
    
    if (zoom >= 15) {
      if (isInNRW) {
        map.setLayoutProperty('nrw-satellite-tiles', 'visibility', 'visible');
        map.setLayoutProperty('mapbox-satellite-tiles', 'visibility', 'none');
        return { message: '' };
      } else {
        map.setLayoutProperty('nrw-satellite-tiles', 'visibility', 'none');
        map.setLayoutProperty('mapbox-satellite-tiles', 'visibility', 'visible');
        
        if (!hasShownOutOfNRWWarningRef.current) {
          toast.warning('Sie befinden sich außerhalb von Nordrhein-Westfalen. Es werden Mapbox-Satellitenbilder angezeigt.');
          hasShownOutOfNRWWarningRef.current = true;
        }
        
        return { message: 'Sie befinden sich außerhalb von NRW. Mapbox-Satellitenbilder werden angezeigt.' };
      }
    } else {
      map.setLayoutProperty('nrw-satellite-tiles', 'visibility', 'none');
      map.setLayoutProperty('mapbox-satellite-tiles', 'visibility', 'none');
      return { message: 'Bitte zoomen Sie näher heran, um die Satellitenbilder zu sehen.' };
    }
  }, [isWithinNRW]);

  return {
    updateLayerVisibility
  };
}

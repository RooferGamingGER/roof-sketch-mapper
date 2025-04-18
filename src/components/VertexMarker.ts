import mapboxgl from 'mapbox-gl';
import { Position } from 'geojson';
import { positionToLngLat } from '../utils/mapUtils';

export class VertexMarker extends mapboxgl.Marker {
  private vertexIndex: number;
  
  constructor(lngLat: mapboxgl.LngLatLike | Position, vertexIndex: number) {
    const el = document.createElement('div');
    el.className = 'vertex-marker';
    el.style.width = '16px';
    el.style.height = '16px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#e67e22';
    el.style.border = '3px solid white';
    el.style.cursor = 'move';
    el.style.boxShadow = '0 0 0 2px rgba(0, 0, 0, 0.3), 0 4px 8px rgba(0, 0, 0, 0.4)';
    
    super({
      element: el,
      draggable: true,
      anchor: 'center'
    });
    
    if (Array.isArray(lngLat)) {
      this.setLngLat(positionToLngLat(lngLat));
    } else {
      this.setLngLat(lngLat);
    }
    
    this.vertexIndex = vertexIndex;
  }
  
  getVertexIndex(): number {
    return this.vertexIndex;
  }
}

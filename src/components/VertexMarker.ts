
import mapboxgl from 'mapbox-gl';
import { Position } from 'geojson';

export class VertexMarker extends mapboxgl.Marker {
  private vertexIndex: number;
  
  constructor(lngLat: mapboxgl.LngLatLike | Position, vertexIndex: number) {
    // Create a custom element for our vertex marker
    const el = document.createElement('div');
    el.className = 'vertex-marker';
    el.style.width = '12px';
    el.style.height = '12px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#f59e0b';
    el.style.border = '2px solid white';
    el.style.cursor = 'move';
    el.style.boxShadow = '0 0 0 1px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.2)';
    
    // Initialize the marker
    super({
      element: el,
      draggable: true,
      anchor: 'center'
    });
    
    // Handle Position type (GeoJSON) or LngLatLike
    if (Array.isArray(lngLat)) {
      this.setLngLat([lngLat[0], lngLat[1]]);
    } else {
      this.setLngLat(lngLat);
    }
    
    this.vertexIndex = vertexIndex;
  }
  
  getVertexIndex(): number {
    return this.vertexIndex;
  }
}


import * as turf from '@turf/turf';
import mapboxgl from 'mapbox-gl';
import { Position } from 'geojson';

// Convert GeoJSON Position to [number, number] tuple
export function positionToCoordinate(position: Position): [number, number] {
  return [position[0], position[1]];
}

// Convert array of GeoJSON Positions to array of [number, number] tuples
export function positionsToCoordinates(positions: Position[]): [number, number][] {
  return positions.map(pos => positionToCoordinate(pos));
}

// Calculate midpoint of a line segment for label placement
export function getMidpoint(point1: Position | [number, number], point2: Position | [number, number]): [number, number] {
  const p1 = Array.isArray(point1) ? [point1[0], point1[1]] : [point1[0], point1[1]];
  const p2 = Array.isArray(point2) ? [point2[0], point2[1]] : [point2[0], point2[1]];
  
  return [
    (p1[0] + p2[0]) / 2,
    (p1[1] + p2[1]) / 2
  ];
}

// Calculate distance between two points in meters
export function getDistance(point1: Position | [number, number], point2: Position | [number, number]): number {
  const p1 = Array.isArray(point1) ? point1.slice(0, 2) as [number, number] : point1;
  const p2 = Array.isArray(point2) ? point2.slice(0, 2) as [number, number] : point2;
  
  const from = turf.point(p1);
  const to = turf.point(p2);
  return turf.distance(from, to, { units: 'meters' });
}

// Calculate bearing between two points for label rotation
export function getBearing(point1: Position | [number, number], point2: Position | [number, number]): number {
  const p1 = Array.isArray(point1) ? point1.slice(0, 2) as [number, number] : point1;
  const p2 = Array.isArray(point2) ? point2.slice(0, 2) as [number, number] : point2;
  
  const from = turf.point(p1);
  const to = turf.point(p2);
  return turf.bearing(from, to);
}

// Generate GeoJSON for line segment labels - now always horizontal to camera
export function generateLengthLabels(coordinates: Position[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  
  if (coordinates.length < 2) return { type: 'FeatureCollection', features };
  
  // Ensure we have a closed polygon
  const closedCoords = [...coordinates];
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  
  if (first[0] !== last[0] || first[1] !== last[1]) {
    closedCoords.push(first);
  }
  
  // Create a label for each segment
  for (let i = 0; i < closedCoords.length - 1; i++) {
    const start = closedCoords[i];
    const end = closedCoords[i + 1];
    const midpoint = getMidpoint(start, end);
    const distance = getDistance(start, end);
    
    // No rotation for camera-aligned text
    features.push({
      type: 'Feature',
      properties: {
        length: distance.toFixed(1),
        index: i
      },
      geometry: {
        type: 'Point',
        coordinates: midpoint
      }
    });
  }
  
  return {
    type: 'FeatureCollection',
    features
  };
}

// Calculate area and perimeter for a polygon
export function calculateMeasurements(coordinates: Position[]): { area: number, perimeter: number } {
  if (coordinates.length < 3) {
    return { area: 0, perimeter: 0 };
  }
  
  // Ensure we have a closed polygon
  const closedCoords = [...coordinates];
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  
  if (first[0] !== last[0] || first[1] !== last[1]) {
    closedCoords.push(first);
  }
  
  const polygon = turf.polygon([positionsToCoordinates(closedCoords)]);
  const area = turf.area(polygon);
  const line = turf.lineString(positionsToCoordinates(closedCoords));
  const perimeter = turf.length(line, { units: 'meters' });
  
  return { area, perimeter };
}

// Neue Funktion zum Prüfen des Punktfangs bei Polygonen
export function checkSnapToVertex(
  point: mapboxgl.Point, 
  mapInstance: mapboxgl.Map,
  vertices: Position[],
  snapDistance: number = 10,
  skipLastIndex: boolean = false
): { snapped: boolean; position: Position | null; index: number } {
  if (!vertices.length) {
    return { snapped: false, position: null, index: -1 };
  }

  let closestDistance = Infinity;
  let closestPoint: Position | null = null;
  let closestIndex = -1;

  // Prüft Punktfang für jeden Vertex im Polygon (außer dem letzten, falls gewünscht)
  const endIndex = skipLastIndex ? vertices.length - 1 : vertices.length;
  
  for (let i = 0; i < endIndex; i++) {
    const vertex = vertices[i];
    const vertexPixel = mapInstance.project([vertex[0], vertex[1]]);
    const distance = Math.sqrt(
      Math.pow(vertexPixel.x - point.x, 2) + 
      Math.pow(vertexPixel.y - point.y, 2)
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closestPoint = vertex;
      closestIndex = i;
    }
  }

  if (closestDistance <= snapDistance && closestPoint) {
    return { snapped: true, position: closestPoint, index: closestIndex };
  }

  return { snapped: false, position: null, index: -1 };
}

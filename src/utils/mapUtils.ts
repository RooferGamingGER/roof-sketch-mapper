
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

// Generate GeoJSON for line segment labels
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
    const bearing = getBearing(start, end);
    
    // Adjust bearing for label readability
    const adjustedBearing = bearing > 90 || bearing < -90 
      ? bearing + 180 
      : bearing;
    
    features.push({
      type: 'Feature',
      properties: {
        length: distance.toFixed(1),
        bearing: adjustedBearing,
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
  
  const polygon = turf.polygon([closedCoords]);
  const area = turf.area(polygon);
  const line = turf.lineString(closedCoords);
  const perimeter = turf.length(line, { units: 'meters' });
  
  return { area, perimeter };
}


import * as turf from '@turf/turf';
import mapboxgl from 'mapbox-gl';

// Calculate midpoint of a line segment for label placement
export function getMidpoint(point1: [number, number], point2: [number, number]): [number, number] {
  return [
    (point1[0] + point2[0]) / 2,
    (point1[1] + point2[1]) / 2
  ];
}

// Calculate distance between two points in meters
export function getDistance(point1: [number, number], point2: [number, number]): number {
  const from = turf.point(point1);
  const to = turf.point(point2);
  return turf.distance(from, to, { units: 'meters' });
}

// Calculate bearing between two points for label rotation
export function getBearing(point1: [number, number], point2: [number, number]): number {
  const from = turf.point(point1);
  const to = turf.point(point2);
  return turf.bearing(from, to);
}

// Generate GeoJSON for line segment labels
export function generateLengthLabels(coordinates: [number, number][]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  
  if (coordinates.length < 2) return { type: 'FeatureCollection', features };
  
  // Ensure we have a closed polygon
  const closedCoords = [...coordinates];
  if (coordinates[0][0] !== coordinates[coordinates.length - 1][0] || 
      coordinates[0][1] !== coordinates[coordinates.length - 1][1]) {
    closedCoords.push(coordinates[0]);
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
export function calculateMeasurements(coordinates: [number, number][]): { area: number, perimeter: number } {
  if (coordinates.length < 3) {
    return { area: 0, perimeter: 0 };
  }
  
  // Ensure we have a closed polygon
  const closedCoords = [...coordinates];
  if (coordinates[0][0] !== coordinates[coordinates.length - 1][0] || 
      coordinates[0][1] !== coordinates[coordinates.length - 1][1]) {
    closedCoords.push(coordinates[0]);
  }
  
  const polygon = turf.polygon([closedCoords]);
  const area = turf.area(polygon);
  const line = turf.lineString(closedCoords);
  const perimeter = turf.length(line, { units: 'meters' });
  
  return { area, perimeter };
}

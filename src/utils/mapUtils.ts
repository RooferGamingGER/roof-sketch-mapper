import * as turf from '@turf/turf';
import mapboxgl from 'mapbox-gl';
import { Position } from 'geojson';

// Convert GeoJSON Position to [number, number] tuple
export function positionToCoordinate(position: Position): [number, number] {
  return [position[0], position[1]];
}

// Convert position to LngLatLike for mapbox
export function positionToLngLat(position: Position): mapboxgl.LngLatLike {
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

// Generate GeoJSON for line segment labels - enhanced for clear visibility
export function generateLengthLabels(coordinates: Position[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  
  if (coordinates.length < 2) return { type: 'FeatureCollection', features };
  
  // Create a label for each segment
  for (let i = 0; i < coordinates.length - 1; i++) {
    const start = coordinates[i];
    const end = coordinates[i + 1];
    const distance = getDistance(start, end);
    
    // Skip labels for segments that are effectively 0 meters
    if (distance < 0.1) continue;
    
    const midpoint = getMidpoint(start, end);
    const bearing = getBearing(start, end);
    
    features.push({
      type: 'Feature',
      properties: {
        length: `${distance.toFixed(1)} m`,
        index: i,
        bearing: bearing
      },
      geometry: {
        type: 'Point',
        coordinates: midpoint
      }
    });
  }
  
  // If it's a closed polygon, add label for the closing segment
  if (coordinates.length > 2) {
    // Check if the last coordinate is identical to the first (closed polygon)
    const firstPoint = coordinates[0];
    const lastPoint = coordinates[coordinates.length - 1];
    const isClosedPolygon = firstPoint[0] === lastPoint[0] && firstPoint[1] === lastPoint[1];
    
    if (isClosedPolygon) {
      // The segment between the second-to-last and first point (skipping duplicate at the end)
      const start = coordinates[coordinates.length - 2];
      const end = coordinates[0];
      const distance = getDistance(start, end);
      
      if (distance >= 0.1) {
        const midpoint = getMidpoint(start, end);
        const bearing = getBearing(start, end);
        
        features.push({
          type: 'Feature',
          properties: {
            length: `${distance.toFixed(1)} m`,
            index: coordinates.length - 1,
            bearing: bearing
          },
          geometry: {
            type: 'Point',
            coordinates: midpoint
          }
        });
      }
    }
  }
  
  return {
    type: 'FeatureCollection',
    features
  };
}

// Generate separate GeoJSON for temporary line labels during drawing
export function generateTempLengthLabels(coordinates: Position[], movePoint: Position | null): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  
  if (coordinates.length < 1 || !movePoint) return { type: 'FeatureCollection', features };
  
  // Create a label for the temporary segment
  const start = coordinates[coordinates.length - 1];
  const end = movePoint;
  const distance = getDistance(start, end);
  
  // Skip labels for segments that are effectively 0 meters
  if (distance < 0.1) return { type: 'FeatureCollection', features };
  
  const midpoint = getMidpoint(start, end);
  
  features.push({
    type: 'Feature',
    properties: {
      length: `${distance.toFixed(1)} m`,
      index: coordinates.length - 1,
      bearing: getBearing(start, end),
      temporary: true
    },
    geometry: {
      type: 'Point',
      coordinates: midpoint
    }
  });
  
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

// Function to check if a point is close to a vertex for snapping
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

  // Check snapping for each vertex in the polygon (except the last one, if requested)
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

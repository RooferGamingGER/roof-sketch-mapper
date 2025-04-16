
import mapboxgl from 'mapbox-gl';

export function setupMapLayers(map: mapboxgl.Map): { 
  currentLineSource: mapboxgl.GeoJSONSource; 
  currentPolygonSource: mapboxgl.GeoJSONSource;
  lengthLabelsSource: mapboxgl.GeoJSONSource;
} {
  // Add sources
  map.addSource('current-line', {
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

  map.addSource('current-polygon', {
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
  
  map.addSource('length-labels', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  });
  
  map.addSource('saved-polygons', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  });

  // Add layers
  map.addLayer({
    id: 'current-line-layer',
    type: 'line',
    source: 'current-line',
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#e67e22',
      'line-width': 2.5,
      'line-dasharray': [2, 1]
    }
  });

  map.addLayer({
    id: 'current-polygon-layer',
    type: 'fill',
    source: 'current-polygon',
    paint: {
      'fill-color': '#e67e22',
      'fill-opacity': 0.3
    }
  });

  map.addLayer({
    id: 'current-polygon-outline',
    type: 'line',
    source: 'current-polygon',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#e67e22',
      'line-width': 2.5
    }
  });

  map.addLayer({
    id: 'saved-polygons-layer',
    type: 'fill',
    source: 'saved-polygons',
    paint: {
      'fill-color': [
        'case',
        ['boolean', ['==', ['get', 'id'], ''], false],
        '#3498db',
        '#1a365d'
      ],
      'fill-opacity': 0.5
    }
  });

  map.addLayer({
    id: 'saved-polygons-outline',
    type: 'line',
    source: 'saved-polygons',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': [
        'case',
        ['boolean', ['==', ['get', 'id'], ''], false],
        '#3498db',
        '#1a365d'
      ],
      'line-width': 2.5
    }
  });
  
  map.addLayer({
    id: 'length-labels',
    type: 'symbol',
    source: 'length-labels',
    layout: {
      'text-field': ['get', 'length'],
      'text-size': 12,
      'text-anchor': 'center',
      'text-allow-overlap': true,
      'text-letter-spacing': 0.05,
      'text-font': ['Open Sans Regular'],
      'text-padding': 3
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#3498db',
      'text-halo-width': 1.5
    }
  });

  return {
    currentLineSource: map.getSource('current-line') as mapboxgl.GeoJSONSource,
    currentPolygonSource: map.getSource('current-polygon') as mapboxgl.GeoJSONSource,
    lengthLabelsSource: map.getSource('length-labels') as mapboxgl.GeoJSONSource
  };
}

export function updateSavedPolygonsLayer(map: mapboxgl.Map, features: GeoJSON.Feature[], selectedFeatureId: string | null) {
  const source = map.getSource('saved-polygons') as mapboxgl.GeoJSONSource;
  if (source) {
    source.setData({
      type: 'FeatureCollection',
      features
    });
  }
  
  // Update the conditional styling for selection
  map.setPaintProperty('saved-polygons-layer', 'fill-color', [
    'case',
    ['boolean', ['==', ['get', 'id'], selectedFeatureId || ''], false],
    '#3498db',
    '#1a365d'
  ]);
  
  map.setPaintProperty('saved-polygons-outline', 'line-color', [
    'case',
    ['boolean', ['==', ['get', 'id'], selectedFeatureId || ''], false],
    '#3498db',
    '#1a365d'
  ]);
}

export const mapStyle = {
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
        'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=' + '{token}'
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
};

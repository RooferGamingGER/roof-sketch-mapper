
import React, { createContext, useState, useContext, ReactNode } from 'react';
import * as turf from '@turf/turf';

export type DrawMode = 'draw' | 'edit' | 'delete' | 'measure' | null;
export type MapFeature = GeoJSON.Feature;

interface MapContextType {
  mapboxToken: string;
  setMapboxToken: (token: string) => void;
  drawMode: DrawMode;
  setDrawMode: (mode: DrawMode) => void;
  selectedAddress: string | null;
  setSelectedAddress: (address: string | null) => void;
  coordinates: [number, number] | null;
  setCoordinates: (coordinates: [number, number] | null) => void;
  drawnFeatures: MapFeature[];
  addFeature: (feature: MapFeature) => void;
  updateFeature: (id: string, feature: MapFeature) => void;
  deleteFeature: (id: string) => void;
  selectedFeatureId: string | null;
  setSelectedFeatureId: (id: string | null) => void;
  measurementResults: {
    area: number | null;
    perimeter: number | null;
  };
  setMeasurementResults: (results: { area: number | null; perimeter: number | null }) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [drawMode, setDrawMode] = useState<DrawMode>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [drawnFeatures, setDrawnFeatures] = useState<MapFeature[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [measurementResults, setMeasurementResults] = useState<{ area: number | null; perimeter: number | null }>({
    area: null,
    perimeter: null,
  });

  const addFeature = (feature: MapFeature) => {
    setDrawnFeatures((prev) => [...prev, feature]);
  };

  const updateFeature = (id: string, feature: MapFeature) => {
    setDrawnFeatures((prev) => prev.map((f) => (f.id === id ? feature : f)));
  };

  const deleteFeature = (id: string) => {
    setDrawnFeatures((prev) => prev.filter((f) => f.id !== id));
    if (selectedFeatureId === id) {
      setSelectedFeatureId(null);
    }
  };

  return (
    <MapContext.Provider
      value={{
        mapboxToken,
        setMapboxToken,
        drawMode,
        setDrawMode,
        selectedAddress,
        setSelectedAddress,
        coordinates,
        setCoordinates,
        drawnFeatures,
        addFeature,
        updateFeature,
        deleteFeature,
        selectedFeatureId,
        setSelectedFeatureId,
        measurementResults,
        setMeasurementResults,
      }}
    >
      {children}
    </MapContext.Provider>
  );
};

export const useMapContext = (): MapContextType => {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
};

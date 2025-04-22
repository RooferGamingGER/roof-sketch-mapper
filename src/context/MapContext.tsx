
import React, { createContext, useState, useContext, ReactNode } from 'react';
import * as turf from '@turf/turf';
import { MAPBOX_TOKEN } from '../config/mapbox';

export type DrawMode = 'draw' | 'edit' | 'delete' | null;
export type MapFeature = GeoJSON.Feature;

interface Measurement {
  id: string;
  area: number;
  perimeter: number;
}

interface MapContextType {
  mapboxToken: string;
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
  deleteAllFeatures: () => void;
  selectedFeatureId: string | null;
  setSelectedFeatureId: (id: string | null) => void;
  measurementResults: {
    area: number | null;
    perimeter: number | null;
  };
  setMeasurementResults: (results: { area: number | null; perimeter: number | null }) => void;
  allMeasurements: Measurement[];
  addMeasurement: (id: string, area: number, perimeter: number) => void;
  updateMeasurement: (id: string, area: number, perimeter: number) => void;
  deleteMeasurement: (id: string) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const mapboxToken = MAPBOX_TOKEN;
  
  const [drawMode, setDrawMode] = useState<DrawMode>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [drawnFeatures, setDrawnFeatures] = useState<MapFeature[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [measurementResults, setMeasurementResults] = useState<{ area: number | null; perimeter: number | null }>({
    area: null,
    perimeter: null,
  });
  const [allMeasurements, setAllMeasurements] = useState<Measurement[]>([]);

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
      setMeasurementResults({ area: null, perimeter: null });
    }
    deleteMeasurement(id);
  };
  
  const deleteAllFeatures = () => {
    setDrawnFeatures([]);
    setSelectedFeatureId(null);
    setMeasurementResults({ area: null, perimeter: null });
    setAllMeasurements([]);
    
    // Force redraw by temporarily changing draw mode
    setDrawMode(prevMode => {
      if (prevMode !== null) {
        const currentMode = prevMode;
        setTimeout(() => setDrawMode(currentMode), 50);
        return null;
      }
      return prevMode;
    });
  };

  const addMeasurement = (id: string, area: number, perimeter: number) => {
    setAllMeasurements(prev => {
      // Check if measurement already exists to avoid duplicates
      const exists = prev.some(m => m.id === id);
      if (exists) return prev;
      return [...prev, { id, area, perimeter }];
    });
  };

  const updateMeasurement = (id: string, area: number, perimeter: number) => {
    setAllMeasurements(prev => prev.map(m => 
      m.id === id ? { ...m, area, perimeter } : m
    ));
  };

  const deleteMeasurement = (id: string) => {
    setAllMeasurements(prev => prev.filter(m => m.id !== id));
  };

  return (
    <MapContext.Provider
      value={{
        mapboxToken,
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
        deleteAllFeatures,
        selectedFeatureId,
        setSelectedFeatureId,
        measurementResults,
        setMeasurementResults,
        allMeasurements,
        addMeasurement,
        updateMeasurement,
        deleteMeasurement,
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

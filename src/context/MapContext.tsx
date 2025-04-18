
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
  mapboxToken: string;  // We keep this for compatibility
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
  // We're now using the constant token instead of state
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
    // Force redraw by setting draw mode to null
    setDrawMode(prevMode => {
      if (prevMode !== null) {
        // If we were in a draw mode, temporarily set to null to force redraw
        const currentMode = prevMode;
        setTimeout(() => setDrawMode(currentMode), 50);
        return null;
      }
      return prevMode;
    });
  };

  // Functions for managing measurements
  const addMeasurement = (id: string, area: number, perimeter: number) => {
    setAllMeasurements(prev => [...prev, { id, area, perimeter }]);
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

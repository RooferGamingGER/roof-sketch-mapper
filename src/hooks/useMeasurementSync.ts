
import { useEffect } from 'react';
import { useMapContext } from '@/context/MapContext';
import { calculateMeasurements } from '@/utils/mapUtils';

export const useMeasurementSync = () => {
  const { 
    drawnFeatures, 
    addMeasurement, 
    updateMeasurement, 
    allMeasurements 
  } = useMapContext();

  // Sync measurements with drawn features
  useEffect(() => {
    const syncMeasurements = () => {
      // Process each feature and update/add measurements
      drawnFeatures.forEach(feature => {
        const id = feature.id as string;
        
        // Only process polygon features with valid coordinates
        if (
          feature.geometry.type === 'Polygon' && 
          feature.geometry.coordinates && 
          feature.geometry.coordinates[0]
        ) {
          const coordinates = feature.geometry.coordinates[0];
          
          // Calculate area and perimeter
          const { area, perimeter } = calculateMeasurements(coordinates);
          
          // Check if this measurement already exists
          const existingMeasurement = allMeasurements.find(m => m.id === id);
          
          if (existingMeasurement) {
            // Update existing measurement
            updateMeasurement(id, area, perimeter);
          } else {
            // Add new measurement
            addMeasurement(id, area, perimeter);
          }
        }
      });
    };
    
    syncMeasurements();
  }, [drawnFeatures, addMeasurement, updateMeasurement, allMeasurements]);
  
  return null;
};


import { useEffect } from 'react';
import { useMapContext } from '@/context/MapContext';
import { calculateMeasurements } from '@/utils/mapUtils';

export const useMeasurementSync = () => {
  const { 
    drawnFeatures, 
    addMeasurement, 
    updateMeasurement, 
    allMeasurements,
    deleteMeasurement,
    updateFeature,
    selectedFeatureId
  } = useMapContext();

  useEffect(() => {
    const syncMeasurements = () => {
      try {
        // Create a set of current feature IDs for faster lookup
        const currentFeatureIds = new Set(drawnFeatures.map(f => f.id as string));
        const currentMeasurementIds = new Set(allMeasurements.map(m => m.id));
        
        // Remove measurements that no longer have a corresponding feature
        allMeasurements.forEach(measurement => {
          if (!currentFeatureIds.has(measurement.id)) {
            deleteMeasurement(measurement.id);
          }
        });
        
        // Process each feature and update/add measurements
        drawnFeatures.forEach(feature => {
          const id = feature.id as string;
          
          // Only process polygon features with valid coordinates
          if (
            feature.geometry.type === 'Polygon' && 
            feature.geometry.coordinates && 
            feature.geometry.coordinates[0] && 
            feature.geometry.coordinates[0].length >= 3
          ) {
            const coordinates = feature.geometry.coordinates[0];
            const { area, perimeter } = calculateMeasurements(coordinates);
            
            // Force update if this is the selected feature to ensure UI sync
            const shouldForceUpdate = id === selectedFeatureId;
            
            // Check if measurement exists
            const existingMeasurementIndex = allMeasurements.findIndex(m => m.id === id);
            
            if (existingMeasurementIndex !== -1) {
              const existingMeasurement = allMeasurements[existingMeasurementIndex];
              if (shouldForceUpdate ||
                  Math.abs(existingMeasurement.area - area) > 0.001 || 
                  Math.abs(existingMeasurement.perimeter - perimeter) > 0.001) {
                updateMeasurement(id, area, perimeter);
              }
            } else {
              // Add new measurement
              addMeasurement(id, area, perimeter);
            }
            
            // Always ensure feature properties are up-to-date
            if (!feature.properties || 
                !feature.properties.area || 
                !feature.properties.perimeter ||
                shouldForceUpdate ||
                Math.abs(feature.properties.area - area) > 0.001 || 
                Math.abs(feature.properties.perimeter - perimeter) > 0.001) {
              
              const updatedFeature = {
                ...feature,
                properties: {
                  ...(feature.properties || {}),
                  area,
                  perimeter
                }
              };
              
              updateFeature(id, updatedFeature);
            }
          }
        });
      } catch (error) {
        console.error('Error synchronizing measurements:', error);
      }
    };
    
    syncMeasurements();
  }, [drawnFeatures, addMeasurement, updateMeasurement, deleteMeasurement, allMeasurements, updateFeature, selectedFeatureId]);
};

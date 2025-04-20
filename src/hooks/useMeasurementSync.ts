
import { useEffect } from 'react';
import { useMapContext } from '@/context/MapContext';
import { calculateMeasurements } from '@/utils/mapUtils';

export const useMeasurementSync = () => {
  const { 
    drawnFeatures, 
    addMeasurement, 
    updateMeasurement, 
    allMeasurements,
    deleteMeasurement
  } = useMapContext();

  // Sync measurements with drawn features
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
            
            // Store calculated values
            let shouldUpdate = false;
            
            if (currentMeasurementIds.has(id)) {
              // Update existing measurement if values changed
              const existingMeasurement = allMeasurements.find(m => m.id === id);
              if (existingMeasurement && 
                  (existingMeasurement.area !== area || 
                   existingMeasurement.perimeter !== perimeter)) {
                updateMeasurement(id, area, perimeter);
                shouldUpdate = true;
              }
            } else {
              // Add new measurement
              addMeasurement(id, area, perimeter);
              shouldUpdate = true;
            }
            
            // Make sure the feature itself has the correct properties
            if (shouldUpdate && (!feature.properties?.area || feature.properties?.area !== area || 
                !feature.properties?.perimeter || feature.properties?.perimeter !== perimeter)) {
              // Note: this doesn't trigger a render since we're not using the updateFeature function
              // This just ensures the GeoJSON has the correct properties
              feature.properties = {
                ...feature.properties,
                area,
                perimeter
              };
            }
          }
        });
      } catch (error) {
        console.error('Error synchronizing measurements:', error);
      }
    };
    
    syncMeasurements();
  }, [drawnFeatures, addMeasurement, updateMeasurement, deleteMeasurement, allMeasurements]);
};

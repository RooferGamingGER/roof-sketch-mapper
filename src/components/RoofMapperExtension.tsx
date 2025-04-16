
import React from 'react';
import { useMeasurementSync } from '@/hooks/useMeasurementSync';

// This component doesn't render anything - it just adds measurement syncing functionality
const RoofMapperExtension = () => {
  // Use the hook to sync measurements with drawn features
  useMeasurementSync();
  
  return null;
};

export default RoofMapperExtension;

import React, { ReactNode, useEffect } from 'react';
import { MapProvider as OriginalMapProvider } from './MapContext';
import { useMeasurementSync } from '@/hooks/useMeasurementSync';

interface MapProviderProps {
  children: ReactNode;
}

// This component wraps around the actual map provider and adds some hooks
const MapProviderWithHooks = ({ children }: MapProviderProps) => {
  // Use the measurement sync hook to keep measurements updated
  useMeasurementSync();
  
  return <>{children}</>;
};

export const MapProvider = ({ children }: MapProviderProps) => {
  return (
    <OriginalMapProvider>
      <MapProviderWithHooks>
        {children}
      </MapProviderWithHooks>
    </OriginalMapProvider>
  );
};

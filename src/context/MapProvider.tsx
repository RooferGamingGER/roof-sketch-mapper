
import React, { ReactNode } from 'react';
import { MapProvider as OriginalMapProvider } from './MapContext';
import RoofMapperExtension from '@/components/RoofMapperExtension';

interface MapProviderProps {
  children: ReactNode;
}

export const MapProvider = ({ children }: MapProviderProps) => {
  return (
    <OriginalMapProvider>
      <RoofMapperExtension />
      {children}
    </OriginalMapProvider>
  );
};

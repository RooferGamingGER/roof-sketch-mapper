
import React from 'react';

interface MapControlsProps {
  message: string;
  isLoading: boolean;
  mapError: string | null;
  coordinates: [number, number] | null;
  onReload: () => void;
}

const MapControls: React.FC<MapControlsProps> = ({ 
  message, 
  isLoading, 
  mapError, 
  coordinates,
  onReload
}) => {
  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-primary font-medium">Karte wird geladen...</p>
          </div>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 p-6">
          <div className="text-center max-w-md">
            <p className="text-destructive font-medium">{mapError}</p>
            <button 
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 text-sm"
              onClick={onReload}
            >
              Seite neu laden
            </button>
          </div>
        </div>
      )}

      {!isLoading && !coordinates && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 p-6">
          <div className="text-center max-w-md">
            <p className="text-dach-primary font-medium">Bitte suchen Sie eine Adresse, um mit der Kartendarstellung zu beginnen.</p>
          </div>
        </div>
      )}

      {message && !isLoading && !mapError && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 px-4 py-2 bg-white/90 rounded-md shadow-md text-sm font-medium text-gray-800 pointer-events-none">
          {message}
        </div>
      )}
      
      <div className="absolute bottom-0 right-0 z-10 text-xs text-white bg-black/50 px-2 py-1">
        © Geobasis NRW 2023 | © Mapbox
      </div>
    </>
  );
};

export default MapControls;

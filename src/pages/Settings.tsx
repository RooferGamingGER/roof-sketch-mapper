
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { MapPin, Globe } from 'lucide-react';
import { useMapContext } from '@/context/MapContext';

const Settings = () => {
  const navigate = useNavigate();
  const { setCoordinates, setSelectedAddress } = useMapContext();
  
  // Sample coordinates
  const sampleLocations = [
    {
      name: 'Düsseldorf',
      description: 'NRW - Satellitenbilder verfügbar',
      coordinates: [6.7728, 51.2277] as [number, number],
      isNRW: true
    },
    {
      name: 'Dortmund',
      description: 'NRW - Satellitenbilder verfügbar',
      coordinates: [7.4652, 51.5135] as [number, number],
      isNRW: true
    },
    {
      name: 'Berlin',
      description: 'Außerhalb NRW - Satellitenbilder über Mapbox',
      coordinates: [13.3888, 52.5170] as [number, number],
      isNRW: false
    },
    {
      name: 'Paris',
      description: 'Außerhalb NRW - Satellitenbilder über Mapbox',
      coordinates: [2.3522, 48.8566] as [number, number],
      isNRW: false
    }
  ];

  const handleLocationSelect = (location: typeof sampleLocations[0]) => {
    setCoordinates(location.coordinates);
    setSelectedAddress(location.name);
    navigate('/');
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-dach-primary text-white p-4 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Einstellungen</h1>
          <p className="text-sm opacity-90">Dach-Sketch Mapper NRW</p>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto py-8 px-4">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test-Standorte</CardTitle>
            <CardDescription>
              Wählen Sie einen Standort aus, um die Kartenansicht zu testen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sampleLocations.map((location) => (
                <Button
                  key={location.name}
                  variant="outline"
                  className="h-auto p-4 justify-start"
                  onClick={() => handleLocationSelect(location)}
                >
                  <div className="flex items-start gap-3">
                    {location.isNRW ? (
                      <MapPin className="h-5 w-5 text-dach-primary shrink-0" />
                    ) : (
                      <Globe className="h-5 w-5 text-blue-500 shrink-0" />
                    )}
                    <div className="text-left">
                      <div className="font-medium">{location.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{location.description}</div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Über die Satellitenbilder</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Für Gebiete innerhalb von Nordrhein-Westfalen werden hochauflösende Satellitenbilder von Geobasis NRW verwendet.
              Für Gebiete außerhalb von NRW werden Satellitenbilder von Mapbox verwendet. Die Auflösung und Aktualität
              der Bilder kann variieren.
            </p>
            <div className="mt-4">
              <Button onClick={() => navigate('/')} variant="default">
                Zurück zur Karte
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      
      <footer className="bg-dach-primary text-white p-4 mt-auto">
        <div className="container mx-auto text-sm opacity-70 text-center">
          © {new Date().getFullYear()} Dach-Sketch Mapper NRW | Nutzt Geodaten von Geobasis NRW und Mapbox
        </div>
      </footer>
    </div>
  );
};

export default Settings;

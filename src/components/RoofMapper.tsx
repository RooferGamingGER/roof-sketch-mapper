
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Map from '@/components/Map';
import AddressSearch from '@/components/AddressSearch';
import DrawingToolbar from '@/components/DrawingToolbar';
import { MapProvider } from '@/context/MapContext';
import { Separator } from "@/components/ui/separator";

const RoofMapper: React.FC = () => {
  return (
    <MapProvider>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Dach-Flächen Mapper</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <AddressSearch />
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 order-2 lg:order-1">
                  <DrawingToolbar />
                </div>
                
                <div className="lg:col-span-3 h-[500px] order-1 lg:order-2">
                  <Map />
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div>
                <h3 className="text-sm font-medium mb-2">Über diese App</h3>
                <p className="text-sm text-muted-foreground">
                  Mit dieser App können Dachdecker Dächer auf einer Karte markieren und vermessen.
                  Zeichnen Sie Polygone, um Dachflächen zu markieren und deren Fläche und Umfang zu berechnen.
                  Satellitenbilder werden vom Geoportal NRW bereitgestellt und sind nur für Nordrhein-Westfalen verfügbar.
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Version</h3>
                <p className="text-sm text-muted-foreground">
                  Dach-Sketch Mapper v1.0.0
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MapProvider>
  );
};

export default RoofMapper;

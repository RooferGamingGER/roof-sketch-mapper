
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Map from '@/components/Map';
import AddressSearch from '@/components/AddressSearch';
import DrawingToolbar from '@/components/DrawingToolbar';
import TokenInput from '@/components/TokenInput';
import { MapProvider } from '@/context/MapContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
            <Tabs defaultValue="map" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="map">Karte & Zeichnen</TabsTrigger>
                <TabsTrigger value="settings">Einstellungen</TabsTrigger>
              </TabsList>
              
              <TabsContent value="map" className="space-y-4">
                <AddressSearch />
                
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-1 order-2 lg:order-1">
                    <DrawingToolbar />
                  </div>
                  
                  <div className="lg:col-span-3 h-[500px] order-1 lg:order-2">
                    <Map />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="settings">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Mapbox-Konfiguration</h3>
                    <TokenInput />
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Über diese App</h3>
                    <p className="text-sm text-muted-foreground">
                      Mit dieser App können Dachdecker Dächer auf einer Karte markieren und vermessen.
                      Zeichnen Sie Polygone, um Dachflächen zu markieren und deren Fläche und Umfang zu berechnen.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MapProvider>
  );
};

export default RoofMapper;

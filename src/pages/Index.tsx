
import React from 'react';
import RoofMapper from '@/components/RoofMapper';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-dach-primary text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Dach-Sketch Mapper NRW</h1>
            <p className="text-sm opacity-90">Dachvermessung für Nordrhein-Westfalen</p>
          </div>
          <Link to="/settings">
            <Button variant="ghost" className="text-white hover:bg-white/20">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Einstellungen</span>
            </Button>
          </Link>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto py-8 px-4">
        <RoofMapper />
      </main>
      
      <footer className="bg-dach-primary text-white p-4 mt-auto">
        <div className="container mx-auto text-sm opacity-70 text-center">
          © {new Date().getFullYear()} Dach-Sketch Mapper NRW | Nutzt Geodaten von Geobasis NRW und Mapbox
        </div>
      </footer>
    </div>
  );
};

export default Index;

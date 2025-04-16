
import React from 'react';
import RoofMapper from '@/components/RoofMapper';

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-dach-primary text-white p-4 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Dach-Sketch Mapper</h1>
          <p className="text-sm opacity-90">Einfache Dachvermessung für Profis</p>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto py-8 px-4">
        <RoofMapper />
      </main>
      
      <footer className="bg-dach-primary text-white p-4 mt-auto">
        <div className="container mx-auto text-sm opacity-70 text-center">
          © {new Date().getFullYear()} Dach-Sketch Mapper | Professionelles Tool für Dachdecker
        </div>
      </footer>
    </div>
  );
};

export default Index;

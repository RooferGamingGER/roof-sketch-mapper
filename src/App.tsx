
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Index from '@/pages/Index';
import NotFound from '@/pages/NotFound';
import { MapProvider } from '@/context/MapProvider';

import '@/App.css';

function App() {
  return (
    <MapProvider>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MapProvider>
  );
}

export default App;

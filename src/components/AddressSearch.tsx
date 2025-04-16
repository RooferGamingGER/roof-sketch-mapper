
import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMapContext } from '@/context/MapContext';
import { toast } from 'sonner';

const AddressSearch: React.FC = () => {
  const { mapboxToken, setSelectedAddress, setCoordinates } = useMapContext();
  const [address, setAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Funktion zum Suchen einer Adresse
  const searchAddress = async () => {
    if (!address.trim()) {
      toast.error('Bitte geben Sie eine Adresse ein.');
      return;
    }

    if (!mapboxToken) {
      toast.error('Bitte geben Sie zuerst einen Mapbox-Token ein.');
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1&types=address`
      );
      
      if (!response.ok) {
        throw new Error('Fehler bei der Adresssuche');
      }

      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const result = data.features[0];
        setSelectedAddress(result.place_name);
        setCoordinates(result.center);
        toast.success(`Adresse gefunden: ${result.place_name}`);
      } else {
        toast.error('Keine Ergebnisse für diese Adresse.');
      }
    } catch (error) {
      console.error('Fehler bei der Adresssuche:', error);
      toast.error('Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSearching(false);
      setShowSuggestions(false);
    }
  };

  // Funktion zum Abrufen von Vorschlägen
  const fetchSuggestions = async (query: string) => {
    if (!query.trim() || !mapboxToken) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=5&types=address`
      );
      
      if (!response.ok) {
        throw new Error('Fehler beim Abrufen von Vorschlägen');
      }

      const data = await response.json();
      setSuggestions(data.features || []);
    } catch (error) {
      console.error('Fehler beim Abrufen von Vorschlägen:', error);
      setSuggestions([]);
    }
  };

  // Verzögertes Abrufen von Vorschlägen
  useEffect(() => {
    const timer = setTimeout(() => {
      if (address.trim().length > 2 && mapboxToken) {
        fetchSuggestions(address);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [address, mapboxToken]);

  // Handler für die Auswahl einer Adressvorschlag
  const handleSelectSuggestion = (suggestion: any) => {
    setAddress(suggestion.place_name);
    setSelectedAddress(suggestion.place_name);
    setCoordinates(suggestion.center);
    setShowSuggestions(false);
    toast.success(`Adresse ausgewählt: ${suggestion.place_name}`);
  };

  return (
    <div className="relative w-full">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            className="pl-10"
            placeholder="Adresse eingeben..."
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                searchAddress();
              }
            }}
            onFocus={() => setShowSuggestions(!!suggestions.length)}
            onBlur={() => {
              // Verzögern, damit das Klicken auf Vorschläge funktioniert
              setTimeout(() => setShowSuggestions(false), 200);
            }}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <Button 
          onClick={searchAddress} 
          disabled={isSearching || !address.trim()}
          variant="default"
        >
          {isSearching ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Suche...
            </>
          ) : (
            'Suchen'
          )}
        </Button>
      </div>

      {/* Adressvorschläge */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md border border-border overflow-hidden">
          <ul className="py-1 max-h-60 overflow-auto">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.id}
                className="px-4 py-2 hover:bg-muted cursor-pointer"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                {suggestion.place_name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AddressSearch;

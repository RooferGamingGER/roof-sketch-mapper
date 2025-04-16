import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMapContext } from '@/context/MapContext';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Key, Info } from 'lucide-react';

const TokenInput: React.FC = () => {
  const { mapboxToken, setMapboxToken } = useMapContext();
  const [token, setToken] = useState(mapboxToken || 'pk.eyJ1Ijoicm9vZmVyZ2FtaW5nIiwiYSI6ImNtOHduem92dTE0dHAya3NldWRuMHVlN2UifQ.p1DH0hDh_k_1fp9HIXoVKQ');

  // Funktion zum Speichern des Tokens
  const saveToken = () => {
    if (!token.trim()) {
      toast.error('Bitte geben Sie einen Mapbox-Token ein');
      return;
    }

    setMapboxToken(token.trim());
    localStorage.setItem('mapbox-token', token.trim());
    toast.success('Mapbox-Token gespeichert');
  };

  // Lade den Token aus dem localStorage beim ersten Laden
  React.useEffect(() => {
    // Setze den Standard-Token, wenn keiner im localStorage ist
    const savedToken = localStorage.getItem('mapbox-token') || 'pk.eyJ1Ijoicm9vZmVyZ2FtaW5nIiwiYSI6ImNtOHduem92dTE0dHAya3NldWRuMHVlN2UifQ.p1DH0hDh_k_1fp9HIXoVKQ';
    setToken(savedToken);
    setMapboxToken(savedToken);
  }, []);

  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1">
        <Input
          className="pl-8"
          type="password"
          placeholder="Mapbox-Token eingeben"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              saveToken();
            }
          }}
        />
        <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      </div>

      <Button onClick={saveToken} variant="default">Speichern</Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <Info className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mapbox-Token Info</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-4">
                Für die Nutzung der Karte wird ein Mapbox-Token benötigt. Diesen können Sie kostenlos auf
                der Mapbox-Website erstellen.
              </p>
              <p className="mb-2">So erhalten Sie einen Token:</p>
              <ol className="list-decimal pl-5 space-y-2 text-sm">
                <li>Registrieren Sie sich auf <a href="https://www.mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">mapbox.com</a></li>
                <li>Gehen Sie nach dem Login zum Dashboard</li>
                <li>Unter "Access tokens" finden Sie Ihren Default Public Token</li>
                <li>Kopieren Sie den Token und fügen Sie ihn hier ein</li>
              </ol>
              <p className="mt-4 text-xs text-muted-foreground">
                Hinweis: Der Token wird lokal in Ihrem Browser gespeichert.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Verstanden</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TokenInput;

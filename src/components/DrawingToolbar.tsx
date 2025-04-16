
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Pencil,
  Edit,
  Trash2,
  X,
} from 'lucide-react';
import { useMapContext, DrawMode } from '@/context/MapContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";

const DrawingToolbar: React.FC = () => {
  const { 
    drawMode, 
    setDrawMode, 
    selectedFeatureId, 
    deleteFeature,
    deleteAllFeatures,
    drawnFeatures,
    measurementResults
  } = useMapContext();

  // Funktion zum Setzen des Zeichenmodus
  const setMode = (mode: DrawMode) => {
    if (drawMode === mode) {
      setDrawMode(null);
    } else {
      setDrawMode(mode);
    }
  };

  // Funktion zum Löschen des ausgewählten Polygons oder aller Polygone
  const handleDelete = () => {
    if (selectedFeatureId) {
      deleteFeature(selectedFeatureId);
      toast.success('Polygon wurde gelöscht');
    } else if (drawnFeatures.length > 0) {
      deleteAllFeatures();
      toast.success('Alle Polygone wurden gelöscht');
    } else {
      toast.error('Keine Polygone zum Löschen vorhanden');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <TooltipProvider>
          {/* Zeichnen-Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={drawMode === 'draw' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setMode('draw')}
                className={cn(
                  drawMode === 'draw' && 'bg-dach-secondary hover:bg-dach-secondary/90 text-white'
                )}
              >
                <Pencil className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Polygon zeichnen</p>
            </TooltipContent>
          </Tooltip>

          {/* Bearbeiten-Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={drawMode === 'edit' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setMode('edit')}
                disabled={!selectedFeatureId}
                className={cn(
                  drawMode === 'edit' && 'bg-amber-500 hover:bg-amber-500/90 text-white'
                )}
              >
                <Edit className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Polygon bearbeiten</p>
            </TooltipContent>
          </Tooltip>

          {/* Löschen-Button - jetzt für einzelne oder alle Polygone */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleDelete}
                disabled={drawnFeatures.length === 0}
                className={cn(
                  'hover:bg-red-100 hover:text-red-500'
                )}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {selectedFeatureId ? 
                <p>Ausgewähltes Polygon löschen</p> : 
                <p>Alle Polygone löschen</p>
              }
            </TooltipContent>
          </Tooltip>

          {/* Alles abbrechen-Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDrawMode(null)}
                disabled={!drawMode}
              >
                <X className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Abbrechen</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Messungsergebnisse - jetzt immer sichtbar, wenn ein Polygon ausgewählt ist oder gezeichnet wird */}
      {(selectedFeatureId || drawMode === 'draw') && measurementResults && (
        <div className="bg-white p-3 rounded-md border border-border shadow-sm">
          <h3 className="font-medium text-sm mb-2 text-dach-primary">Messungsergebnisse:</h3>
          <div className="space-y-1">
            <p className="text-sm flex justify-between">
              <span>Fläche:</span> 
              <span className="font-medium">
                {measurementResults.area 
                  ? `${(measurementResults.area).toFixed(2)} m²` 
                  : '-'}
              </span>
            </p>
            <p className="text-sm flex justify-between">
              <span>Umfang:</span> 
              <span className="font-medium">
                {measurementResults.perimeter 
                  ? `${measurementResults.perimeter.toFixed(2)} m` 
                  : '-'}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawingToolbar;

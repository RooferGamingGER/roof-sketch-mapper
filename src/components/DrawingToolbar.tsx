
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Pencil,
  Square,
  Trash2,
  RulerSquare,
  X,
  Save
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

  // Funktion zum Löschen des ausgewählten Polygons
  const handleDelete = () => {
    if (selectedFeatureId) {
      deleteFeature(selectedFeatureId);
      toast.success('Polygon wurde gelöscht');
    } else {
      toast.error('Bitte wählen Sie zuerst ein Polygon aus');
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

          {/* Messen-Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={drawMode === 'measure' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setMode('measure')}
                className={cn(
                  drawMode === 'measure' && 'bg-dach-primary hover:bg-dach-primary/90 text-white'
                )}
              >
                <RulerSquare className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Messen</p>
            </TooltipContent>
          </Tooltip>

          {/* Löschen-Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleDelete}
                disabled={!selectedFeatureId}
                className={cn(
                  selectedFeatureId && 'hover:bg-red-100 hover:text-red-500'
                )}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ausgewähltes Polygon löschen</p>
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

      {/* Messungsergebnisse */}
      {(drawMode === 'measure' || selectedFeatureId) && measurementResults && (
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

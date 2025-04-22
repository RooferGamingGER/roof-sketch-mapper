
import React from 'react';
import { useMapContext } from '@/context/MapContext';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Ruler, MapPin } from 'lucide-react';

const MeasurementsSidebar = () => {
  const { allMeasurements, selectedFeatureId, setSelectedFeatureId } = useMapContext();

  return (
    <div className="bg-white rounded-md border border-border shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <Ruler className="h-4 w-4" />
        <span className="font-medium">Alle Messungsergebnisse ({allMeasurements.length})</span>
      </div>
      
      {allMeasurements.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Fläche</TableHead>
              <TableHead>Umfang</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allMeasurements.map((measurement, index) => (
              <TableRow 
                key={measurement.id}
                className={selectedFeatureId === measurement.id ? "bg-blue-50" : ""}
                onClick={() => setSelectedFeatureId(measurement.id)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1 cursor-pointer">
                    <MapPin className="h-3.5 w-3.5" />
                    {index + 1}
                  </div>
                </TableCell>
                <TableCell>{measurement.area.toFixed(2)} m²</TableCell>
                <TableCell>{measurement.perimeter.toFixed(2)} m</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-sm text-gray-500 py-3 px-1">
          Keine Messungen vorhanden
        </div>
      )}
    </div>
  );
};

export default MeasurementsSidebar;

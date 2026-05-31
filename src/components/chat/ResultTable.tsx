// src/components/chat/ResultTable.tsx
import { Badge } from '@/components/ui/badge';
import type { QueryResult } from '@/types/domain';

interface ResultTableProps {
  result: QueryResult;
}

export function ResultTable({ result }: ResultTableProps) {
  return (
    <div className="mt-2 space-y-1">
      <div className="overflow-x-auto rounded-md border">
        <table className="text-sm w-full">
          <thead className="bg-gray-50">
            <tr>
              {result.columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {result.rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-gray-50">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-1.5 text-gray-800 whitespace-nowrap">
                    {cell === null ? <span className="text-gray-400 italic">null</span> : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>{result.count} linha{result.count !== 1 ? 's' : ''}</span>
        {result.truncated && <Badge variant="secondary">Resultado truncado</Badge>}
      </div>
    </div>
  );
}

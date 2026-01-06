import React, { useState, useEffect } from 'react';
import { PersonRecord, Vehicle } from '../types';
import { CheckCircle, AlertCircle, RefreshCw, HelpCircle, Settings, CloudLightning, Download, FileSpreadsheet, Trash2, Save } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportTabProps {
  onImport: (newData: PersonRecord[]) => void;
  onReset: () => void;
}

const DEFAULT_CONFIG = {
  url: "https://docs.google.com/spreadsheets/d/1-i0jV5OUQXFFferRP3W3OPesotPggE8x/edit?gid=928229693#gid=928229693", 
  headerRow: 3,
  columnMapping: {
    name: "0",      
    id: "3",        
    group: "4",     
    gender: "5",    
    email: "7",     
    rut: "12",       
    department: "16",
    role: "17",      
    plate1: "29",    
    brand1: "30",   
    color1: "31",   
    plate2: "34",   
    brand2: "35",
    color2: "36",
    plate3: "39",
    brand3: "40",
    color3: "41"
  } as Record<string, string>
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre Completo (Obligatorio)",
  rut: "RUT / DNI",
  email: "Email",
  id: "ID Interno",
  group: "Grupo / Categoría",
  gender: "Género",
  department: "Departamento",
  role: "Cargo",
  plate1: "Patente Vehículo 1",
  brand1: "Marca Vehículo 1",
  color1: "Color Vehículo 1",
  plate2: "Patente Vehículo 2",
  brand2: "Marca Vehículo 2",
  color2: "Color Vehículo 2",
  plate3: "Patente Vehículo 3",
  brand3: "Marca Vehículo 3",
  color3: "Color Vehículo 3"
};

const ImportTab: React.FC<ImportTabProps> = ({ onImport, onReset }) => {
  const [url, setUrl] = useState(() => {
    const saved = localStorage.getItem('import_config');
    if (saved) return JSON.parse(saved).url || DEFAULT_CONFIG.url;
    return DEFAULT_CONFIG.url;
  });

  const [headerRow, setHeaderRow] = useState(() => {
    const saved = localStorage.getItem('import_config');
    if (saved) return JSON.parse(saved).headerRow || DEFAULT_CONFIG.headerRow;
    return DEFAULT_CONFIG.headerRow;
  });

  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('import_config');
    if (saved) return JSON.parse(saved).columnMapping || DEFAULT_CONFIG.columnMapping;
    return DEFAULT_CONFIG.columnMapping;
  });

  const [availableHeaders, setAvailableHeaders] = useState<string[]>(() => {
    const saved = localStorage.getItem('import_config');
    if (saved) return JSON.parse(saved).availableHeaders || [];
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Efecto para guardar automáticamente cualquier cambio en la configuración
  useEffect(() => {
    const config = {
      url,
      headerRow,
      columnMapping,
      availableHeaders
    };
    localStorage.setItem('import_config', JSON.stringify(config));
    
    // Mostrar brevemente el indicador de "Guardado"
    setIsSaved(true);
    const timer = setTimeout(() => setIsSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [url, headerRow, columnMapping, availableHeaders]);

  const cleanStr = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val).trim();
  };

  const getColumnLabel = (index: number) => {
    let label = "";
    let i = index;
    while (i >= 0) {
        label = String.fromCharCode((i % 26) + 65) + label;
        i = Math.floor(i / 26) - 1;
    }
    return label;
  };

  const fixWorksheetRange = (worksheet: XLSX.WorkSheet) => {
    if (!worksheet['!ref']) return;
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    range.s.r = 0; 
    range.s.c = 0; 
    worksheet['!ref'] = XLSX.utils.encode_range(range);
  };

  const fetchFile = async (url: string): Promise<string[][]> => {
    if (!url || !url.includes('google.com/spreadsheets')) {
      throw new Error("El enlace no es válido. Asegúrate de copiar la URL completa del navegador.");
    }
    const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches || !matches[1]) throw new Error("ID de planilla no encontrado en la URL.");
    const sheetId = matches[1];
    const gidMatch = url.match(/[#&]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : null;

    if (gid) {
        try {
            const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
            const response = await fetch(csvUrl);
            if (response.ok) {
                const text = await response.text();
                const workbook = XLSX.read(text, { type: 'string' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                fixWorksheetRange(worksheet);
                return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as string[][];
            }
        } catch (e) {}
    }

    const xlsxUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
    const response = await fetch(xlsxUrl);
    if (!response.ok) throw new Error("No se pudo descargar el archivo. Verifica que el archivo de Google Sheets tenga activada la opción 'Compartir con cualquier persona que tenga el enlace'.");
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    fixWorksheetRange(worksheet);
    return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as string[][];
  };

  const loadHeaders = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const rows = await fetchFile(url);
      const rowIndex = Math.max(0, headerRow - 1);
      if (!rows || rows.length <= rowIndex) throw new Error("La planilla parece estar vacía en la fila indicada.");
      setAvailableHeaders(rows[rowIndex].map(c => cleanStr(c)));
      setShowConfig(true); 
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const processData = async () => {
    setError(null);
    setSuccessCount(null);
    setIsLoading(true);

    try {
      const rows = await fetchFile(url);
      const rowIndex = Math.max(0, headerRow - 1);
      
      const findColIndex = (fieldKey: string): number => {
        const manualSelection = columnMapping[fieldKey];
        if (manualSelection !== undefined && manualSelection !== "") {
          const index = parseInt(manualSelection, 10);
          if (!isNaN(index)) return index;
        }
        return -1;
      };

      const idxName = findColIndex('name');
      if (idxName === -1) throw new Error("Falta mapear la columna obligatoria 'Nombre'.");

      const parsedData: PersonRecord[] = [];

      for (let i = rowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!Array.isArray(row) || row.length === 0) continue;
        const getVal = (idx: number) => (idx > -1 && row[idx] !== undefined) ? cleanStr(row[idx]) : '';

        const name = getVal(idxName);
        if (!name) continue;

        const vehicles: Vehicle[] = [];
        // Procesar hasta 3 vehículos
        [1, 2, 3].forEach(num => {
          const p = getVal(findColIndex(`plate${num}`));
          if (p && p.length > 1) {
            vehicles.push({
              plate: p.toUpperCase(),
              brand: getVal(findColIndex(`brand${num}`)) || 'Desconocido',
              color: getVal(findColIndex(`color${num}`)) || ''
            });
          }
        });

        parsedData.push({
          id: getVal(findColIndex('id')) || Math.random().toString(36).substr(2, 9),
          name: name,
          rut: getVal(findColIndex('rut')) || 'S/R',
          email: getVal(findColIndex('email')),
          group: getVal(findColIndex('group')) || 'General',
          gender: getVal(findColIndex('gender')) || 'Unspecified',
          department: getVal(findColIndex('department')),
          role: getVal(findColIndex('role')),
          vehicles: vehicles
        });
      }

      if (parsedData.length === 0) throw new Error("No se encontraron registros válidos después de la fila de títulos.");
      onImport(parsedData);
      setSuccessCount(parsedData.length);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-orange-50 p-8 border-b border-orange-100 text-center relative">
          <CloudLightning className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-orange-900 mb-2">Enlace de Google Drive</h2>
          <p className="text-orange-700 max-w-lg mx-auto mb-6">Pega aquí el link de tu planilla. Los cambios se guardan automáticamente en este navegador.</p>
          
          <div className="max-w-xl mx-auto flex flex-col items-center gap-4 relative">
            <div className="w-full relative">
                <input
                    type="text"
                    className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl outline-none shadow-sm text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                />
                {isSaved && (
                    <div className="absolute -top-6 right-0 flex items-center gap-1 text-[10px] font-bold text-emerald-500 animate-pulse">
                        <Save className="w-3 h-3" /> CONFIGURACIÓN GRABADA
                    </div>
                )}
            </div>
            
            <div className="flex gap-2 w-full">
                <button
                    onClick={processData}
                    disabled={isLoading || !url}
                    className={`flex-1 py-3 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-3 transition-all ${
                    isLoading || !url ? 'bg-slate-300 shadow-none' : 'bg-orange-500 hover:bg-orange-600 shadow-xl active:scale-95'
                    }`}
                >
                    <RefreshCw className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? 'Sincronizando...' : 'Sincronizar Ahora'}
                </button>
                <button 
                  onClick={showConfig ? () => setShowConfig(false) : loadHeaders} 
                  className={`px-4 py-3 rounded-xl border transition-all ${showConfig ? 'bg-orange-100 border-orange-300 text-orange-600' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                  title="Configurar mapeo de columnas"
                >
                    <Settings className="w-5 h-5" />
                </button>
            </div>
          </div>
        </div>

        {showConfig && (
          <div className="bg-slate-50 border-b border-slate-200 p-6 animate-in slide-in-from-top-2">
            <div className="flex justify-between mb-6">
              <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-indigo-500"/> Configuración de Columnas</h3>
              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border">
                <span className="text-xs font-bold text-slate-400">Fila Títulos:</span>
                <input type="number" min="1" value={headerRow} onChange={(e) => setHeaderRow(Number(e.target.value))} className="w-10 text-center font-bold outline-none text-indigo-600"/>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.keys(FIELD_LABELS).map((fieldKey) => (
                <div key={fieldKey} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
                  <label className="block text-[10px] font-bold mb-1 uppercase text-slate-400">{FIELD_LABELS[fieldKey]}</label>
                  <select
                    value={columnMapping[fieldKey] || ""}
                    onChange={(e) => setColumnMapping(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-100 text-sm rounded-md px-2 py-2 outline-none focus:border-indigo-300"
                  >
                    <option value="">-- Sin asignar --</option>
                    {availableHeaders.map((header, idx) => (
                       <option key={idx} value={String(idx)}>[Col {getColumnLabel(idx)}] {header || `Columna ${idx + 1}`}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-8 text-center bg-white">
          {error && (
            <div className="bg-red-50 text-red-700 p-5 rounded-xl flex items-start text-left gap-3 border border-red-100 max-w-2xl mx-auto animate-bounce">
              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
              <div><p className="font-bold">Error al leer la planilla</p><p className="text-sm">{error}</p></div>
            </div>
          )}
          {successCount !== null && (
            <div className="bg-emerald-50 text-emerald-700 p-5 rounded-xl flex items-center justify-center gap-4 border border-emerald-100 max-w-2xl mx-auto">
              <CheckCircle className="w-6 h-6" />
              <div className="text-left"><p className="font-bold">¡Sincronización Exitosa!</p><p className="text-sm">Se han cargado {successCount} registros correctamente.</p></div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-4 text-center border-t text-xs text-slate-300">
          <button onClick={onReset} className="hover:text-red-400 flex items-center justify-center gap-1 mx-auto transition-colors"><Trash2 className="w-3 h-3" /> Borrar base de datos local y restablecer configuración</button>
        </div>
      </div>
    </div>
  );
};

export default ImportTab;
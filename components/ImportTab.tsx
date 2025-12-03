import React, { useState, useEffect } from 'react';
import { PersonRecord, Vehicle } from '../types';
import { CheckCircle, AlertCircle, RefreshCw, HelpCircle, Settings, CloudLightning, Download, FileSpreadsheet, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportTabProps {
  onImport: (newData: PersonRecord[]) => void;
  onReset: () => void;
}

// ============================================================================
// CONFIGURACIÓN POR DEFECTO
// ============================================================================
// Esta configuración se usará si el usuario no tiene datos guardados o si resetea la app.
const DEFAULT_CONFIG = {
  // 1. IMPORTANTE: PEGA AQUÍ TU ENLACE DE GOOGLE SHEETS ENTRE LAS COMILLAS:
  url: "https://docs.google.com/spreadsheets/d/1-i0jV5OUQXFFferRP3W3OPesotPggE8x/edit?gid=928229693#gid=928229693", 
  
  // 2. FILA DONDE ESTÁN LOS TÍTULOS (Por defecto 3 según tu requerimiento)
  headerRow: 3,

  // 3. MAPEO DE COLUMNAS (Basado exactamente en la imagen enviada)
  // Los números representan el índice de la columna (A=0, B=1, C=2...)
  columnMapping: {
    name: "0",      // Columna A: NOMBRE
    id: "3",        // Columna B: ID
    group: "4",     // Columna C: GRUPO
    gender: "5",    // Columna D: GENERO
    email: "7",     // Columna E: EMAIL
    rut: "12",       // Columna F: RUT
    // Columna G (6) parece vacía u oculta en la imagen
    department: "16",// Columna H: DEPARTAMENTO
    role: "17",      // Columna I: CARGO
    plate1: "29",    // Columna J: PATENTE 1
    brand1: "30",   // Columna K: MARCA 1
    color1: "31",   // Columna L: COLOR VEHICULO
    plate2: "34",   // Columna M: PATENTE 2
    brand2: "35"    // Columna N: MARCA 2
  } as Record<string, string>
};

// Etiquetas amigables para la UI
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
  color2: "Color Vehículo 2"
};

const ImportTab: React.FC<ImportTabProps> = ({ onImport, onReset }) => {
  // Estado inicial: Intenta leer localStorage, si no existe, usa DEFAULT_CONFIG
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

  // Autoguardado: Cada vez que cambie url, headerRow, mapping o headers, se guarda en localStorage
  useEffect(() => {
    const config = {
      url,
      headerRow,
      columnMapping,
      availableHeaders
    };
    localStorage.setItem('import_config', JSON.stringify(config));
  }, [url, headerRow, columnMapping, availableHeaders]);

  // Helper para normalizar strings para comparación robusta
  const normalize = (str: any) => String(str || '').toUpperCase().trim().replace(/\s+/g, ' ');

  // Helper seguro para obtener strings de celdas
  const cleanStr = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val).trim();
  };

  // Helper para convertir índice 0 -> A, 1 -> B, etc.
  const getColumnLabel = (index: number) => {
    let label = "";
    let i = index;
    while (i >= 0) {
        label = String.fromCharCode((i % 26) + 65) + label;
        i = Math.floor(i / 26) - 1;
    }
    return label;
  };

  // Helper para ajustar el rango de la hoja para que siempre empiece en A1
  const fixWorksheetRange = (worksheet: XLSX.WorkSheet) => {
    if (!worksheet['!ref']) return;
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    range.s.r = 0; // Forzar inicio en fila 0
    range.s.c = 0; // Forzar inicio en columna 0
    worksheet['!ref'] = XLSX.utils.encode_range(range);
  };

  const fetchFile = async (url: string): Promise<string[][]> => {
    if (!url || !url.includes('google.com/spreadsheets')) {
      throw new Error("El enlace no es válido o está vacío. Asegúrate de configurar la URL de Google Sheets.");
    }
    const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches || !matches[1]) {
      throw new Error("URL inválida. No se pudo encontrar el ID de la hoja.");
    }
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
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                fixWorksheetRange(worksheet);
                return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as string[][];
            }
        } catch (e) {
            console.warn("Fallo carga CSV con GID, intentando método general...", e);
        }
    }

    try {
      const xlsxUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
      const response = await fetch(xlsxUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        fixWorksheetRange(worksheet);
        return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as string[][];
      }
    } catch (e) {
      console.warn("Fallo carga XLSX, intentando método alternativo...", e);
    }

    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error("No se pudo descargar el archivo. Verifique que esté compartido públicamente.");
    
    const text = await response.text();
    const workbook = XLSX.read(text, { type: 'string' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    fixWorksheetRange(worksheet);
    return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as string[][];
  };

  const loadHeaders = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const rows = await fetchFile(url);
      const rowIndex = Math.max(0, headerRow - 1);
      
      if (!rows || rows.length <= rowIndex) {
        throw new Error(`El archivo parece vacío o tiene menos filas (${rows?.length || 0}) que la fila de cabecera indicada (${headerRow}).`);
      }
      
      const rawHeaders = rows[rowIndex].map(c => cleanStr(c));
      setAvailableHeaders(rawHeaders);
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
      
      if (!rows || rows.length <= rowIndex) throw new Error(`El archivo no contiene suficientes datos (Filas leídas: ${rows?.length}).`);
      
      // Función para encontrar el índice de columna
      const findColIndex = (fieldKey: string): number => {
        // Usar mapeo manual (Prioridad absoluta)
        const manualSelection = columnMapping[fieldKey];
        if (manualSelection !== undefined && manualSelection !== "") {
          const index = parseInt(manualSelection, 10);
          if (!isNaN(index)) return index;
        }
        return -1;
      };

      const idxName = findColIndex('name');
      const idxRut = findColIndex('rut');
      
      if (idxName === -1) {
        // Fallback mensaje si la configuración por defecto falla
        throw new Error(`No se ha configurado la columna 'Nombre'. Por favor revisa la configuración.`);
      }

      const parsedData: PersonRecord[] = [];
      let skippedCount = 0;

      for (let i = rowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!Array.isArray(row) || row.length === 0) continue;

        const getVal = (idx: number) => (idx > -1 && row[idx] !== undefined) ? cleanStr(row[idx]) : '';

        const name = getVal(idxName);
        if (!name) {
          skippedCount++;
          continue; 
        }

        const vehicles: Vehicle[] = [];
        const p1 = getVal(findColIndex('plate1'));
        if (p1 && p1.length > 1) {
          vehicles.push({
            plate: p1,
            brand: getVal(findColIndex('brand1')) || 'Desconocido',
            color: getVal(findColIndex('color1')) || ''
          });
        }
        const p2 = getVal(findColIndex('plate2'));
        if (p2 && p2.length > 1) {
          vehicles.push({
            plate: p2,
            brand: getVal(findColIndex('brand2')) || 'Desconocido',
            color: getVal(findColIndex('color2')) || '' // Asignar color2 si existe en mapeo
          });
        }

        const person: PersonRecord = {
          id: getVal(findColIndex('id')) || Math.random().toString(36).substr(2, 9),
          name: name,
          rut: getVal(idxRut) || 'S/R',
          email: getVal(findColIndex('email')),
          group: getVal(findColIndex('group')) || 'General',
          gender: getVal(findColIndex('gender')) || 'Unspecified',
          department: getVal(findColIndex('department')),
          role: getVal(findColIndex('role')),
          vehicles: vehicles
        };
        
        parsedData.push(person);
      }

      if (parsedData.length === 0) {
        let errorMsg = `No se encontraron registros válidos después de la fila ${headerRow}.`;
        if (skippedCount > 0) {
          errorMsg += ` Se omitieron ${skippedCount} filas sin nombre válido.`;
        }
        throw new Error(errorMsg);
      }

      onImport(parsedData);
      setSuccessCount(parsedData.length);

    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
        
        {/* Cabecera */}
        <div className="bg-orange-50 p-8 border-b border-orange-100 text-center relative">
          <CloudLightning className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-orange-900 mb-2">Sincronizar con Google Drive</h2>
          <p className="text-orange-700 max-w-lg mx-auto mb-6">
            Presiona el botón para actualizar la base de datos desde la nube.
          </p>

          <div className="max-w-xl mx-auto flex flex-col items-center gap-4">
            {/* Input para URL */}
            <div className="w-full relative group">
                <input
                type="text"
                className="w-full pl-4 pr-10 py-3 bg-white text-slate-900 border border-slate-200 rounded-xl outline-none shadow-sm text-sm font-medium"
                placeholder="Pega aquí el enlace de Google Sheets (o configúralo en el código)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <Settings className="w-4 h-4 text-slate-300 group-hover:text-orange-400 transition-colors" />
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={processData}
                    disabled={isLoading || !url}
                    className={`px-8 py-3 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-3 shadow-xl transition-all ${
                    isLoading || !url 
                        ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                        : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 hover:shadow-orange-200 hover:-translate-y-0.5'
                    }`}
                >
                    {isLoading ? (
                    <>
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        Procesando...
                    </>
                    ) : (
                    <>
                        <RefreshCw className="w-6 h-6" />
                        Sincronizar Ahora
                    </>
                    )}
                </button>
                
                <button 
                    onClick={showConfig ? () => setShowConfig(false) : loadHeaders}
                    className="px-4 py-3 bg-white text-slate-400 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 hover:text-orange-600 transition-colors flex items-center justify-center shadow-sm"
                    title="Configuración Avanzada"
                >
                    <Settings className="w-5 h-5" />
                </button>
            </div>
          </div>
        </div>

        {/* Panel de Configuración (Oculto por defecto) */}
        {showConfig && (
          <div className="bg-slate-50 border-b border-slate-200 p-6 animate-in slide-in-from-top-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-2">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-700 text-lg">Mapeo de Columnas (Avanzado)</h3>
                  <p className="text-xs text-slate-500">Modifica esto solo si cambia la estructura del Excel</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                 <div className="flex items-center gap-2 px-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Fila Títulos:</span>
                    <input 
                      type="number" 
                      min="1" 
                      value={headerRow}
                      onChange={(e) => setHeaderRow(Number(e.target.value))}
                      className="w-12 text-center font-bold text-slate-800 outline-none border-b-2 border-slate-200 focus:border-indigo-500 py-1"
                    />
                 </div>
                 <div className="h-6 w-px bg-slate-200"></div>
                 <button 
                    onClick={loadHeaders}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-1.5 rounded hover:bg-indigo-50 transition-colors"
                 >
                    <Download className="w-3 h-3" />
                    Recargar
                 </button>
              </div>
            </div>

            {availableHeaders.length === 0 ? (
               <div className="text-center py-6 text-slate-500 bg-white rounded-xl border-2 border-dashed border-slate-200">
                  <p className="mb-2 font-medium">Columnas no cargadas.</p>
                  <button onClick={loadHeaders} className="px-4 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-lg hover:bg-indigo-100 transition-colors text-sm">
                    Leer Archivo
                  </button>
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.keys(FIELD_LABELS).map((fieldKey) => (
                  <div key={fieldKey} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors group">
                    <label className={`block text-[10px] font-bold mb-1.5 uppercase tracking-wide ${fieldKey === 'name' ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {FIELD_LABELS[fieldKey]}
                    </label>
                    <select
                      value={columnMapping[fieldKey] || ""}
                      onChange={(e) => setColumnMapping(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-md px-2 py-2.5 outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all cursor-pointer font-medium"
                    >
                      <option value="">-- Sin asignar --</option>
                      {availableHeaders.map((header, idx) => (
                         <option key={idx} value={String(idx)}>
                           [{getColumnLabel(idx)}] {header || '(Sin Título)'}
                         </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 flex justify-end pt-4 border-t border-slate-100">
              <button onClick={() => setShowConfig(false)} className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition-colors text-sm">
                Ocultar Configuración
              </button>
            </div>
          </div>
        )}

        <div className="p-8 text-center bg-white">
          {/* Mensajes */}
          {error && (
            <div className="bg-red-50 text-red-700 p-5 rounded-xl flex items-start text-left gap-3 animate-fadeIn border border-red-100 mx-auto max-w-2xl shadow-sm">
              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5 text-red-500" />
              <div className="flex-1">
                <p className="font-bold text-lg">Error de sincronización</p>
                <p className="text-sm opacity-90 mt-1">{error}</p>
                {(!url || url === "") && (
                    <p className="text-xs font-bold mt-2 text-red-800">
                        TIP: Debes pegar el enlace de Google Sheets en el código (ImportTab.tsx) o en la caja de texto.
                    </p>
                )}
              </div>
            </div>
          )}

          {successCount !== null && (
            <div className="bg-emerald-50 text-emerald-700 p-5 rounded-xl flex items-center justify-center gap-4 animate-fadeIn border border-emerald-100 mx-auto max-w-2xl shadow-sm">
              <div className="bg-emerald-100 p-2 rounded-full">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="font-bold text-lg text-emerald-800">¡Sincronización Exitosa!</p>
                <p className="text-sm opacity-90">Se han actualizado {successCount} registros en la base de datos.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100 flex flex-col gap-2">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
            <HelpCircle className="w-3 h-3" />
            La configuración predeterminada está guardada en el sistema.
          </p>
          <button onClick={onReset} className="text-xs text-slate-300 hover:text-red-400 flex items-center justify-center gap-1 mt-2">
             <Trash2 className="w-3 h-3" /> Restablecer datos de fábrica
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportTab;
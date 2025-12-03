import React, { useState, useEffect } from 'react';
import { PersonRecord, TabView, Vehicle } from './types';
import { INITIAL_DATA } from './constants';
import SearchTab from './components/SearchTab';
import ImportTab from './components/ImportTab';
import { Search, FileInput, Car } from 'lucide-react';
import * as XLSX from 'xlsx';

// Copy of default config from ImportTab to ensure consistency if LS is empty
const DEFAULT_CONFIG_FALLBACK = {
  url: "https://docs.google.com/spreadsheets/d/1-i0jV5OUQXFFferRP3W3OPesotPggE8x/edit?gid=928229693#gid=928229693", 
  headerRow: 3,
  columnMapping: {
    name: "0", id: "3", group: "4", gender: "5", email: "7", rut: "12",
    department: "16", role: "17", plate1: "29", brand1: "30", color1: "31",
    plate2: "34", brand2: "35"
  } as Record<string, string>
};

const App: React.FC = () => {
  // Initialize state from localStorage if available, otherwise use constants
  const [data, setData] = useState<PersonRecord[]>(() => {
    const savedData = localStorage.getItem('app_data');
    return savedData ? JSON.parse(savedData) : INITIAL_DATA;
  });

  const [lastSync, setLastSync] = useState<string | null>(() => {
    return localStorage.getItem('last_sync_date');
  });
  
  const [activeTab, setActiveTab] = useState<TabView>('search');
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('app_data', JSON.stringify(data));
  }, [data]);

  // Save lastSync to localStorage
  useEffect(() => {
    if (lastSync) {
      localStorage.setItem('last_sync_date', lastSync);
    }
  }, [lastSync]);

  // Auto-sync on first load if data is empty
  useEffect(() => {
    if (data.length === 0 && !isAutoSyncing) {
      const performAutoSync = async () => {
        setIsAutoSyncing(true);
        console.log("Iniciando auto-sincronización...");
        await handleQuickSync();
        setIsAutoSyncing(false);
      };
      performAutoSync();
    }
  }, []);

  const handleImport = (newData: PersonRecord[]) => {
    setData(newData);
    const now = new Date().toLocaleString('es-CL');
    setLastSync(now);
    // Add a small delay to switch tabs for better UX
    setTimeout(() => {
      setActiveTab('search');
    }, 1500);
  };

  const handleReset = () => {
    if (confirm('¿Estás seguro de restablecer los datos y borrar la caché?')) {
      setData([]);
      setLastSync(null);
      localStorage.removeItem('app_data');
      localStorage.removeItem('last_sync_date');
      window.location.reload();
    }
  };

  // Logic to perform sync from Search Tab without opening Import Tab
  const handleQuickSync = async (): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
      // 1. Load Config
      const savedConfigStr = localStorage.getItem('import_config');
      const config = savedConfigStr ? JSON.parse(savedConfigStr) : DEFAULT_CONFIG_FALLBACK;
      const { url, headerRow, columnMapping } = config;

      if (!url) return { success: false, error: 'No hay URL configurada' };

      // 2. Fetch File (Copied logic for robustness)
      const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!matches || !matches[1]) return { success: false, error: 'URL inválida' };
      const sheetId = matches[1];
      const gidMatch = url.match(/[#&]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : null;

      let rows: string[][] | null = null;

      // Fix range helper
      const fixWorksheetRange = (worksheet: XLSX.WorkSheet) => {
        if (!worksheet['!ref']) return;
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        range.s.r = 0; range.s.c = 0;
        worksheet['!ref'] = XLSX.utils.encode_range(range);
      };

      // Try CSV with GID first
      if (gid) {
        try {
          const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
          const res = await fetch(csvUrl);
          if (res.ok) {
            const text = await res.text();
            const wb = XLSX.read(text, { type: 'string' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            fixWorksheetRange(ws);
            rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];
          }
        } catch (e) {}
      }

      // Try XLSX
      if (!rows) {
        try {
           const xlsxUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
           const res = await fetch(xlsxUrl);
           if (res.ok) {
             const ab = await res.arrayBuffer();
             const wb = XLSX.read(ab, { type: 'array' });
             const ws = wb.Sheets[wb.SheetNames[0]];
             fixWorksheetRange(ws);
             rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];
           }
        } catch (e) {}
      }
      
      if (!rows) return { success: false, error: 'Error al descargar archivo' };

      // 3. Process Data
      const rowIndex = Math.max(0, (headerRow || 3) - 1);
      const findColIndex = (key: string) => {
        const val = columnMapping[key];
        return (val !== undefined && val !== "") ? parseInt(val, 10) : -1;
      };

      const idxName = findColIndex('name');
      const idxRut = findColIndex('rut');
      
      if (idxName === -1) return { success: false, error: 'Columna Nombre no mapeada' };

      const cleanStr = (v: any) => (v === null || v === undefined) ? '' : String(v).trim();
      const parsedData: PersonRecord[] = [];

      for (let i = rowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!Array.isArray(row) || row.length === 0) continue;
        const getVal = (idx: number) => (idx > -1 && row[idx] !== undefined) ? cleanStr(row[idx]) : '';

        const name = getVal(idxName);
        if (!name) continue;

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
             color: getVal(findColIndex('color2')) || ''
           });
        }

        parsedData.push({
          id: getVal(findColIndex('id')) || Math.random().toString(36).substr(2, 9),
          name,
          rut: getVal(idxRut) || 'S/R',
          email: getVal(findColIndex('email')),
          group: getVal(findColIndex('group')) || 'General',
          gender: getVal(findColIndex('gender')) || 'Unspecified',
          department: getVal(findColIndex('department')),
          role: getVal(findColIndex('role')),
          vehicles
        });
      }

      if (parsedData.length === 0) return { success: false, error: 'No se encontraron datos' };
      
      setData(parsedData);
      setLastSync(new Date().toLocaleString('es-CL'));
      return { success: true, count: parsedData.length };

    } catch (err: any) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F6F8] font-sans text-slate-800">
      
      {/* Navbar / Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Car className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">Control Accesos</h1>
              <p className="text-xs text-slate-400 font-medium tracking-wide">VISOR DE PATENTES</p>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'search' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <Search className="w-4 h-4" />
              Búsqueda
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'import' 
                  ? 'bg-white text-orange-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <FileInput className="w-4 h-4" />
              Importar Datos
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="py-8 px-4">
        {activeTab === 'search' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10 mt-4">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-3">
                Búsqueda de Vehículos
              </h2>
              <p className="text-slate-500 max-w-md mx-auto">
                Consulta rápida por Patente, RUT o Nombre del propietario.
                <br />
                <span className="text-indigo-400 text-sm font-medium">
                  {data.length > 0 
                    ? `Base de datos cargada: ${data.length} registros` 
                    : 'Base de datos vacía'}
                </span>
              </p>
            </div>
            <SearchTab data={data} onSync={handleQuickSync} lastSync={lastSync} />
          </div>
        )}

        {activeTab === 'import' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10 mt-4">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-3">
                Actualizar Base de Datos
              </h2>
              <p className="text-slate-500">
                Sincroniza con Google Sheets para actualizar los registros del sistema.
              </p>
            </div>
            <ImportTab onImport={handleImport} onReset={handleReset} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-400 text-sm">
        <p>© 2024 Sistema de Gestión de Accesos. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default App;
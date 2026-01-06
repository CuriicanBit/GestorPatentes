import React, { useState, useEffect } from 'react';
import { PersonRecord, TabView, Vehicle } from './types';
import { INITIAL_DATA } from './constants';
import SearchTab from './components/SearchTab';
import ImportTab from './components/ImportTab';
import { Search, FileInput, Car } from 'lucide-react';
import * as XLSX from 'xlsx';

const DEFAULT_CONFIG_FALLBACK = {
  url: "https://docs.google.com/spreadsheets/d/1-i0jV5OUQXFFferRP3W3OPesotPggE8x/edit?gid=928229693#gid=928229693", 
  headerRow: 3,
  columnMapping: {
    name: "0", id: "3", group: "4", gender: "5", email: "7", rut: "12",
    department: "16", role: "17", plate1: "29", brand1: "30", color1: "31",
    plate2: "34", brand2: "35", color2: "36", plate3: "39", brand3: "40", color3: "41"
  } as Record<string, string>
};

const App: React.FC = () => {
  const [data, setData] = useState<PersonRecord[]>(() => {
    const savedData = localStorage.getItem('app_data');
    return savedData ? JSON.parse(savedData) : INITIAL_DATA;
  });

  const [lastSync, setLastSync] = useState<string | null>(() => {
    return localStorage.getItem('last_sync_date');
  });
  
  const [activeTab, setActiveTab] = useState<TabView>('search');
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

  useEffect(() => {
    localStorage.setItem('app_data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (lastSync) {
      localStorage.setItem('last_sync_date', lastSync);
    }
  }, [lastSync]);

  useEffect(() => {
    if (data.length === 0 && !isAutoSyncing) {
      const performAutoSync = async () => {
        setIsAutoSyncing(true);
        await handleQuickSync();
        setIsAutoSyncing(false);
      };
      performAutoSync();
    }
  }, []);

  const handleImport = (newData: PersonRecord[]) => {
    setData(newData);
    setLastSync(new Date().toLocaleString('es-CL'));
    setTimeout(() => setActiveTab('search'), 1000);
  };

  const handleReset = () => {
    if (confirm('¿Restablecer datos?')) {
      setData([]);
      setLastSync(null);
      localStorage.removeItem('app_data');
      localStorage.removeItem('last_sync_date');
      window.location.reload();
    }
  };

  const handleQuickSync = async (): Promise<{ success: boolean; count?: number; error?: string }> => {
    try {
      const savedConfigStr = localStorage.getItem('import_config');
      const config = savedConfigStr ? JSON.parse(savedConfigStr) : DEFAULT_CONFIG_FALLBACK;
      const { url, headerRow, columnMapping } = config;

      if (!url) return { success: false, error: 'No hay URL configurada' };

      const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!matches || !matches[1]) return { success: false, error: 'URL inválida' };
      const sheetId = matches[1];
      const gidMatch = url.match(/[#&]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : null;

      let rows: string[][] | null = null;
      const fixRange = (ws: XLSX.WorkSheet) => {
        if (!ws['!ref']) return;
        const r = XLSX.utils.decode_range(ws['!ref']);
        r.s.r = 0; r.s.c = 0;
        ws['!ref'] = XLSX.utils.encode_range(r);
      };

      try {
        const fetchUrl = gid 
          ? `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
          : `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
        const res = await fetch(fetchUrl);
        if (res.ok) {
          const content = gid ? await res.text() : await res.arrayBuffer();
          const wb = XLSX.read(content, { type: gid ? 'string' : 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          fixRange(ws);
          rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];
        }
      } catch (e) {}

      if (!rows) return { success: false, error: 'Error al descargar' };

      const rowIndex = Math.max(0, (headerRow || 3) - 1);
      const findCol = (key: string) => {
        const val = columnMapping[key];
        return (val !== undefined && val !== "") ? parseInt(val, 10) : -1;
      };

      const idxName = findCol('name');
      if (idxName === -1) return { success: false, error: 'Configuración incompleta' };

      const parsedData: PersonRecord[] = [];
      const clean = (v: any) => (v === null || v === undefined) ? '' : String(v).trim();

      for (let i = rowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!Array.isArray(row) || row.length === 0) continue;
        const val = (idx: number) => (idx > -1 && row[idx] !== undefined) ? clean(row[idx]) : '';

        const name = val(idxName);
        if (!name) continue;

        const vehicles: Vehicle[] = [];
        [1, 2, 3].forEach(num => {
          const p = val(findCol(`plate${num}`));
          if (p && p.length > 1) {
            vehicles.push({
              plate: p,
              brand: val(findCol(`brand${num}`)) || 'Desconocido',
              color: val(findCol(`color${num}`))
            });
          }
        });

        parsedData.push({
          id: val(findCol('id')) || Math.random().toString(36).substr(2, 9),
          name,
          rut: val(findCol('rut')) || 'S/R',
          email: val(findCol('email')),
          group: val(findCol('group')) || 'General',
          gender: val(findCol('gender')) || 'Unspecified',
          department: val(findCol('department')),
          role: val(findCol('role')),
          vehicles
        });
      }

      if (parsedData.length === 0) return { success: false, error: 'Sin datos' };
      setData(parsedData);
      setLastSync(new Date().toLocaleString('es-CL'));
      return { success: true, count: parsedData.length };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F6F8] font-sans text-slate-800">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg">
              <Car className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Control Accesos</h1>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Gestión Vehicular</p>
            </div>
          </div>
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('search')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'search' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}><Search className="w-4 h-4" /> Búsqueda</button>
            <button onClick={() => setActiveTab('import')} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'import' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}><FileInput className="w-4 h-4" /> Importar</button>
          </nav>
        </div>
      </header>

      <main className="py-8 px-4">
        {activeTab === 'search' ? (
          <div className="animate-fadeIn">
            <div className="text-center mb-10 mt-4">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-3">Búsqueda Vehicular</h2>
              <p className="text-slate-500 max-w-md mx-auto">Consulta por Patente, RUT o Nombre.</p>
            </div>
            <SearchTab data={data} onSync={handleQuickSync} lastSync={lastSync} />
          </div>
        ) : (
          <div className="animate-fadeIn">
            <div className="text-center mb-10 mt-4">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-3">Sincronización</h2>
              <p className="text-slate-500">Actualiza la base de datos desde la nube.</p>
            </div>
            <ImportTab onImport={handleImport} onReset={handleReset} />
          </div>
        )}
      </main>

      <footer className="py-8 text-center text-slate-400 text-sm">
        <p>© 2024 Sistema de Control de Accesos</p>
      </footer>
    </div>
  );
};

export default App;
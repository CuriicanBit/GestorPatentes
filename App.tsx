import React, { useState } from 'react';
import { PersonRecord, TabView } from './types';
import { INITIAL_DATA } from './constants';
import SearchTab from './components/SearchTab';
import ImportTab from './components/ImportTab';
import { Search, FileInput, Car } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<PersonRecord[]>(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState<TabView>('search');

  const handleImport = (newData: PersonRecord[]) => {
    setData(newData);
    // Add a small delay to switch tabs for better UX
    setTimeout(() => {
      setActiveTab('search');
    }, 1500);
  };

  const handleReset = () => {
    setData(INITIAL_DATA);
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
                <span className="text-indigo-400 text-sm">Base de datos actual: {data.length} registros</span>
              </p>
            </div>
            <SearchTab data={data} />
          </div>
        )}

        {activeTab === 'import' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10 mt-4">
              <h2 className="text-3xl font-extrabold text-slate-800 mb-3">
                Actualizar Base de Datos
              </h2>
              <p className="text-slate-500">
                Carga tu planilla Excel (CSV) para actualizar los registros del sistema.
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

import React, { useMemo, useState } from 'react';
import { PersonRecord } from '../types';
import { Search, Car, User, IdCard, Building, Mail, ShieldCheck, RefreshCw, CheckCircle, AlertCircle, Clock, CloudOff } from 'lucide-react';

interface SearchTabProps {
  data: PersonRecord[];
  onSync: () => Promise<{ success: boolean; count?: number; error?: string }>;
  lastSync: string | null;
}

const SearchTab: React.FC<SearchTabProps> = ({ data, onSync, lastSync }) => {
  const [query, setQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [toastMsg, setToastMsg] = useState('');

  const filteredData = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return data;

    return data.filter((person) => {
      // Search by Name
      if (person.name.toLowerCase().includes(q)) return true;
      // Search by RUT (handle format variations)
      if (person.rut.toLowerCase().replace(/\./g, '').includes(q.replace(/\./g, ''))) return true;
      // Search by Email
      if (person.email.toLowerCase().includes(q)) return true;
      // Search by Vehicle Plate
      if (person.vehicles.some(v => v.plate.toLowerCase().includes(q))) return true;
      
      return false;
    });
  }, [data, query]);

  const handleQuickSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus('idle');
    
    try {
      const result = await onSync();
      if (result.success) {
        setSyncStatus('success');
        setToastMsg(`Actualizado: ${result.count} registros`);
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else {
        setSyncStatus('error');
        setToastMsg(result.error || 'Error al sincronizar');
        setTimeout(() => setSyncStatus('idle'), 4000);
      }
    } catch (e) {
      setSyncStatus('error');
      setToastMsg('Error inesperado');
    } finally {
      setIsSyncing(false);
    }
  };

  // Si no hay datos cargados, mostrar estado vacío inicial
  if (data.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto p-8 animate-fadeIn text-center">
         <div className="bg-white rounded-3xl shadow-xl p-10 border border-slate-100">
            <div className="bg-indigo-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <CloudOff className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">La aplicación aún no se ha sincronizado</h3>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
                No hay registros en el sistema. Presiona el botón para descargar la información más reciente desde la planilla.
            </p>
            
            <button
                onClick={handleQuickSync}
                disabled={isSyncing}
                className={`px-8 py-4 rounded-xl font-bold text-white text-lg shadow-lg flex items-center justify-center gap-3 mx-auto transition-all ${
                isSyncing 
                    ? 'bg-slate-300 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 hover:-translate-y-1'
                }`}
            >
                <RefreshCw className={`w-6 h-6 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Datos Ahora'}
            </button>

            <p className="mt-6 text-xs text-slate-400">
                Si el problema persiste, revisa la configuración en la pestaña "Importar Datos".
            </p>
         </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-8 animate-fadeIn relative">
      
      {/* Toast Notification */}
      {syncStatus !== 'idle' && (
        <div className={`fixed top-24 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 border transition-all duration-300 animate-in slide-in-from-right-10 ${
          syncStatus === 'success' 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
            : 'bg-red-50 text-red-700 border-red-100'
        }`}>
          {syncStatus === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-bold text-sm">{toastMsg}</span>
        </div>
      )}

      {/* Fecha de actualización */}
      {lastSync && (
        <div className="flex justify-center -mt-6 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200">
                <Clock className="w-3 h-3" />
                Última actualización: {lastSync}
            </span>
        </div>
      )}

      {/* Search Header */}
      <div className="flex items-center gap-4 max-w-3xl mx-auto">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-indigo-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-12 pr-32 py-4 bg-white border-2 border-indigo-100 rounded-full text-gray-700 placeholder-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 text-lg shadow-sm transition-all"
            placeholder="Buscar por RUT, Nombre o Patente..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none">
            <span className="text-xs font-semibold text-indigo-300 bg-indigo-50 px-2 py-1 rounded-md">
              {filteredData.length} Resultados
            </span>
          </div>
        </div>

        {/* Sync Button */}
        <button
          onClick={handleQuickSync}
          disabled={isSyncing}
          className={`h-14 w-14 flex-shrink-0 rounded-full border-2 flex items-center justify-center shadow-sm transition-all ${
            isSyncing 
              ? 'bg-indigo-50 border-indigo-200 cursor-not-allowed' 
              : 'bg-white border-indigo-100 hover:border-orange-300 hover:text-orange-500 text-slate-400 hover:shadow-md active:scale-95'
          }`}
          title="Sincronizar datos ahora"
        >
          <RefreshCw className={`w-6 h-6 ${isSyncing ? 'animate-spin text-indigo-500' : ''}`} />
        </button>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredData.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white/50 rounded-3xl border border-dashed border-gray-300">
            <Search className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <p className="text-xl text-gray-500 font-medium">No se encontraron registros</p>
            <p className="text-gray-400">Intenta buscar por otro término o sincroniza nuevamente.</p>
          </div>
        ) : (
          filteredData.map((person) => (
            <div 
              key={person.id} 
              className="bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 overflow-hidden"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold shadow-inner ${
                    person.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {person.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">{person.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      <span>{person.group.split('/').pop()}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white px-3 py-1 rounded-lg text-xs font-mono font-bold text-slate-600 shadow-sm border border-slate-100">
                  {person.rut}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4">
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Building className="w-3 h-3" /> Departamento
                    </span>
                    <span className="text-slate-700 font-medium">{person.department || 'N/A'}</span>
                  </div>
                   <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1">
                      <IdCard className="w-3 h-3" /> Cargo
                    </span>
                    <span className="text-slate-700 font-medium">{person.role || 'No especificado'}</span>
                  </div>
                  <div className="flex flex-col gap-1 col-span-2">
                    <span className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> Email
                    </span>
                    <a href={`mailto:${person.email}`} className="text-indigo-600 hover:underline truncate">
                      {person.email}
                    </a>
                  </div>
                </div>

                {/* Vehicles Section */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs uppercase font-bold text-slate-400 mb-3 block flex items-center gap-1">
                    <Car className="w-3 h-3" /> Vehículos Registrados
                  </span>
                  
                  {person.vehicles.length > 0 ? (
                    <div className="space-y-2">
                      {person.vehicles.map((vehicle, idx) => (
                        <div key={`${vehicle.plate}-${idx}`} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded border-2 border-indigo-800 shadow-sm">
                              CL
                            </div>
                            <span className="font-mono text-lg font-bold text-slate-800 tracking-wider">
                              {vehicle.plate}
                            </span>
                          </div>
                          <div className="text-right text-xs">
                            <div className="font-bold text-slate-700">{vehicle.brand}</div>
                            <div className="text-slate-400">{vehicle.color}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400 italic bg-slate-50 p-2 rounded text-center">
                      Sin vehículos registrados
                    </div>
                  )}
                </div>

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SearchTab;
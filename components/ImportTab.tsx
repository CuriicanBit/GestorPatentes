import React, { useState } from 'react';
import { PersonRecord, Vehicle } from '../types';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, RefreshCw, HelpCircle, Settings, X, Save } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportTabProps {
  onImport: (newData: PersonRecord[]) => void;
  onReset: () => void;
}

// Default mapping configuration including Spanish (from image) and English potential headers
const DEFAULT_MAPPING = {
  name: ['NOMBRE', 'NAME', 'FULL NAME'],
  id: ['ID', 'INTERNAL ID'],
  group: ['GRUPO', 'GROUP'],
  gender: ['GENERO', 'GÉNERO', 'GENDER'],
  email: ['EMAIL', 'CORREO', 'MAIL', 'E-MAIL'],
  rut: ['RUT', 'NATIONAL ID', 'DNI'],
  department: ['DEPARTAMENTO', 'DEPARTMENT', 'AREA'],
  role: ['CARGO', 'ROLE', 'JOB TITLE', 'POSITION'],
  plate1: ['PATENTE 1', 'PATENTE', 'LICENSE PLATE 1', 'PLATE 1', 'PLATE'],
  brand1: ['MARCA 1', 'MARCA', 'BRAND 1', 'MAKE 1', 'BRAND'],
  color1: ['COLOR VEHICULO', 'COLOR', 'COLOR 1'],
  plate2: ['PATENTE 2', 'LICENSE PLATE 2', 'PLATE 2'],
  brand2: ['MARCA 2', 'BRAND 2', 'MAKE 2'],
  color2: ['COLOR 2', 'COLOR VEHICULO 2', 'SECOND COLOR']
};

const ImportTab: React.FC<ImportTabProps> = ({ onImport, onReset }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  
  // Mapping State
  const [showConfig, setShowConfig] = useState(false);
  const [mapping, setMapping] = useState(DEFAULT_MAPPING);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleMappingChange = (key: keyof typeof DEFAULT_MAPPING, value: string) => {
    setMapping(prev => ({
      ...prev,
      [key]: value.split(',').map(s => s.trim().toUpperCase())
    }));
  };

  const getMappingString = (key: keyof typeof DEFAULT_MAPPING) => {
    return mapping[key].join(', ');
  };

  const processDataRows = (rows: any[][]) => {
    try {
       if (rows.length < 1) throw new Error("El archivo está vacío.");

       // 1. Identify the Header Row
       // We scan the first 15 rows to find one that matches enough of our mapping keys
       let headerRowIndex = -1;
       let headers: string[] = [];

       for (let i = 0; i < Math.min(rows.length, 15); i++) {
         const rowStr = rows[i].map(c => String(c).toUpperCase().trim());
         
         // Heuristic: If row contains at least the Name and (ID or RUT or Plate) keywords configured
         const hasName = mapping.name.some(k => rowStr.includes(k));
         const hasIdOrRut = mapping.id.some(k => rowStr.includes(k)) || mapping.rut.some(k => rowStr.includes(k));
         const hasPlate = mapping.plate1.some(k => rowStr.includes(k));

         if (hasName && (hasIdOrRut || hasPlate)) {
           headerRowIndex = i;
           headers = rowStr;
           break;
         }
       }

       if (headerRowIndex === -1) {
         throw new Error("No se encontró la fila de cabecera. Verifique 'Configuración de Columnas' si sus cabeceras son diferentes.");
       }

       // 2. Map Column Indexes based on dynamic mapping state
       const getIndex = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h === k || h.includes(k)));

       const idxName = getIndex(mapping.name);
       const idxId = getIndex(mapping.id); 
       const idxGroup = getIndex(mapping.group);
       const idxGender = getIndex(mapping.gender);
       const idxEmail = getIndex(mapping.email);
       const idxRut = getIndex(mapping.rut); 
       const idxDept = getIndex(mapping.department);
       const idxCargo = getIndex(mapping.role);
       
       // Vehicle 1
       const idxPatente1 = getIndex(mapping.plate1);
       const idxMarca1 = getIndex(mapping.brand1);
       const idxColor1 = getIndex(mapping.color1);

       // Vehicle 2
       const idxPatente2 = getIndex(mapping.plate2);
       const idxMarca2 = getIndex(mapping.brand2);
       const idxColor2 = getIndex(mapping.color2);

       const parsedData: PersonRecord[] = [];

       // 3. Iterate Data Rows
       for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const getVal = (idx: number) => (idx > -1 && row[idx] !== undefined) ? String(row[idx]).trim() : '';
        
        const nameVal = getVal(idxName);
        // We prefer the RUT from the RUT column, if empty use ID
        let rutVal = getVal(idxRut);
        if (!rutVal) rutVal = getVal(idxId);

        // Skip rows without at least a Name or a Plate
        const p1 = getVal(idxPatente1);
        if (!nameVal && !p1) continue;

        const vehicles: Vehicle[] = [];
        
        // Add Vehicle 1
        if (p1 && p1.length > 1) {
          vehicles.push({
            plate: p1,
            brand: getVal(idxMarca1) || 'Desconocido',
            color: getVal(idxColor1) || ''
          });
        }

        // Add Vehicle 2
        const p2 = getVal(idxPatente2);
        if (p2 && p2.length > 1) {
          vehicles.push({
            plate: p2,
            brand: getVal(idxMarca2) || 'Desconocido',
            color: getVal(idxColor2) || ''
          });
        }

        const person: PersonRecord = {
          id: getVal(idxId) || Math.random().toString(36).substr(2, 9),
          name: nameVal || 'Sin Nombre',
          rut: rutVal,
          email: getVal(idxEmail),
          department: getVal(idxDept),
          role: getVal(idxCargo),
          group: getVal(idxGroup) || 'Externo',
          gender: getVal(idxGender) || 'Unspecified',
          vehicles: vehicles
        };

        parsedData.push(person);
      }

      if (parsedData.length === 0) {
        throw new Error("No se pudieron extraer registros. Verifique que el Excel tenga datos debajo de las cabeceras.");
      }

      onImport(parsedData);
      setSuccessCount(parsedData.length);
      setError(null);
      setShowConfig(false); // Close config on success

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al procesar los datos.");
      setSuccessCount(null);
    }
  }

  const parseCSV = (text: string) => {
    const lines = text.split('\n');
    const separator = text.indexOf(';') > -1 ? ';' : ',';
    
    const rows = lines.map(line => {
       return line.trim().split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
    });
    processDataRows(rows);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setError(null);
    setSuccessCount(null);

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExt === 'xlsx' || fileExt === 'xls') {
       const reader = new FileReader();
       reader.onload = (e) => {
         const data = e.target?.result;
         if (data) {
           try {
             const workbook = XLSX.read(data, { type: 'array' });
             const firstSheetName = workbook.SheetNames[0];
             const worksheet = workbook.Sheets[firstSheetName];
             // get raw data including empty cells
             const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
             processDataRows(jsonData);
           } catch (err) {
             console.error(err);
             setError("Error al leer el archivo Excel. Asegúrate de que sea un archivo válido.");
           }
         }
       };
       reader.readAsArrayBuffer(file);
    } else {
       const reader = new FileReader();
       reader.onload = (e) => {
         const text = e.target?.result;
         if (typeof text === 'string') {
           parseCSV(text);
         }
       };
       reader.readAsText(file);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="bg-orange-50 p-8 border-b border-orange-100 text-center relative">
          <FileSpreadsheet className="w-12 h-12 text-orange-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-orange-900 mb-2">Importar Registros</h2>
          <p className="text-orange-700 max-w-lg mx-auto">
            Sube tu archivo Excel (.xlsx) para actualizar la base de datos.
          </p>
          
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="absolute top-6 right-6 p-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-full transition-colors flex items-center gap-2 text-xs font-bold"
            title="Configurar columnas"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Configurar Columnas</span>
          </button>
        </div>

        {/* Configuration Panel */}
        {showConfig && (
          <div className="bg-slate-50 border-b border-slate-200 p-6 animate-in slide-in-from-top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-500" />
                Mapeo de Columnas (Separar por comas)
              </h3>
              <button onClick={() => setShowConfig(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Nombre</label>
                <input 
                  type="text" 
                  value={getMappingString('name')}
                  onChange={(e) => handleMappingChange('name', e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">RUT / ID Nacional</label>
                <input 
                  type="text" 
                  value={getMappingString('rut')}
                  onChange={(e) => handleMappingChange('rut', e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                />
              </div>
               <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ID Interno</label>
                <input 
                  type="text" 
                  value={getMappingString('id')}
                  onChange={(e) => handleMappingChange('id', e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
                <input 
                  type="text" 
                  value={getMappingString('email')}
                  onChange={(e) => handleMappingChange('email', e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                />
              </div>
               <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Departamento</label>
                <input 
                  type="text" 
                  value={getMappingString('department')}
                  onChange={(e) => handleMappingChange('department', e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                />
              </div>
               <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Cargo</label>
                <input 
                  type="text" 
                  value={getMappingString('role')}
                  onChange={(e) => handleMappingChange('role', e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                />
              </div>

              <div className="col-span-full border-t border-slate-200 pt-4 mt-2">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wide">Vehículo 1</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Patente</label>
                <input 
                  type="text" 
                  value={getMappingString('plate1')}
                  onChange={(e) => handleMappingChange('plate1', e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Marca</label>
                <input 
                  type="text" 
                  value={getMappingString('brand1')}
                  onChange={(e) => handleMappingChange('brand1', e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                />
              </div>
               <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Color</label>
                <input 
                  type="text" 
                  value={getMappingString('color1')}
                  onChange={(e) => handleMappingChange('color1', e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                />
              </div>

              <div className="col-span-full border-t border-slate-200 pt-4 mt-2">
                 <span className="text-xs font-bold text-indigo-500 uppercase tracking-wide">Vehículo 2</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Patente</label>
                <input 
                  type="text" 
                  value={getMappingString('plate2')}
                  onChange={(e) => handleMappingChange('plate2', e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Marca</label>
                <input 
                  type="text" 
                  value={getMappingString('brand2')}
                  onChange={(e) => handleMappingChange('brand2', e.target.value)}
                  className="w-full border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
               <button 
                onClick={() => setShowConfig(false)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
               >
                 <Save className="w-4 h-4" />
                 Listo
               </button>
            </div>
          </div>
        )}

        <div className="p-8">
          <div 
            className={`
              relative border-4 border-dashed rounded-xl p-12 text-center transition-all duration-300
              ${dragActive ? 'border-indigo-400 bg-indigo-50 scale-[1.02]' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}
              ${successCount !== null ? 'border-emerald-200 bg-emerald-50' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleChange}
              accept=".csv,.txt,.xlsx,.xls"
            />
            
            {successCount !== null ? (
              <div className="text-emerald-600 animate-in zoom-in duration-300">
                <CheckCircle className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-xl font-bold">¡Importación Exitosa!</h3>
                <p className="font-medium text-emerald-700 mt-2">{successCount} registros procesados correctamente.</p>
                <p className="text-sm mt-4 text-emerald-500">Redireccionando a búsqueda...</p>
              </div>
            ) : (
              <div className="text-gray-500">
                <Upload className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-bold text-gray-700 mb-1">Arrastra tu archivo Excel aquí</h3>
                <p className="text-sm">o haz clic para buscar en tu equipo</p>
                <div className="flex items-center justify-center gap-2 mt-6 text-xs text-gray-400 bg-white inline-block px-4 py-2 rounded-full shadow-sm">
                  <HelpCircle className="w-3 h-3" />
                  Soporta .XLSX, .XLS y .CSV
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error de Importación</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <button 
              onClick={() => {
                onReset();
                setSuccessCount(null);
                setError(null);
              }}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors px-4 py-2 rounded-lg hover:bg-indigo-50"
            >
              <RefreshCw className="w-4 h-4" />
              Restaurar datos de ejemplo
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ImportTab;
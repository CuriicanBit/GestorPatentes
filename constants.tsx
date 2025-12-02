import { PersonRecord } from './types';

// Data transcribed from the user's image for the initial state
export const INITIAL_DATA: PersonRecord[] = [
  {
    id: '11657554K',
    name: 'Gina Alejandra Campos Puga',
    rut: '11.657.554-K',
    group: 'All Persons and Vehicles/Docentes',
    gender: 'Female',
    email: 'gina.campos@cloud.uautonoma.cl',
    department: 'Docencia',
    role: '',
    vehicles: [
      { plate: 'JBYJ46', brand: 'Honda', color: 'Gray' }
    ]
  },
  {
    id: '170391152',
    name: 'Belén Francisca Valdés Villalobos',
    rut: '17.039.115-2',
    group: 'All Persons and Vehicles/Auxiliares',
    gender: 'Female',
    email: 'belen.valdes@uautonoma.cl',
    department: 'Facultad de educación',
    role: '',
    vehicles: [
      { plate: 'PRHL12', brand: 'Volkswagen', color: 'Gray' }
    ]
  },
  {
    id: '125221912',
    name: 'Jose Manuel Santibañez Orellana',
    rut: '12.522.191-2',
    group: 'All Persons and Vehicles/Docentes',
    gender: 'Male',
    email: 'acdelegal@gmail.com',
    department: 'Facultad Derecho',
    role: 'Docente Adjunto',
    vehicles: [
      { plate: 'VFRL15', brand: 'Unknown', color: 'White' }
    ]
  },
  {
    id: '178217429',
    name: 'Emilia Andrea Escalona Miño',
    rut: '17.821.742-9',
    group: 'All Persons and Vehicles/Alumnos',
    gender: 'Female',
    email: 'emilia.escalona@uautonoma.cl',
    department: 'Instituto de Ciencias Biomédicas',
    role: '',
    vehicles: [
      { plate: 'GDBL99', brand: 'Toyota', color: 'Red' }
    ]
  },
  {
    id: '83010959',
    name: 'Reinaldo Lagos Robledo',
    rut: '8.301.095-9',
    group: 'All Persons and Vehicles/Docentes',
    gender: 'Male',
    email: 'reinaldo.lr@gmail.com',
    department: 'Facultad Derecho',
    role: 'Docente Adjunto',
    vehicles: [
      { plate: 'JHHY33', brand: 'Hyundai', color: 'Gray' },
      { plate: 'SKTL23', brand: 'Mitsubishi', color: '' }
    ]
  },
  {
    id: '151384722',
    name: 'Claudio Herrera Andrades',
    rut: '15.138.472-2',
    group: 'All Persons and Vehicles/Docentes',
    gender: 'Male',
    email: 'claudio.herrera@hymabogados.cl',
    department: 'Facultad Derecho',
    role: 'Docente Adjunto',
    vehicles: [
      { plate: 'GGVT60', brand: 'Unknown', color: 'Blue' }
    ]
  }
];

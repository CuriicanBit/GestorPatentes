export interface Vehicle {
  plate: string;
  brand: string;
  color: string;
}

export interface PersonRecord {
  id: string; // The internal ID or UUID
  name: string;
  rut: string;
  email: string;
  department: string;
  role: string;
  group: string;
  gender: string;
  vehicles: Vehicle[];
}

export type TabView = 'search' | 'import';

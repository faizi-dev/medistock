import type { Timestamp } from 'firebase/firestore';

export interface MedicalItem {
  id: string;
  name: string;
  barcode: string;
  quantity: number;
  expirationDate: Timestamp;
  vehicleId: string;
  lowStockThreshold: number;
}

export interface Vehicle {
  id: string;
  name: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  role: 'Admin' | 'Staff';
}

export interface ReorderingSuggestion {
  itemName: string;
  quantityToReorder: number;
  reason: string;
}

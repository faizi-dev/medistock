import type { Timestamp } from 'firebase/firestore';

export interface MedicalItem {
  id: string;
  name: string;
  barcode?: string;
  quantity: number;
  targetQuantity: number;
  expirationDate: Timestamp | null;
  vehicleId: string;
  createdAt: Timestamp;
  createdBy: { uid: string; name: string; };
  updatedAt?: Timestamp;
  updatedBy?: { uid: string; name: string; };
}

export interface Vehicle {
  id: string;
  name: string;
  createdAt: Timestamp;
  createdBy: { uid: string; name: string; };
  updatedAt?: Timestamp;
  updatedBy?: { uid: string; name: string; };
}

export interface UserProfile {
  uid: string;
  email: string | null;
  role: 'Admin' | 'Staff';
  phone?: string;
  fullName: string;
  createdAt: Timestamp;
}

export interface ReorderingSuggestion {
  itemName: string;
  quantityToReorder: number;
  reason: string;
}

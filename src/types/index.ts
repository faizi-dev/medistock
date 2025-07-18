
import type { Timestamp } from 'firebase/firestore';

export interface MedicalItemBatch {
  quantity: number;
  expirationDate: Timestamp | null;
  deliveryDate?: Timestamp | null;
}

export interface MedicalItem {
  id: string;
  name: string;
  barcode?: string;
  targetQuantity: number;
  moduleId: string;
  batches: MedicalItemBatch[];
  notes?: string;
  // Calculated fields, not stored in DB but useful on client
  quantity?: number; 
  earliestExpiration?: Timestamp | null;

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

export interface Case {
    id: string;
    name: string;
    vehicleId: string;
    createdAt: Timestamp;
    createdBy: { uid: string; name: string; };
    updatedAt?: Timestamp;
    updatedBy?: { uid:string; name: string; };
}

export interface ModuleBag {
    id: string;
    name: string;
    caseId: string;
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


'use server';

import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import * as z from 'zod';

const CreateUserSchema = z.object({
  fullName: z.string().min(1, { message: 'Full name is required.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long.' }),
  phone: z.string().optional(),
  role: z.enum(['Admin', 'Staff']),
});

export async function createUser(prevState: any, formData: FormData) {
  try {
    const validatedFields = CreateUserSchema.safeParse({
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      password: formData.get('password'),
      phone: formData.get('phone'),
      role: formData.get('role'),
    });

    if (!validatedFields.success) {
      return {
        type: 'error',
        message: 'Invalid form data. Please check the fields and try again.',
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }
    
    const { fullName, email, password, phone, role } = validatedFields.data;

    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: fullName,
    });
    
    await adminDb.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      fullName: fullName,
      role: role,
      phone: phone || '',
      createdAt: Timestamp.now(),
    });

    return { type: 'success', message: `User ${email} created successfully.` };
  } catch (error: any) {
    console.error('Error creating user:', error);

    let message = 'An unexpected error occurred. Please check the server logs for more details.';

    if (error.message && (error.message.includes('Error fetching access token') || error.message.includes('Credential implementation provided to initializeApp()'))) {
        message = 'Could not authenticate with Firebase. This is likely a server configuration issue. Please ensure the service account for your App Hosting backend has the "Service Account Token Creator" IAM role in your Google Cloud project.';
    } else {
        switch (error.code) {
            case 'auth/email-already-exists':
                message = 'This email is already in use by another account.';
                break;
            case 'auth/invalid-password':
                message = 'The password must be a string with at least six characters.';
                break;
            case 'auth/invalid-email':
                message = 'The email address provided is not valid.';
                break;
            case 'auth/internal-error':
                message = 'An internal Firebase error occurred. This could be due to a service account permissions issue or a disabled API. Please check your project configuration and server logs.';
                break;
            default:
                if (error.message) {
                  message = error.message;
                }
                break;
        }
    }
    
    return { type: 'error', message };
  }
}

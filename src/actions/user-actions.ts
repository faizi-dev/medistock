
'use server';

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as z from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long.' }),
  phone: z.string().optional(),
  role: z.enum(['Admin', 'Staff']),
});

// Initialize Firebase Admin SDK if not already initialized
function initializeFirebaseAdmin(): App {
    if (getApps().length) {
        return getApps()[0];
    }
    // In a Google Cloud environment (like Firebase App Hosting),
    // initializeApp() will automatically use Application Default Credentials.
    return initializeApp();
}

export async function createUser(prevState: any, formData: FormData) {
  try {
    initializeFirebaseAdmin();

    const validatedFields = CreateUserSchema.safeParse({
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
    
    const { email, password, phone, role } = validatedFields.data;

    const userRecord = await getAuth().createUser({
      email,
      password,
    });
    
    await getFirestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      role: role,
      phone: phone || '',
    });

    return { type: 'success', message: `User ${email} created successfully.` };
  } catch (error: any) {
    console.error('Error creating user:', error);

    let message = 'An unexpected error occurred. Please check the server logs for more details.';

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
    
    return { type: 'error', message };
  }
}

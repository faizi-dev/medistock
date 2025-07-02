import { NextResponse } from 'next/server';
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

export async function POST(req: Request) {
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authorization.split('Bearer ')[1];
    
    // Verify the admin user's token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const adminUid = decodedToken.uid;
    
    // Check if the user is an Admin
    const adminUserDoc = await adminDb.collection('users').doc(adminUid).get();
    if (!adminUserDoc.exists || adminUserDoc.data()?.role !== 'Admin') {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validatedFields = CreateUserSchema.safeParse(body);

    if (!validatedFields.success) {
      return NextResponse.json(
          {
            message: 'Invalid form data. Please check the fields and try again.',
            errors: validatedFields.error.flatten().fieldErrors,
          }, 
          { status: 400 }
      );
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

    return NextResponse.json({ message: `User ${email} created successfully.` }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);

    let message = 'An unexpected error occurred. Please check the server logs for more details.';
    let status = 500;

    if (error.message && (error.message.includes('Error fetching access token') || error.message.includes('Credential implementation provided to initializeApp()'))) {
        message = 'Could not authenticate with Firebase. This is a server configuration issue, not an application code bug. The service account for your App Hosting backend is missing a required permission. Please go to the Google Cloud Console for your project, find the service account used by App Hosting, and add the "Service Account Token Creator" IAM role to it.';
    } else {
        switch (error.code) {
            case 'auth/email-already-exists':
                message = 'This email is already in use by another account.';
                status = 409;
                break;
            case 'auth/invalid-password':
                message = 'The password must be a string with at least six characters.';
                status = 400;
                break;
            case 'auth/invalid-email':
                message = 'The email address provided is not valid.';
                status = 400;
                break;
            case 'auth/internal-error':
                message = 'An internal Firebase error occurred. This could be due to a service account permissions issue or a disabled API. Please check your project configuration and server logs.';
                break;
            case 'auth/id-token-expired':
            case 'auth/id-token-revoked':
                message = 'Your session has expired. Please log in again.';
                status = 401;
                break;
            default:
                if (error.message) {
                  message = error.message;
                }
                break;
        }
    }
    
    return NextResponse.json({ message }, { status });
  }
}

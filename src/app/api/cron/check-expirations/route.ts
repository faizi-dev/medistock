import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import type { MedicalItem, UserProfile } from '@/types';

const DEFAULT_TEMPLATE = `<h1>MediStock Expiration Alert</h1>
<p>The following items in your inventory are expiring within the next 6 weeks:</p>
<ul>
  {{{itemsListHtml}}}
</ul>
<p>Please review your stock and take appropriate action.</p>
<p>This is an automated notification from your MediStock system.</p>`;

export async function GET(req: Request) {
  const authToken = req.headers.get('Authorization')?.split('Bearer ')[1];

  // if (!process.env.CRON_SECRET || authToken !== process.env.CRON_SECRET) {
  //   return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  // }

  try {
    console.log('Cron job started: Checking for expiring items.');

    // 1. Find all admin users
    const adminsSnapshot = await adminDb.collection('users').where('role', '==', 'Admin').get();
    if (adminsSnapshot.empty) {
      console.log('No admin users found. Exiting cron job.');
      return NextResponse.json({ message: 'No admin users found to notify.' });
    }

    const adminEmails = adminsSnapshot.docs
      .map(doc => (doc.data() as UserProfile).email)
      .filter((email): email is string => !!email);

    if (adminEmails.length === 0) {
      console.log('No admin users with emails found. Exiting cron job.');
      return NextResponse.json({ message: 'No admin users with emails found to notify.' });
    }

    // 2. Find items expiring in the next 42 days
    const now = new Date();
    const fortyTwoDaysFromNow = new Date();
    fortyTwoDaysFromNow.setDate(now.getDate() + 42);

    const itemsSnapshot = await adminDb
      .collection('items')
      .where('expirationDate', '>', Timestamp.fromDate(now))
      .where('expirationDate', '<=', Timestamp.fromDate(fortyTwoDaysFromNow))
      .get();

    if (itemsSnapshot.empty) {
      console.log('No items expiring soon. Exiting cron job.');
      return NextResponse.json({ message: 'No items expiring soon.' });
    }

    const expiringItems = itemsSnapshot.docs.map(doc => doc.data() as MedicalItem);

    // 3. Fetch email template
    const emailSettingsDoc = await adminDb.collection('settings').doc('email').get();
    const emailTemplate = emailSettingsDoc.exists && emailSettingsDoc.data()?.template
      ? emailSettingsDoc.data()!.template
      : DEFAULT_TEMPLATE;

    // 4. Send email
    await sendExpirationEmail(adminEmails, expiringItems, emailTemplate);

    console.log(`Cron job finished. Notified ${adminEmails.length} admin(s) about ${expiringItems.length} expiring item(s).`);
    return NextResponse.json({ message: 'Expiration check complete. Notifications sent.' });

  } catch (error: any) {
    console.error('Error in cron job:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        message: 'Internal Server Error',
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function sendExpirationEmail(adminEmails: string[], items: MedicalItem[], template: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.error('SMTP environment variables are not set. Cannot send email.');
    throw new Error('SMTP configuration is missing on the server.');
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: parseInt(SMTP_PORT, 10) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const itemsListHtml = items
    .map(item => `<li><b>${item.name}</b> (Quantity: ${item.quantity}) - Expires on ${item.expirationDate!.toDate().toLocaleDateString()}</li>`)
    .join('');

  const emailHtml = template.replace('{{{itemsListHtml}}}', itemsListHtml);

  const mailOptions = {
    from: `"MediStock Alert" <${SMTP_USER}>`,
    to: adminEmails.join(', '),
    subject: 'MediStock Inventory - Expiration Alert',
    html: emailHtml,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Expiration alert email sent successfully.');
  } catch (error: any) {
    console.error('Failed to send expiration email:', {
      message: error.message,
      code: error.code,
      response: error.response,
    });
    throw new Error(error.message || 'Failed to send email via SMTP.');
  }
}

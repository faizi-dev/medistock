# **App Name**: MediStock

## Core Features:

- Inventory Overview: Dashboard to overview inventory, including list view with filters for vehicle, expiration date, item type and stock status
- Item Management: Form to add/edit/delete medical supply items including fields for name, barcode, quantity, expiration, and vehicle assignment.
- Barcode Entry: Barcode scanner integration, enabling users to add or search items by scanning barcodes.
- Vehicle Management: Vehicle management UI: add, edit, and remove vehicles, and assign items to vehicles. View inventory per vehicle.
- Smart Alerts: AI-powered tool to analyze supply levels and expiration dates to predict potential shortages and recommend reordering actions.
- User Authentication: User authentication system, role-based access controls to secure functionalities. Authentication via email and password using Firebase Authentication
- Data Self-Management: A fully self-managed system via a Firestore-backed UI, including item, user and vehicle management, with no need for external admin panels.

## Style Guidelines:

- Primary color: Deep sky blue (#3498db), conveying a sense of trust, dependability and technological focus
- Background color: Very light blue (#EBF5FB) giving a clean and professional backdrop that avoids stark contrast.
- Accent color: Sea green (#4CAF50) for positive actions and notifications such as success messages or available stock.
- Headline font: 'Poppins' (sans-serif) for a clean, modern and easily readable appearance.
- Body font: 'Inter' (sans-serif) for its readability and neutral aesthetic in body text.
- Use a set of modern, minimalist icons to represent various supplies, vehicles, and actions within the system.
- Implement subtle animations and transitions for feedback. Use toast messages, form validation feedback, and other actions
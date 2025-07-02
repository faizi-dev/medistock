
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isFirebaseConfigError = 
    error.message.includes('Firebase configuration is missing') || 
    error.message.includes('invalid-api-key');

  return (
    <html>
      <head>
        <title>Application Error</title>
        <style>{`
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: #f8f9fa; color: #212529; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .container { max-width: 700px; background-color: #fff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 2rem; border: 1px solid #dee2e6; }
          h1 { font-size: 1.75rem; margin-top: 0; margin-bottom: 0.5rem; color: #c52929; }
          h2 { font-size: 1.25rem; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid #dee2e6; padding-bottom: 0.5rem; }
          p, li { font-size: 1rem; line-height: 1.6; color: #495057; }
          code { font-family: monospace; background-color: #e9ecef; padding: 0.2em 0.4em; border-radius: 3px; }
          a { color: #007bff; text-decoration: none; }
          a:hover { text-decoration: underline; }
          button { font-size: 1rem; color: #fff; background-color: #007bff; border: 1px solid #007bff; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; transition: background-color 0.2s; margin-top: 1rem;}
          button:hover { background-color: #0056b3; }
          .error-details { margin-top: 2rem; font-size: 0.8rem; color: #6c757d; }
          ul { padding-left: 20px; }
        `}</style>
      </head>
      <body>
        <div className="container">
          {isFirebaseConfigError ? (
            <div>
              <h1>Configuration Required</h1>
              <p>Your application needs to connect to Firebase, but the credentials in your <code>.env</code> file are missing or incorrect.</p>
              
              <h2>Step 1: Find Your Firebase Credentials</h2>
              <p>
                You can find the necessary values in your project's <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">Firebase Console</a>.
              </p>
              <ul>
                <li>For client-side keys (prefixed with <code>NEXT_PUBLIC_</code>), go to Project Settings &gt; General &gt; Your apps &gt; Firebase SDK snippet &gt; Config.</li>
                <li>For server-side keys, go to Project Settings &gt; Service accounts &gt; Generate new private key. This will download a file containing the credentials.</li>
              </ul>
              
              <h2>Step 2: Fill in the <code>.env</code> file</h2>
              <p>Copy the values from the Firebase console and the downloaded file into the appropriate variables in your root <code>.env</code> file. Once saved, reload this page.</p>

              <button onClick={() => window.location.reload()}>I've updated my .env file, Reload Page</button>
            </div>
          ) : (
            <div>
              <h1>Application Error</h1>
              <p>An unexpected error occurred. Please try again.</p>
              <button onClick={() => reset()}>Try Again</button>
              <div className="error-details">
                <p><strong>Error:</strong> {error.message}</p>
              </div>
            </div>
          )}
        </div>
      </body>
    </html>
  );
}

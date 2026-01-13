import { GoogleSpreadsheet } from 'google-spreadsheet';
// import { JWT } from 'google-auth-library';
import templateCreds from '../credentials.template.json';

// Env variables
const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID;

export const getDoc = async () => {
    let creds = templateCreds;

    // Try to load real credentials if they exist (user must create this file)
    // Note: Vite dynamic import needs fully specified path usually or glob
    // We'll rely on a manual check or environment variables.

    // Best practice: Use Environment Variables for sensitive data in CI/CD
    const envCreds = {
        client_email: import.meta.env.VITE_GOOGLE_CLIENT_EMAIL,
        private_key: import.meta.env.VITE_GOOGLE_PRIVATE_KEY,
    };

    if (envCreds.client_email && envCreds.private_key) {
        creds = {
            ...creds,
            client_email: envCreds.client_email,
            private_key: envCreds.private_key.replace(/\\n/g, '\n'),
        };
    } else {
        // If running locally, you might want to uncomment this if you have the file
        // try {
        //    const mod = await import('../credentials.json');
        //    creds = mod.default;
        // } catch (e) {
        //    console.warn("Using template credentials. Please set VITE_XML_... or create credentials.json");
        // }
    }

    if (creds.private_key.includes("REPLACE_WITH")) {
        console.warn("Credentials not configured. Using offline mode.");
        return null;
    }

    /*
    const serviceAccountAuth = new JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    return doc;
    */
    console.warn("Cloud sync temporarily disabled due to library incompatibility.");
    return null;
};

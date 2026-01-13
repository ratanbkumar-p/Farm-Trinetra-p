import * as jose from 'jose';

// Helper to format key
const formatKey = (key) => {
    if (!key) return '';
    return key.replace(/\\n/g, '\n');
};

class CloudSync {
    constructor() {
        this.sheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;
        this.clientEmail = import.meta.env.VITE_GOOGLE_CLIENT_EMAIL;
        this.privateKey = formatKey(import.meta.env.VITE_GOOGLE_PRIVATE_KEY);
        this.accessToken = null;
        this.tokenExpiry = 0;
    }

    get isConfigured() {
        return this.sheetId && this.clientEmail && this.privateKey && !this.privateKey.includes('REPLACE_WITH');
    }

    async getAccessToken() {
        if (!this.isConfigured) return null;

        // Reuse token if valid
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const alg = 'RS256';
            const pkcs8 = await jose.importPKCS8(this.privateKey, alg);

            const jwt = await new jose.SignJWT({
                scope: 'https://www.googleapis.com/auth/spreadsheets'
            })
                .setProtectedHeader({ alg })
                .setIssuer(this.clientEmail)
                .setAudience('https://oauth2.googleapis.com/token')
                .setExpirationTime('1h')
                .setIssuedAt()
                .sign(pkcs8);

            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    assertion: jwt
                })
            });

            const data = await response.json();
            if (data.access_token) {
                this.accessToken = data.access_token;
                this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Buffer 1 min
                return this.accessToken;
            }
            throw new Error(data.error_description || 'Failed to get token');

        } catch (e) {
            console.error("Cloud Auth Error:", e);
            throw e;
        }
    }

    async appendRow(tabName, rowData) {
        // rowData = [col1, col2, col3...]
        const token = await this.getAccessToken();
        if (!token) return false;

        const range = `${tabName}!A1`;
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;

        try {
            await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    values: [rowData]
                })
            });
            return true;
        } catch (e) {
            console.error(`Failed to append to ${tabName}:`, e);
            return false;
        }
    }

    async readSheet(tabName) {
        const token = await this.getAccessToken();
        if (!token) return [];

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.sheetId}/values/${tabName}!A:Z`;
        try {
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            // Return rows excluding header if possible, or just raw
            // Provide array of objects if headers exist
            const rows = data.values || [];
            if (rows.length < 2) return [];

            const headers = rows[0];
            return rows.slice(1).map(row => {
                const obj = {};
                headers.forEach((h, i) => {
                    obj[h] = row[i];
                });
                return obj;
            });

        } catch (e) {
            console.error(`Failed to read ${tabName}:`, e);
            return [];
        }
    }
}

export const cloud = new CloudSync();

/**
 * PRODUCTION-GRADE GOOGLE DRIVE INTEGRATION
 * For your file-based backup approach - Simple and Reliable
 */

export interface GoogleDriveConfig {
    clientId: string;
    clientSecret: string;
    refreshToken?: string;
    accessToken?: string;
    tokenExpiresAt?: number;
    folderId?: string;
}

export interface GoogleDriveFile {
    id: string;
    name: string;
    size: number;
    createdTime: string;
    modifiedTime: string;
}

export class GoogleDriveProvider {
    private config: GoogleDriveConfig;
    private readonly API_BASE = 'https://www.googleapis.com';
    private readonly UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

    constructor(config: GoogleDriveConfig) {
        this.config = config;
    }

    /**
     * Upload database file to Google Drive
     */
    async uploadFile(
        data: Uint8Array,
        filename: string,
        onProgress?: (progress: number) => void
    ): Promise<string> {
        await this.ensureValidToken();

        const folderId = await this.ensureBackupFolder();

        // Use simple upload for database files (usually < 100MB)
        if (data.length < 5 * 1024 * 1024) { // < 5MB
            return this.simpleUpload(data, filename, folderId);
        } else {
            return this.resumableUpload(data, filename, folderId, onProgress);
        }
    }

    /**
     * Download database file from Google Drive
     */
    async downloadFile(fileId: string, onProgress?: (progress: number) => void): Promise<Uint8Array> {
        await this.ensureValidToken();

        const response = await fetch(
            `${this.API_BASE}/drive/v3/files/${fileId}?alt=media`,
            {
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }

        if (onProgress && response.body) {
            const contentLength = parseInt(response.headers.get('content-length') || '0');
            let downloaded = 0;

            const reader = response.body.getReader();
            const chunks: Uint8Array[] = [];

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                chunks.push(value);
                downloaded += value.length;

                if (contentLength > 0) {
                    onProgress(Math.round((downloaded / contentLength) * 100));
                }
            }

            // Combine chunks
            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const result = new Uint8Array(totalLength);
            let offset = 0;

            for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }

            return result;
        } else {
            const arrayBuffer = await response.arrayBuffer();
            return new Uint8Array(arrayBuffer);
        }
    }

    /**
     * List backup files in Google Drive
     */
    async listBackupFiles(): Promise<GoogleDriveFile[]> {
        await this.ensureValidToken();

        const folderId = await this.ensureBackupFolder();

        const response = await fetch(
            `${this.API_BASE}/drive/v3/files?` +
            `q=parents in '${folderId}' and name contains '.db'&` +
            `fields=files(id,name,size,createdTime,modifiedTime)&` +
            `orderBy=createdTime desc&` +
            `pageSize=100`,
            {
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`List files failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.files || [];
    }

    /**
     * Delete backup file from Google Drive
     */
    async deleteFile(fileId: string): Promise<void> {
        await this.ensureValidToken();

        const response = await fetch(
            `${this.API_BASE}/drive/v3/files/${fileId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
        }
    }

    /**
     * Check connection and get quota information
     */
    async getQuotaInfo(): Promise<{
        used: number;
        total: number;
        available: number;
    }> {
        await this.ensureValidToken();

        const response = await fetch(
            `${this.API_BASE}/drive/v3/about?fields=storageQuota`,
            {
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Quota check failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const quota = data.storageQuota;

        return {
            used: parseInt(quota.usage || '0'),
            total: parseInt(quota.limit || '0'),
            available: parseInt(quota.limit || '0') - parseInt(quota.usage || '0'),
        };
    }

    private async ensureValidToken(): Promise<void> {
        if (!this.config.accessToken) {
            throw new Error('No access token available. Please authenticate first.');
        }

        // Check if token is expired (with 5 minute buffer)
        const now = Date.now();
        const expiresAt = this.config.tokenExpiresAt || 0;

        if (expiresAt > 0 && now > (expiresAt - 5 * 60 * 1000)) {
            await this.refreshAccessToken();
        }
    }

    private async refreshAccessToken(): Promise<void> {
        if (!this.config.refreshToken) {
            throw new Error('No refresh token available. Please re-authenticate.');
        }

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                refresh_token: this.config.refreshToken,
                grant_type: 'refresh_token',
            }),
        });

        if (!response.ok) {
            throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        this.config.accessToken = data.access_token;
        this.config.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    }

    private async ensureBackupFolder(): Promise<string> {
        if (this.config.folderId) {
            return this.config.folderId;
        }

        // Search for existing backup folder
        const response = await fetch(
            `${this.API_BASE}/drive/v3/files?` +
            `q=name='Database Backups' and mimeType='application/vnd.google-apps.folder'&` +
            `fields=files(id,name)`,
            {
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Folder search failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.files && data.files.length > 0) {
            this.config.folderId = data.files[0].id;
            return this.config.folderId!;
        }

        // Create new backup folder
        const createResponse = await fetch(
            `${this.API_BASE}/drive/v3/files`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: 'Database Backups',
                    mimeType: 'application/vnd.google-apps.folder',
                }),
            }
        );

        if (!createResponse.ok) {
            throw new Error(`Folder creation failed: ${createResponse.status} ${createResponse.statusText}`);
        }

        const createData = await createResponse.json();
        this.config.folderId = createData.id;

        return this.config.folderId!;
    }

    private async simpleUpload(data: Uint8Array, filename: string, folderId: string): Promise<string> {
        const metadata = {
            name: filename,
            parents: [folderId],
        };

        const delimiter = '-------314159265358979323846';
        const boundary = `${delimiter}${Math.random()}`;

        const metadataBlob = new TextEncoder().encode(
            `--${boundary}\r\n` +
            `Content-Type: application/json\r\n\r\n` +
            `${JSON.stringify(metadata)}\r\n` +
            `--${boundary}\r\n` +
            `Content-Type: application/octet-stream\r\n\r\n`
        );

        const endBlob = new TextEncoder().encode(`\r\n--${boundary}--`);

        const body = new Uint8Array(metadataBlob.length + data.length + endBlob.length);
        body.set(metadataBlob, 0);
        body.set(data, metadataBlob.length);
        body.set(endBlob, metadataBlob.length + data.length);

        const response = await fetch(
            `${this.UPLOAD_BASE}/files?uploadType=multipart`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'Content-Type': `multipart/related; boundary="${boundary}"`,
                },
                body: body,
            }
        );

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        return result.id;
    }

    private async resumableUpload(
        data: Uint8Array,
        filename: string,
        folderId: string,
        onProgress?: (progress: number) => void
    ): Promise<string> {
        // Start resumable upload session
        const metadata = {
            name: filename,
            parents: [folderId],
        };

        const sessionResponse = await fetch(
            `${this.UPLOAD_BASE}/files?uploadType=resumable`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(metadata),
            }
        );

        if (!sessionResponse.ok) {
            throw new Error(`Session start failed: ${sessionResponse.status} ${sessionResponse.statusText}`);
        }

        const uploadUrl = sessionResponse.headers.get('location');
        if (!uploadUrl) {
            throw new Error('No upload URL received');
        }

        // Upload in chunks
        const chunkSize = 256 * 1024; // 256KB chunks
        const totalSize = data.length;
        let uploaded = 0;

        while (uploaded < totalSize) {
            const end = Math.min(uploaded + chunkSize, totalSize);
            const chunk = data.slice(uploaded, end);

            const response = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Range': `bytes ${uploaded}-${end - 1}/${totalSize}`,
                },
                body: chunk,
            });

            if (response.status === 308) {
                // Continue uploading
                uploaded = end;
                if (onProgress) {
                    onProgress(Math.round((uploaded / totalSize) * 100));
                }
            } else if (response.status === 200 || response.status === 201) {
                // Upload complete
                const result = await response.json();
                if (onProgress) {
                    onProgress(100);
                }
                return result.id;
            } else {
                throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }
        }

        throw new Error('Upload completed but no file ID received');
    }

    /**
     * Initialize Google Drive authentication
     * Returns the authorization URL for user to visit
     */
    static getAuthUrl(clientId: string, redirectUri: string): string {
        const scope = 'https://www.googleapis.com/auth/drive.file';
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: scope,
            response_type: 'code',
            access_type: 'offline',
            prompt: 'consent',
        });

        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    /**
     * Exchange authorization code for tokens
     */
    static async exchangeCodeForTokens(
        clientId: string,
        clientSecret: string,
        code: string,
        redirectUri: string
    ): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
    }> {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
            }),
        });

        if (!response.ok) {
            throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: Date.now() + (data.expires_in * 1000),
        };
    }
}

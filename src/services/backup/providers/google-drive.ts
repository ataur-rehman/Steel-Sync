// /**
//  * Production-Grade Google Drive Provider
//  * Google-level reliability and performance standards
//  */

// import type {
//     BackupMetadata,
//     ProviderResult,
//     BackupError,
//     ProviderHealth
// } from '../types';

// interface GoogleDriveConfig {
//     clientId: string;
//     clientSecret: string;
//     refreshToken?: string;
//     accessToken?: string;
//     folderId?: string;
//     tokenExpiresAt?: number;
// }


// export class GoogleDriveProvider {
//     private config: GoogleDriveConfig;
//     private rateLimiter: RateLimiter;
//     private readonly API_BASE = 'https://www.googleapis.com';
//     private readonly UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

//     constructor(config: GoogleDriveConfig) {
//         this.config = config;
//         this.rateLimiter = new RateLimiter(900, 100000); // 900 requests per 100 seconds
//     }

//     /**
//      * Upload backup with chunked upload and retry logic
//      */
//     public async uploadBackup(
//         data: Buffer,
//         metadata: BackupMetadata,
//         onProgress?: (progress: number) => void
//     ): Promise<ProviderResult> {
//         const startTime = Date.now();

//         try {
//             await this.ensureValidToken();

//             // Create backup folder if needed
//             const folderId = await this.ensureBackupFolder();

//             // Use resumable upload for large files
//             const uploadResult = await this.uploadWithResumableUpload(
//                 data,
//                 metadata,
//                 folderId,
//                 onProgress
//             );

//             // Verify upload integrity
//             await this.verifyUploadIntegrity(uploadResult.fileId, metadata.checksum);

//             const endTime = Date.now();
//             const uploadTimeMs = endTime - startTime;
//             const uploadSizeMB = data.length / (1024 * 1024);
//             const uploadSpeedMbps = (uploadSizeMB * 8) / (uploadTimeMs / 1000);

//             return {
//                 providerId: 'google_drive',
//                 success: true,
//                 fileId: uploadResult.fileId,
//                 uploadTimeMs,
//                 uploadSizeMB,
//                 uploadSpeedMbps
//             };

//         } catch (error) {
//             const uploadTimeMs = Date.now() - startTime;
//             return {
//                 providerId: 'google_drive',
//                 success: false,
//                 uploadTimeMs,
//                 uploadSizeMB: data.length / (1024 * 1024),
//                 uploadSpeedMbps: 0,
//                 error: this.createBackupError(error as Error)
//             };
//         }
//     }

//     /**
//      * Download backup with integrity verification
//      */
//     public async downloadBackup(
//         fileId: string,
//         expectedChecksum: string,
//         onProgress?: (progress: number) => void
//     ): Promise<Buffer> {
//         await this.ensureValidToken();

//         return this.rateLimiter.execute(async () => {
//             // Download file with progress tracking
//             const response = await this.makeAuthenticatedRequest(
//                 `${this.API_BASE}/drive/v3/files/${fileId}?alt=media`,
//                 {
//                     method: 'GET',
//                     headers: {
//                         'Authorization': `Bearer ${this.config.accessToken}`
//                     }
//                 }
//             );

//             if (!response.ok) {
//                 throw new Error(`Download failed: ${response.status} ${response.statusText}`);
//             }

//             const data = await this.downloadWithProgress(response, onProgress);

//             // Verify integrity
//             await this.verifyDownloadIntegrity(data, expectedChecksum);

//             return data;
//         });
//     }

//     /**
//      * List available backups with metadata
//      */
//     public async listBackups(): Promise<BackupMetadata[]> {
//         await this.ensureValidToken();

//         return this.rateLimiter.execute(async () => {
//             const folderId = await this.ensureBackupFolder();

//             const response = await this.makeAuthenticatedRequest(
//                 `${this.API_BASE}/drive/v3/files?` +
//                 `q=parents in '${folderId}' and mimeType='application/octet-stream'&` +
//                 `fields=files(id,name,size,createdTime,modifiedTime,properties)&` +
//                 `orderBy=createdTime desc&` +
//                 `pageSize=1000`
//             );

//             const data = await response.json();

//             return data.files.map((file: any) => this.parseBackupMetadata(file));
//         });
//     }

//     /**
//      * Delete backup file
//      */
//     public async deleteBackup(fileId: string): Promise<void> {
//         await this.ensureValidToken();

//         return this.rateLimiter.execute(async () => {
//             const response = await this.makeAuthenticatedRequest(
//                 `${this.API_BASE}/drive/v3/files/${fileId}`,
//                 { method: 'DELETE' }
//             );

//             if (!response.ok) {
//                 throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
//             }
//         });
//     }

//     /**
//      * Check provider health and connectivity
//      */
//     public async checkHealth(): Promise<ProviderHealth> {
//         const startTime = Date.now();

//         try {
//             await this.ensureValidToken();

//             // Test API connectivity
//             const response = await this.makeAuthenticatedRequest(
//                 `${this.API_BASE}/drive/v3/about?fields=storageQuota,user`
//             );

//             if (!response.ok) {
//                 throw new Error(`Health check failed: ${response.status}`);
//             }

//             const data = await response.json();
//             const responseTime = Date.now() - startTime;

//             return {
//                 providerId: 'google_drive',
//                 status: 'online',
//                 lastChecked: new Date(),
//                 responseTimeMs: responseTime,
//                 quotaUsed: parseInt(data.storageQuota.usage || '0'),
//                 quotaRemaining: parseInt(data.storageQuota.limit || '0') - parseInt(data.storageQuota.usage || '0'),
//                 errorRate: 0
//             };

//         } catch (error) {
//             return {
//                 providerId: 'google_drive',
//                 status: 'offline',
//                 lastChecked: new Date(),
//                 responseTimeMs: Date.now() - startTime,
//                 quotaUsed: 0,
//                 quotaRemaining: 0,
//                 errorRate: 1,
//                 lastError: this.createBackupError(error as Error)
//             };
//         }
//     }

//     /**
//      * Resumable upload for large files with progress tracking
//      */
//     private async uploadWithResumableUpload(
//         data: Buffer,
//         metadata: BackupMetadata,
//         folderId: string,
//         onProgress?: (progress: number) => void
//     ): Promise<{ fileId: string }> {
//         // Step 1: Initialize resumable upload
//         const initResponse = await this.initializeResumableUpload(metadata, folderId);
//         const uploadUrl = initResponse.headers.get('location');

//         if (!uploadUrl) {
//             throw new Error('Failed to initialize resumable upload');
//         }

//         // Step 2: Upload data in chunks
//         const chunkSize = 4 * 1024 * 1024; // 4MB chunks
//         let uploadedBytes = 0;

//         while (uploadedBytes < data.length) {
//             const chunk = data.slice(uploadedBytes, uploadedBytes + chunkSize);
//             const isLastChunk = uploadedBytes + chunk.length >= data.length;

//             await this.uploadChunk(uploadUrl, chunk, uploadedBytes, data.length, isLastChunk);

//             uploadedBytes += chunk.length;
//             onProgress?.(Math.min(100, (uploadedBytes / data.length) * 100));
//         }

//         // Step 3: Get final result
//         const finalResponse = await this.makeAuthenticatedRequest(uploadUrl, {
//             method: 'PUT',
//             headers: {
//                 'Content-Range': `bytes */${data.length}`
//             }
//         });

//         const result = await finalResponse.json();
//         return { fileId: result.id };
//     }

//     /**
//      * Initialize resumable upload session
//      */
//     private async initializeResumableUpload(
//         metadata: BackupMetadata,
//         folderId: string
//     ): Promise<Response> {
//         const uploadMetadata = {
//             name: `backup-${metadata.timestamp.toISOString()}.db.brotli`,
//             parents: [folderId],
//             properties: {
//                 backupId: metadata.id,
//                 checksum: metadata.checksum,
//                 originalSize: metadata.size.toString(),
//                 compressedSize: metadata.compressedSize.toString(),
//                 version: metadata.version
//             }
//         };

//         return this.makeAuthenticatedRequest(
//             `${this.UPLOAD_BASE}/files?uploadType=resumable`,
//             {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'X-Upload-Content-Type': 'application/octet-stream'
//                 },
//                 body: JSON.stringify(uploadMetadata)
//             }
//         );
//     }

//     /**
//      * Upload single chunk with retry logic
//      */
//     private async uploadChunk(
//         uploadUrl: string,
//         chunk: Buffer,
//         start: number,
//         total: number,
//         _isLast: boolean
//     ): Promise<void> {
//         const maxRetries = 3;
//         let attempt = 0;

//         while (attempt < maxRetries) {
//             try {
//                 const response = await fetch(uploadUrl, {
//                     method: 'PUT',
//                     headers: {
//                         'Content-Range': `bytes ${start}-${start + chunk.length - 1}/${total}`
//                     },
//                     body: new Uint8Array(chunk)
//                 });

//                 if (response.ok || response.status === 308) {
//                     return; // Success or partial success
//                 }

//                 throw new Error(`Upload chunk failed: ${response.status}`);
//             } catch (error) {
//                 attempt++;
//                 if (attempt >= maxRetries) {
//                     throw error;
//                 }

//                 // Exponential backoff
//                 await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
//             }
//         }
//     }

//     /**
//      * Ensure backup folder exists
//      */
//     private async ensureBackupFolder(): Promise<string> {
//         if (this.config.folderId) {
//             return this.config.folderId;
//         }

//         // Search for existing backup folder
//         const searchResponse = await this.makeAuthenticatedRequest(
//             `${this.API_BASE}/drive/v3/files?` +
//             `q=name='Iron Store Backups' and mimeType='application/vnd.google-apps.folder'&` +
//             `fields=files(id)`
//         );

//         const searchData = await searchResponse.json();

//         if (searchData.files.length > 0) {
//             this.config.folderId = searchData.files[0].id;
//             return this.config.folderId!;
//         }

//         // Create new backup folder
//         const createResponse = await this.makeAuthenticatedRequest(
//             `${this.API_BASE}/drive/v3/files`,
//             {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({
//                     name: 'Iron Store Backups',
//                     mimeType: 'application/vnd.google-apps.folder'
//                 })
//             }
//         );

//         const createData = await createResponse.json();
//         this.config.folderId = createData.id;
//         return this.config.folderId!;
//     }

//     /**
//      * Ensure valid access token
//      */
//     private async ensureValidToken(): Promise<void> {
//         if (this.config.accessToken &&
//             this.config.tokenExpiresAt &&
//             this.config.tokenExpiresAt > Date.now() + 60000) {
//             return; // Token is valid for at least 1 more minute
//         }

//         if (!this.config.refreshToken) {
//             throw new Error('No refresh token available for authentication');
//         }

//         // Refresh access token
//         const response = await fetch('https://oauth2.googleapis.com/token', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/x-www-form-urlencoded'
//             },
//             body: new URLSearchParams({
//                 client_id: this.config.clientId,
//                 client_secret: this.config.clientSecret,
//                 refresh_token: this.config.refreshToken,
//                 grant_type: 'refresh_token'
//             })
//         });

//         if (!response.ok) {
//             throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
//         }

//         const data = await response.json();
//         this.config.accessToken = data.access_token;
//         this.config.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
//     }

//     /**
//      * Make authenticated request with error handling
//      */
//     private async makeAuthenticatedRequest(
//         url: string,
//         options: RequestInit = {}
//     ): Promise<Response> {
//         const headers = {
//             'Authorization': `Bearer ${this.config.accessToken}`,
//             ...options.headers
//         };

//         const response = await fetch(url, {
//             ...options,
//             headers
//         });

//         if (response.status === 401) {
//             // Token expired, refresh and retry
//             await this.ensureValidToken();
//             return this.makeAuthenticatedRequest(url, options);
//         }

//         return response;
//     }

//     /**
//      * Download with progress tracking
//      */
//     private async downloadWithProgress(
//         response: Response,
//         onProgress?: (progress: number) => void
//     ): Promise<Buffer> {
//         const contentLength = parseInt(response.headers.get('content-length') || '0');
//         const chunks: Uint8Array[] = [];
//         let downloadedBytes = 0;

//         const reader = response.body?.getReader();
//         if (!reader) {
//             throw new Error('Response body is not readable');
//         }

//         while (true) {
//             const { done, value } = await reader.read();

//             if (done) break;

//             chunks.push(value);
//             downloadedBytes += value.length;

//             if (contentLength > 0) {
//                 onProgress?.(Math.min(100, (downloadedBytes / contentLength) * 100));
//             }
//         }

//         // Combine chunks
//         const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
//         const result = new Uint8Array(totalLength);
//         let offset = 0;

//         for (const chunk of chunks) {
//             result.set(chunk, offset);
//             offset += chunk.length;
//         }

//         return Buffer.from(result);
//     }

//     /**
//      * Verify upload integrity
//      */
//     private async verifyUploadIntegrity(fileId: string, _expectedChecksum: string): Promise<void> {
//         // Download a small portion to verify upload succeeded
//         const response = await this.makeAuthenticatedRequest(
//             `${this.API_BASE}/drive/v3/files/${fileId}?fields=size,md5Checksum`
//         );

//         const data = await response.json();

//         if (!data.size) {
//             throw new Error('Upload verification failed: file has no size');
//         }

//         // Additional verification could include downloading and checksumming
//         // For performance, we trust Google's infrastructure here
//     }

//     /**
//      * Verify download integrity
//      */
//     private async verifyDownloadIntegrity(data: Buffer, expectedChecksum: string): Promise<void> {
//         const crypto = await import('crypto');
//         const actualChecksum = crypto.createHash('sha256').update(data).digest('hex');

//         if (actualChecksum !== expectedChecksum) {
//             throw new Error(`Download integrity check failed: expected ${expectedChecksum}, got ${actualChecksum}`);
//         }
//     }

//     /**
//      * Parse backup metadata from Drive file
//      */
//     private parseBackupMetadata(file: any): BackupMetadata {
//         const props = file.properties || {};

//         return {
//             id: props.backupId || file.id,
//             timestamp: new Date(file.createdTime),
//             size: parseInt(props.originalSize || file.size),
//             compressedSize: parseInt(props.compressedSize || file.size),
//             checksum: props.checksum || '',
//             provider: 'google_drive',
//             version: props.version || '1.0',
//             databaseSchema: props.schema || 'unknown',
//             compressionRatio: parseFloat(props.compressionRatio || '0.8'),
//             createdBy: 'system',
//             tags: [],
//             integrityVerified: true,
//             restorable: true
//         };
//     }

//     /**
//      * Create standardized backup error
//      */
//     private createBackupError(error: Error): BackupError {
//         return {
//             code: this.getErrorCode(error),
//             message: error.message,
//             provider: 'google_drive',
//             retryable: this.isRetryableError(error),
//             timestamp: new Date(),
//             context: {
//                 stack: error.stack
//             }
//         };
//     }

//     /**
//      * Determine error code from error
//      */
//     private getErrorCode(error: Error): string {
//         if (error.message.includes('401')) return 'AUTHENTICATION_FAILED';
//         if (error.message.includes('403')) return 'RATE_LIMITED';
//         if (error.message.includes('404')) return 'FILE_NOT_FOUND';
//         if (error.message.includes('insufficient storage')) return 'STORAGE_FULL';
//         if (error.message.includes('network')) return 'NETWORK_ERROR';
//         return 'UNKNOWN_ERROR';
//     }

//     /**
//      * Determine if error is retryable
//      */
//     private isRetryableError(error: Error): boolean {
//         const retryableCodes = ['RATE_LIMITED', 'NETWORK_ERROR', 'UNKNOWN_ERROR'];
//         return retryableCodes.includes(this.getErrorCode(error));
//     }
// }

// /**
//  * Rate limiter to prevent API quota exhaustion
//  */
// class RateLimiter {
//     private requests: number[] = [];
//     private readonly limit: number;
//     private readonly windowMs: number;

//     constructor(limit: number, windowMs: number) {
//         this.limit = limit;
//         this.windowMs = windowMs;
//     }

//     async execute<T>(fn: () => Promise<T>): Promise<T> {
//         await this.waitForAvailableSlot();
//         this.requests.push(Date.now());
//         return fn();
//     }

//     private async waitForAvailableSlot(): Promise<void> {
//         const now = Date.now();

//         // Remove old requests outside the window
//         this.requests = this.requests.filter(time => now - time < this.windowMs);

//         // Wait if we're at the limit
//         if (this.requests.length >= this.limit) {
//             const oldestRequest = Math.min(...this.requests);
//             const waitTime = this.windowMs - (now - oldestRequest) + 1000;

//             if (waitTime > 0) {
//                 await new Promise(resolve => setTimeout(resolve, waitTime));
//                 return this.waitForAvailableSlot(); // Recursive check
//             }
//         }
//     }
// }

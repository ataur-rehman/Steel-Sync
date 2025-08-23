/**
 * Production-Grade Encryption Service
 * Google-level security for backup data
 */

import type { EncryptionConfig, EncryptedBackup } from './types';

export class EncryptionService {
    private static instance: EncryptionService;
    private config: EncryptionConfig;
    private masterKey: CryptoKey | null = null;

    private constructor() {
        this.config = {
            enabled: true,
            algorithm: 'AES-256-GCM',
            keyDerivation: 'argon2',
            iterations: 100000,
            saltLength: 32
        };
    }

    public static getInstance(): EncryptionService {
        if (!EncryptionService.instance) {
            EncryptionService.instance = new EncryptionService();
        }
        return EncryptionService.instance;
    }

    /**
     * Initialize encryption with user password
     */
    public async initialize(password: string): Promise<void> {
        if (!this.config.enabled) {
            return;
        }

        try {
            // Import password as key material
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(password),
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );

            // Generate salt for key derivation
            const salt = crypto.getRandomValues(new Uint8Array(this.config.saltLength));

            // Derive encryption key
            this.masterKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: this.config.iterations,
                    hash: 'SHA-256'
                },
                keyMaterial,
                {
                    name: 'AES-GCM',
                    length: 256
                },
                false,
                ['encrypt', 'decrypt']
            );

            console.log('✅ Encryption initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize encryption:', error);
            throw new Error('Encryption initialization failed');
        }
    }

    /**
     * Encrypt backup data with maximum security
     */
    public async encryptBackup(data: Buffer): Promise<EncryptedBackup> {
        if (!this.config.enabled || !this.masterKey) {
            throw new Error('Encryption not initialized');
        }

        try {
            // Generate random IV
            const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

            // Generate random salt for this encryption
            const salt = crypto.getRandomValues(new Uint8Array(this.config.saltLength));

            // Encrypt data
            const encryptedBuffer = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv,
                    additionalData: salt // Use salt as additional authenticated data
                },
                this.masterKey,
                new Uint8Array(data)
            );

            const encryptedArray = new Uint8Array(encryptedBuffer);
            const authTagLength = 16; // GCM auth tag is always 16 bytes

            // Split encrypted data and auth tag
            const encryptedData = encryptedArray.slice(0, -authTagLength);
            const authTag = encryptedArray.slice(-authTagLength);

            return {
                encryptedData: Buffer.from(encryptedData),
                salt: Buffer.from(salt),
                iv: Buffer.from(iv),
                authTag: Buffer.from(authTag),
                keyId: await this.generateKeyId(),
                algorithm: this.config.algorithm
            };
        } catch (error) {
            console.error('❌ Encryption failed:', error);
            throw new Error('Failed to encrypt backup data');
        }
    }

    /**
     * Decrypt backup data with integrity verification
     */
    public async decryptBackup(encryptedBackup: EncryptedBackup): Promise<Buffer> {
        if (!this.config.enabled || !this.masterKey) {
            throw new Error('Encryption not initialized');
        }

        try {
            // Combine encrypted data and auth tag
            const combinedData = new Uint8Array(
                encryptedBackup.encryptedData.length + encryptedBackup.authTag.length
            );
            combinedData.set(encryptedBackup.encryptedData);
            combinedData.set(encryptedBackup.authTag, encryptedBackup.encryptedData.length);

            // Decrypt data
            const decryptedBuffer = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: new Uint8Array(encryptedBackup.iv),
                    additionalData: new Uint8Array(encryptedBackup.salt)
                },
                this.masterKey,
                combinedData
            );

            return Buffer.from(decryptedBuffer);
        } catch (error) {
            console.error('❌ Decryption failed:', error);
            throw new Error('Failed to decrypt backup data - data may be corrupted or password incorrect');
        }
    }

    /**
     * Generate secure checksum for integrity verification
     */
    public async generateChecksum(data: Buffer): Promise<string> {
        const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(data));
        const hashArray = new Uint8Array(hashBuffer);
        const hashHex = Array.from(hashArray)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        return hashHex;
    }

    /**
     * Verify data integrity using checksum
     */
    public async verifyChecksum(data: Buffer, expectedChecksum: string): Promise<boolean> {
        const actualChecksum = await this.generateChecksum(data);
        return actualChecksum === expectedChecksum;
    }

    /**
     * Generate unique key ID for tracking
     */
    private async generateKeyId(): Promise<string> {
        const randomBytes = crypto.getRandomValues(new Uint8Array(16));
        const hashBuffer = await crypto.subtle.digest('SHA-256', randomBytes);
        const hashArray = new Uint8Array(hashBuffer);
        return Array.from(hashArray.slice(0, 8))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Test encryption/decryption functionality
     */
    public async testEncryption(): Promise<boolean> {
        try {
            const testData = Buffer.from('test encryption data');
            const encrypted = await this.encryptBackup(testData);
            const decrypted = await this.decryptBackup(encrypted);

            return Buffer.compare(testData, decrypted) === 0;
        } catch (error) {
            console.error('❌ Encryption test failed:', error);
            return false;
        }
    }

    /**
     * Update encryption configuration
     */
    public updateConfig(config: Partial<EncryptionConfig>): void {
        this.config = { ...this.config, ...config };

        // Re-initialize if key derivation settings changed
        if (config.keyDerivation || config.iterations) {
            this.masterKey = null;
        }
    }

    /**
     * Get current encryption configuration
     */
    public getConfig(): EncryptionConfig {
        return { ...this.config };
    }

    /**
     * Check if encryption is enabled and ready
     */
    public isReady(): boolean {
        return this.config.enabled && this.masterKey !== null;
    }

    /**
     * Clear encryption keys from memory
     */
    public clearKeys(): void {
        this.masterKey = null;
        console.log('🔒 Encryption keys cleared from memory');
    }
}

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();

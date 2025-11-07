import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'mooma-default-secret-key-2024';

export class EncryptionService {
  /**
   * Encrypt data to Base64 format
   */
  static encryptToBase64(data: string): string {
    try {
      const encrypted = CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
      return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(encrypted));
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt Base64 data
   */
  static decryptFromBase64(encryptedBase64: string): string {
    try {
      const encrypted = CryptoJS.enc.Base64.parse(encryptedBase64).toString(CryptoJS.enc.Utf8);
      const decrypted = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash password using bcrypt-like method with crypto-js
   */
  static hashPassword(password: string): string {
    try {
      const salt = CryptoJS.lib.WordArray.random(128/8);
      const hash = CryptoJS.PBKDF2(password, salt, {
        keySize: 256/32,
        iterations: 10000
      });
      return salt.toString() + ':' + hash.toString();
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against hash
   */
  static verifyPassword(password: string, hash: string): boolean {
    try {
      const [saltStr, hashStr] = hash.split(':');
      const salt = CryptoJS.enc.Hex.parse(saltStr);
      const computedHash = CryptoJS.PBKDF2(password, salt, {
        keySize: 256/32,
        iterations: 10000
      });
      return computedHash.toString() === hashStr;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Generate secure random token
   */
  static generateToken(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }
}

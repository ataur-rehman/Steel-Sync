import bcrypt from 'bcryptjs';

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  generateSessionToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

export const authService = new AuthService();
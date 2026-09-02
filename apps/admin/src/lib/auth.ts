import * as jose from 'jose';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_odizo_key_1234567890';

export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'INTERN' | 'Admin' | 'Employee' | 'Intern';

export interface IUserPayload {
  id: string;
  role: UserRole;
  name: string;
}

export function normalizeRole(role?: string): 'ADMIN' | 'EMPLOYEE' | 'INTERN' {
  if (!role) return 'EMPLOYEE';
  const upper = role.toUpperCase();
  if (upper === 'ADMIN') return 'ADMIN';
  if (upper === 'INTERN') return 'INTERN';
  return 'EMPLOYEE';
}

export async function verifyAuth(request: NextRequest): Promise<IUserPayload | null> {
  const token = request.cookies.get('token')?.value || 
                request.headers.get('authorization')?.split(' ')[1];

  if (!token) {
    return null;
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as unknown as IUserPayload;
  } catch (error) {
    console.error('JWT Verification failed:', error);
    return null;
  }
}

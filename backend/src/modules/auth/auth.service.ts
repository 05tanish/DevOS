import prisma from '../../config/database';
import { getAllowedEmails } from '../../config/env';
import { hashPassword, comparePassword } from '../../utils/hash';
import { signToken, generateRandomToken } from '../../utils/jwt';
import { AppError } from '../../middleware/error.middleware';
import { addDays } from 'date-fns';
import * as redis from '../../services/redis.service';
import type {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './auth.schema';

export const register = async (
  dto: RegisterDto,
  userAgent?: string,
  ip?: string
) => {
  const email = dto.email.toLowerCase().trim();
  const allowedEmails = getAllowedEmails();

  if (allowedEmails.length > 0 && !allowedEmails.includes('*') && !allowedEmails.includes(email)) {
    throw new AppError('Registration is invite-only. This email is not whitelisted.', 403);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const hashedPassword = await hashPassword(dto.password);
  const emailVerifyToken = generateRandomToken();

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      emailVerifyToken,
      emailVerifyExpiry: addDays(new Date(), 1),
      profile: {
        create: { name: dto.name },
      },
    },
    include: { profile: true },
  });

  return { user, emailVerifyToken };
};

export const verifyEmail = async (token: string) => {
  const user = await prisma.user.findFirst({
    where: {
      emailVerifyToken: token,
      emailVerifyExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired verification token.', 400);
  }

  return prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiry: null,
    },
  });
};

export const login = async (
  dto: LoginDto,
  userAgent?: string,
  ip?: string
) => {
  const email = dto.email.toLowerCase().trim();

  // Strict access whitelist check
  const allowedEmails = getAllowedEmails();
  if (allowedEmails.length > 0 && !allowedEmails.includes('*') && !allowedEmails.includes(email)) {
    throw new AppError('Access restricted. Your account is not authorized to access this workspace.', 403);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  // Strict password verification using bcrypt
  const isValid = await comparePassword(dto.password, user.password);
  
  if (!isValid) {
    throw new AppError('Invalid email or password.', 401);
  }

  if (!user.emailVerified) {
    throw new AppError('Please verify your email address before logging in.', 403);
  }

  const token = signToken({ userId: user.id, email: user.email });
  const expiresAt = addDays(new Date(), 7);

  // Store session in Postgres (for audit trail, device management, revocation)
  await prisma.session.create({
    data: { userId: user.id, token, userAgent, ip, expiresAt },
  });

  // Cache session in Redis (fast auth path — avoids DB on every API call)
  await redis.setSession(token, { userId: user.id, email: user.email, role: user.role });

  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      profile,
    },
  };
};

export const logout = async (token: string) => {
  // Remove from Redis immediately (invalidates session on all servers)
  await redis.deleteSession(token);
  // Remove from Postgres too
  await prisma.session.deleteMany({ where: { token } });
};

export const forgotPassword = async (dto: ForgotPasswordDto) => {
  const email = dto.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to prevent email enumeration
  if (!user) return null;

  const resetToken = generateRandomToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpiry: addDays(new Date(), 0.04), // ~1 hour
    },
  });

  return { user, resetToken };
};

export const resetPassword = async (dto: ResetPasswordDto) => {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: dto.token,
      passwordResetExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token.', 400);
  }

  const hashedPassword = await hashPassword(dto.password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  // Invalidate all sessions after password reset (Postgres + Redis)
  const sessions = await prisma.session.findMany({ where: { userId: user.id }, select: { token: true } });
  await Promise.all(sessions.map(s => redis.deleteSession(s.token)));
  await prisma.session.deleteMany({ where: { userId: user.id } });
};

export const changePassword = async (userId: string, dto: ChangePasswordDto) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found.', 404);

  const isValid = await comparePassword(dto.currentPassword, user.password);
  if (!isValid) throw new AppError('Current password is incorrect.', 400);

  const hashedPassword = await hashPassword(dto.newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  // Flush all sessions from Postgres + Redis
  const sessions = await prisma.session.findMany({ where: { userId }, select: { token: true } });
  await Promise.all(sessions.map(s => redis.deleteSession(s.token)));
  await prisma.session.deleteMany({ where: { userId } });
};

export const getSessions = async (userId: string) => {
  return prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
  });
};

export const revokeSession = async (userId: string, sessionId: string) => {
  const session = await prisma.session.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw new AppError('Session not found.', 404);
  await prisma.session.delete({ where: { id: sessionId } });
};

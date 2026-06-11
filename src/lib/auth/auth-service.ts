/**
 * Authentication Service
 * Handles user registration, login, and password management
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/database/client';

/**
 * Password hashing configuration
 */
const SALT_ROUNDS = 12;

/**
 * Token expiry times
 */
const PASSWORD_RESET_EXPIRY_HOURS = 24;
const EMAIL_VERIFICATION_EXPIRY_HOURS = 48;

/**
 * Customer with sensitive fields excluded
 */
export interface SafeCustomer {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  emailVerified: boolean;
  ageVerified: boolean;
  acceptsMarketing: boolean;
  createdAt: Date;
}

/**
 * Registration input
 */
export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  acceptsMarketing?: boolean;
}

/**
 * Login result
 */
export interface LoginResult {
  success: boolean;
  customer?: SafeCustomer;
  error?: string;
  requiresVerification?: boolean;
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Convert customer to safe version (exclude sensitive data)
 */
function toSafeCustomer(customer: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  emailVerified: boolean;
  ageVerified: boolean;
  acceptsMarketing: boolean;
  createdAt: Date;
}): SafeCustomer {
  return {
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    emailVerified: customer.emailVerified,
    ageVerified: customer.ageVerified,
    acceptsMarketing: customer.acceptsMarketing,
    createdAt: customer.createdAt,
  };
}

/**
 * Register a new customer
 */
export async function registerCustomer(input: RegisterInput): Promise<{
  success: boolean;
  customer?: SafeCustomer;
  verificationToken?: string;
  error?: string;
}> {
  const { email, password, firstName, lastName, phone, acceptsMarketing } = input;

  // Check if email already exists
  const existing = await prisma.customer.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    return { success: false, error: 'Email already registered' };
  }

  // Validate password strength
  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Generate email verification token
  const verificationToken = generateToken();

  // Create customer
  const customer = await prisma.customer.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
      phone: phone || null,
      acceptsMarketing: acceptsMarketing ?? false,
      emailVerified: false,
      resetToken: verificationToken, // Reuse resetToken for email verification
      resetTokenExpiry: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000),
    },
  });

  return {
    success: true,
    customer: toSafeCustomer(customer),
    verificationToken,
  };
}

/**
 * Login a customer
 */
export async function loginCustomer(
  email: string,
  password: string
): Promise<LoginResult> {
  // Find customer by email
  const customer = await prisma.customer.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!customer) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Check if account is active
  if (!customer.isActive) {
    return { success: false, error: 'Account is disabled' };
  }

  // Check if password exists (might be Shopify-only account)
  if (!customer.passwordHash) {
    return { success: false, error: 'Please set a password using the reset password feature' };
  }

  // Verify password
  const isValid = await verifyPassword(password, customer.passwordHash);
  if (!isValid) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Update last login
  await prisma.customer.update({
    where: { id: customer.id },
    data: { lastLoginAt: new Date() },
  });

  // Check if email is verified (optional - can be enforced or just warn)
  if (!customer.emailVerified) {
    return {
      success: true,
      customer: toSafeCustomer(customer),
      requiresVerification: true,
    };
  }

  return {
    success: true,
    customer: toSafeCustomer(customer),
  };
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Find customer with this token
  const customer = await prisma.customer.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
      emailVerified: false,
    },
  });

  if (!customer) {
    return { success: false, error: 'Invalid or expired verification token' };
  }

  // Mark email as verified
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return { success: true };
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  resetToken?: string;
  error?: string;
}> {
  // Find customer by email
  const customer = await prisma.customer.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Don't reveal if email exists
  if (!customer) {
    // Return success anyway to prevent email enumeration
    return { success: true };
  }

  // Generate reset token
  const resetToken = generateToken();

  // Save token with expiry
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      resetToken,
      resetTokenExpiry: new Date(Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000),
    },
  });

  return { success: true, resetToken };
}

/**
 * Reset password with token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  // Find customer with valid token
  const customer = await prisma.customer.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!customer) {
    return { success: false, error: 'Invalid or expired reset token' };
  }

  // Validate password strength
  if (newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password and clear token
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return { success: true };
}

/**
 * Change password (for logged-in users)
 */
export async function changePassword(
  customerId: string,
  currentPassword: string,
  newPassword: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  // Find customer
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer || !customer.passwordHash) {
    return { success: false, error: 'Customer not found' };
  }

  // Verify current password
  const isValid = await verifyPassword(currentPassword, customer.passwordHash);
  if (!isValid) {
    return { success: false, error: 'Current password is incorrect' };
  }

  // Validate new password
  if (newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }

  // Hash and save new password
  const passwordHash = await hashPassword(newPassword);
  await prisma.customer.update({
    where: { id: customerId },
    data: { passwordHash },
  });

  return { success: true };
}

/**
 * Get customer by ID
 */
export async function getCustomerById(customerId: string): Promise<SafeCustomer | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  return customer ? toSafeCustomer(customer) : null;
}

/**
 * Update customer profile
 */
export async function updateCustomerProfile(
  customerId: string,
  data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    acceptsMarketing?: boolean;
  }
): Promise<SafeCustomer | null> {
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      acceptsMarketing: data.acceptsMarketing,
    },
  });

  return toSafeCustomer(customer);
}

/**
 * Verify customer age
 */
export async function verifyAge(
  customerId: string,
  dateOfBirth: Date
): Promise<{
  success: boolean;
  error?: string;
}> {
  // Must have turned 21 on or before today. Compare against the date
  // exactly 21 years ago so the day of month is accounted for, not just
  // the year/month.
  const today = new Date();
  const twentyFirstBirthday = new Date(
    dateOfBirth.getFullYear() + 21,
    dateOfBirth.getMonth(),
    dateOfBirth.getDate()
  );
  const isUnder21 = twentyFirstBirthday > today;

  if (isUnder21) {
    return { success: false, error: 'Must be 21 or older to purchase alcohol' };
  }

  // Update customer
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      ageVerified: true,
      ageVerifiedAt: new Date(),
      dateOfBirth,
    },
  });

  return { success: true };
}

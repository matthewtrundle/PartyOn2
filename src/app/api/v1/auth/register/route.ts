/**
 * Registration API
 *
 * POST /api/v1/auth/register - Register a new customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerCustomer, setSessionCookie } from '@/lib/auth';
import { sendEmail } from '@/lib/email/resend-client';
import { EmailType } from '@prisma/client';

/**
 * POST /api/v1/auth/register
 * Register a new customer
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, phone, acceptsMarketing } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Register customer
    const result = await registerCustomer({
      email,
      password,
      firstName,
      lastName,
      phone,
      acceptsMarketing,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // Set session cookie (auto-login after registration)
    if (result.customer) {
      await setSessionCookie(result.customer);
    }

    // Send welcome email (non-blocking — don't fail registration if email fails)
    if (result.customer?.email) {
      const customer = result.customer;
      sendEmail({
        to: customer.email,
        subject: 'Welcome to Party On Delivery!',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #1a1a1a; padding: 32px; text-align: center;">
              <img src="https://partyondelivery.com/images/pod-logo-2025.png" alt="Party On Delivery" width="180" style="width: 180px; max-width: 100%; height: auto; margin-bottom: 12px;" />
              <p style="color: #ffffff; margin: 0; font-size: 14px;">PREMIUM ALCOHOL DELIVERY</p>
            </div>
            <div style="padding: 24px;">
              <h2 style="color: #1a1a1a;">Welcome${customer.firstName ? `, ${customer.firstName}` : ''}!</h2>
              <p style="color: #666;">Thanks for creating your Party On Delivery account. You can now:</p>
              <ul style="color: #666;">
                <li>Browse our premium selection</li>
                <li>Track your orders</li>
                <li>Create group orders for events</li>
              </ul>
              <a href="https://partyondelivery.com/order" style="display: inline-block; background-color: #D4AF37; color: #1a1a1a; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600;">Start Shopping</a>
            </div>
          </div>
        `,
        text: `Welcome to Party On Delivery${customer.firstName ? `, ${customer.firstName}` : ''}! Browse our premium selection at https://partyondelivery.com/order`,
        type: EmailType.WELCOME,
        customerId: customer.id,
      }).catch((err: unknown) => console.error('[Auth] Welcome email failed:', err));
    }

    return NextResponse.json({
      success: true,
      data: {
        customer: result.customer,
        message: 'Registration successful. Please check your email to verify your account.',
      },
    });
  } catch (error) {
    console.error('[Auth API] Register error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      },
      { status: 500 }
    );
  }
}

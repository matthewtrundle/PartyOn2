/**
 * GET /api/group-orders/my-orders - List the SIGNED-IN customer's group orders
 *
 * Identity comes from the session cookie, never from the request. This used to
 * read `?customerId=` and trust it, exposing any customer's order history to
 * anyone who obtained their id.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Sign in to view your orders' },
        { status: 401 }
      )
    }

    // Accepted for backward compatibility with existing callers, but only used
    // to reject a mismatch — the session is the sole source of identity.
    const { searchParams } = new URL(request.url)
    const requested = searchParams.get('customerId')
    if (requested && requested !== session.customerId) {
      return NextResponse.json(
        { error: 'You can only view your own orders' },
        { status: 403 }
      )
    }

    const customerId = session.customerId

    const groupOrders = await prisma.groupOrder.findMany({
      where: {
        hostCustomerId: customerId,
      },
      include: {
        participants: {
          select: {
            id: true,
            guestName: true,
            status: true,
            cartTotal: true,
            itemCount: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Transform data for the frontend
    const orders = groupOrders.map((order) => ({
      id: order.id,
      name: order.name,
      shareCode: order.shareCode,
      status: order.status.toLowerCase(),
      deliveryDate: order.deliveryDate.toISOString(),
      deliveryTime: order.deliveryTime,
      deliveryAddress: order.deliveryAddress,
      createdAt: order.createdAt.toISOString(),
      participantCount: order.participants.length,
      checkedOutCount: order.participants.filter((p) => p.status === 'CHECKED_OUT').length,
      totalItems: order.participants.reduce((sum, p) => sum + p.itemCount, 0),
    }))

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Error fetching group orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch group orders' },
      { status: 500 }
    )
  }
}

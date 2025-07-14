import { redirect } from 'next/navigation'

export default function OrderNowPage() {
  // Redirect to products page for now
  // In production, this would integrate with Shopify Storefront API
  redirect('/products')
}
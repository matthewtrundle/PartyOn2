import { redirect } from 'next/navigation'

export default function OrderNowPage() {
  // Straight to /order. Going via /products chained two redirects, because
  // next.config.ts already 307s the bare /products route here.
  redirect('/order')
}
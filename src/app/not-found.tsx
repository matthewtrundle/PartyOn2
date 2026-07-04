import Link from 'next/link';
import Navigation from "@/components/Navigation";
import Footer from '@/components/Footer';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navigation />

      <main className="flex-grow flex items-center justify-center px-8 py-20">
        <div className="max-w-2xl mx-auto text-center">
          {/* 404 Icon */}
          <div className="mb-8">
            <svg className="w-24 h-24 mx-auto text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          {/* Error Message */}
          <h1 className="font-heading text-5xl md:text-7xl text-gray-900 mb-4 tracking-[0.1em]">
            404
          </h1>
          <h2 className="font-heading text-2xl md:text-3xl text-gray-800 mb-6 tracking-wide">
            Page Not Found
          </h2>
          <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. The party might have moved to a different location!
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="inline-block px-8 py-3 bg-brand-yellow text-gray-900 hover:bg-yellow-600 transition-colors tracking-[0.1em] text-sm font-medium"
            >
              RETURN HOME
            </Link>
            <Link
              href="/order"
              className="inline-block px-8 py-3 border-2 border-brand-yellow text-gray-900 hover:bg-brand-yellow hover:text-gray-900 transition-colors tracking-[0.1em] text-sm font-medium"
            >
              BROWSE PRODUCTS
            </Link>
          </div>

          {/* Helpful Links */}
          <div className="mt-12 pt-12 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-4 tracking-wider">
              POPULAR PAGES
            </h3>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link href="/weddings" className="text-brand-yellow hover:text-yellow-600 transition-colors">
                Wedding Services
              </Link>
              <span className="text-gray-400">•</span>
              <Link href="/boat-parties" className="text-brand-yellow hover:text-yellow-600 transition-colors">
                Boat Parties
              </Link>
              <span className="text-gray-400">•</span>
              <Link href="/austin-bachelor-party-delivery" className="text-brand-yellow hover:text-yellow-600 transition-colors">
                Bachelor/ette Parties
              </Link>
              <span className="text-gray-400">•</span>
              <Link href="/austin-corporate-event-delivery" className="text-brand-yellow hover:text-yellow-600 transition-colors">
                Corporate Events
              </Link>
              <span className="text-gray-400">•</span>
              <Link href="/contact" className="text-brand-yellow hover:text-yellow-600 transition-colors">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
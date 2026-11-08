import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <h2 className="text-4xl font-black text-white mb-2">404</h2>
      <p className="text-base text-[#8f98b2] mb-6">Page not found</p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-lg bg-[#1f80e0] text-white text-sm font-semibold hover:bg-[#1f80e0]/90 transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}

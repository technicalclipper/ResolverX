'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#DCEBFE] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 text-center">
        <h2 className="text-4xl font-black text-black mb-4">404 - Page Not Found</h2>
        <p className="text-lg font-bold text-black mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link 
          href="/"
          className="inline-block px-6 py-3 bg-[#4285f4] text-white text-lg font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
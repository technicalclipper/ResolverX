'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#DCEBFE] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 text-center">
        <h2 className="text-4xl font-black text-black mb-4">Something went wrong!</h2>
        <p className="text-lg font-bold text-black mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-[#4285f4] text-white text-lg font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
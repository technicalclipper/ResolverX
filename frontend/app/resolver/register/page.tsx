'use client';

import ResolverRegistration from '../../components/ResolverRegistration';

export default function RegisterResolverPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        Resolver Registration
      </h1>
      <ResolverRegistration />
    </div>
  );
}
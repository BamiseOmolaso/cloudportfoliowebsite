export default function Loading() {
  return (
    <div className="min-h-screen py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gray-900 rounded-lg overflow-hidden shadow-xl">
          {/* Cover image skeleton */}
          <div className="h-64 md:h-96 bg-gray-800 animate-pulse" />
          
          <div className="p-6 md:p-8">
            {/* Back link skeleton */}
            <div className="h-6 w-24 bg-gray-800 rounded mb-6 animate-pulse" />
            
            {/* Title skeleton */}
            <div className="space-y-3 mb-4">
              <div className="h-10 bg-gray-800 rounded w-3/4 animate-pulse" />
              <div className="h-10 bg-gray-800 rounded w-1/2 animate-pulse" />
            </div>
            
            {/* Meta skeleton */}
            <div className="flex gap-2 mb-4">
              <div className="h-4 bg-gray-800 rounded w-32 animate-pulse" />
              <div className="h-4 bg-gray-800 rounded w-24 animate-pulse" />
            </div>
            
            {/* Tags skeleton */}
            <div className="flex gap-2 mb-6">
              <div className="h-6 bg-gray-800 rounded-full w-20 animate-pulse" />
              <div className="h-6 bg-gray-800 rounded-full w-16 animate-pulse" />
              <div className="h-6 bg-gray-800 rounded-full w-24 animate-pulse" />
            </div>
            
            {/* Content skeleton */}
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className={`h-4 bg-gray-800 rounded animate-pulse ${
                    i % 3 === 0 ? 'w-full' : i % 3 === 1 ? 'w-5/6' : 'w-4/6'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e7eb] overflow-hidden animate-pulse">
      <div className="aspect-square bg-[#f3f4f6]" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 bg-[#f3f4f6] rounded-full w-3/4" />
        <div className="h-3 bg-[#f3f4f6] rounded-full w-1/2" />
        <div className="h-4 bg-[#f3f4f6] rounded-full w-1/3" />
        <div className="h-9 bg-[#f3f4f6] rounded-xl mt-2" />
      </div>
    </div>
  );
}

export function SkeletonProductGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default function PortalLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <div className="bg-muted h-7 w-48 animate-pulse rounded" />
        <div className="bg-muted h-4 w-80 animate-pulse rounded" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-card rounded-lg border p-4">
            <div className="bg-muted h-3 w-32 animate-pulse rounded" />
            <div className="bg-muted mt-3 h-7 w-40 animate-pulse rounded" />
            <div className="bg-muted mt-2 h-3 w-24 animate-pulse rounded" />
          </div>
        ))}
      </div>
      <div className="bg-card overflow-hidden rounded-lg border">
        <div className="bg-muted h-9 animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 border-t px-3 py-2">
            <div className="bg-muted h-4 flex-1 animate-pulse rounded" />
            <div className="bg-muted h-4 w-24 animate-pulse rounded" />
            <div className="bg-muted h-4 w-20 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </section>
  )
}

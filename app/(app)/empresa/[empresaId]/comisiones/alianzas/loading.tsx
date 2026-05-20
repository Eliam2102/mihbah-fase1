export default function AlianzasLoading() {
  return (
    <section className="space-y-6 p-4 sm:p-6">
      <div className="space-y-2">
        <div className="bg-muted h-7 w-72 animate-pulse rounded" />
        <div className="bg-muted h-4 w-full max-w-xl animate-pulse rounded" />
      </div>
      <div className="bg-muted h-9 w-64 animate-pulse rounded" />
      <div className="bg-card rounded-lg border">
        <div className="bg-muted/40 h-9" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex gap-3 border-t px-3 py-2">
            <div className="bg-muted h-4 w-4 animate-pulse rounded" />
            <div className="bg-muted h-4 flex-1 animate-pulse rounded" />
            <div className="bg-muted h-4 w-24 animate-pulse rounded" />
            <div className="bg-muted h-4 w-16 animate-pulse rounded" />
            <div className="bg-muted h-4 w-20 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </section>
  )
}

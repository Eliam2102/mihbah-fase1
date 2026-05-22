export default function VentasLoading() {
  return (
    <section className="space-y-6 p-4 sm:p-6">
      <div className="space-y-2">
        <div className="bg-muted h-7 w-64 animate-pulse rounded" />
        <div className="bg-muted h-4 w-96 animate-pulse rounded" />
      </div>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-muted h-7 w-24 animate-pulse rounded-full" />
        ))}
      </div>
      <div className="bg-card rounded-lg border">
        <div className="bg-muted/40 h-9" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-3 border-t px-3 py-2">
            <div className="bg-muted h-4 flex-1 animate-pulse rounded" />
            <div className="bg-muted h-4 w-24 animate-pulse rounded" />
            <div className="bg-muted h-4 w-16 animate-pulse rounded" />
            <div className="bg-muted h-4 w-24 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </section>
  )
}

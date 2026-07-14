export default function DispersionesLoading() {
  return (
    <section className="space-y-6 p-4 sm:p-6">
      <div className="space-y-2">
        <div className="bg-muted h-7 w-48 animate-pulse rounded" />
        <div className="bg-muted h-4 w-80 animate-pulse rounded" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-card rounded-lg border p-4">
            <div className="bg-muted h-3 w-24 animate-pulse rounded" />
            <div className="bg-muted mt-3 h-7 w-32 animate-pulse rounded" />
          </div>
        ))}
      </div>
      {[0, 1, 2].map((g) => (
        <div key={g} className="bg-card overflow-hidden rounded-lg border">
          <div className="bg-muted/30 h-9" />
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3 border-t px-3 py-2">
              <div className="bg-muted h-4 flex-1 animate-pulse rounded" />
              <div className="bg-muted h-4 w-24 animate-pulse rounded" />
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}

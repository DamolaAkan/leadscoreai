// Loading placeholders shaped like the dashboard, so first load reads as one
// smooth fill-in instead of "Loading..." followed by a second loading message.

const bar = "animate-pulse rounded-md bg-[#eceef2]";

export function ResponsesSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <div className={`${bar} h-7 w-40`} />
        <div className={`${bar} h-4 w-72 max-w-full`} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-5 border border-[#eceef2] space-y-3">
            <div className={`${bar} h-3 w-24`} />
            <div className={`${bar} h-7 w-14`} />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-[#eceef2] divide-y divide-[#f1f2f5]">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className={`${bar} h-9 w-9 rounded-full`} />
            <div className="flex-1 space-y-2">
              <div className={`${bar} h-3.5 w-1/3`} />
              <div className={`${bar} h-3 w-1/2`} />
            </div>
            <div className={`${bar} h-6 w-16 rounded-full`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton({ builder = false }: { builder?: boolean }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafc", fontFamily: "var(--font-inter)" }}>
      <div className="bg-white border-b border-[#e9ebf0] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`${bar} h-11 w-11 rounded-xl`} />
              <div className="space-y-2">
                <div className={`${bar} h-4 w-40`} />
                <div className={`${bar} h-3 w-28`} />
              </div>
            </div>
            <div className={`${bar} h-9 w-24 rounded-lg hidden sm:block`} />
          </div>
          <div className="flex gap-6 mt-6 pb-3">
            {[72, 64, 56, 44, 56].map((w, i) => (
              <div key={i} className={`${bar} h-4`} style={{ width: w }} />
            ))}
          </div>
        </div>
      </div>
      {builder ? (
        // Same dark loader the builder shows, so landing on it is one continuous load.
        <div className="flex items-center justify-center bg-[#0E1525] text-[#9DA2A6] text-sm" style={{ height: "calc(100dvh - 118px)" }}>
          <span className="animate-pulse">Loading your studio…</span>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-8">
          <ResponsesSkeleton />
        </div>
      )}
    </div>
  );
}

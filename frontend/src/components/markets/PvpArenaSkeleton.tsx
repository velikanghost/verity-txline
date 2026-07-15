export default function PvpArenaSkeleton({
  optionCount = 5,
  hideCarouselHeader = false,
}: {
  optionCount?: number;
  hideCarouselHeader?: boolean;
}) {
  return (
    <div className="lg:col-span-2 flex flex-col gap-4 animate-pulse">
      {!hideCarouselHeader && (
        <div className="verity-card p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-stone-surface " />
            <div className="space-y-2">
              <div className="h-4 w-48 bg-stone-surface rounded" />
              <div className="h-3 w-64 bg-stone-surface rounded" />
            </div>
          </div>
          <div className="h-10 w-32 bg-stone-surface rounded-lg" />
        </div>
      )}

      <div className="verity-card p-5 flex flex-col gap-4">
        <div className="border-b border-border pb-3 space-y-2">
          <div className="h-5 w-52 bg-stone-surface rounded" />
          <div className="h-3 w-72 bg-stone-surface rounded" />
        </div>
        <div className="space-y-1.5">
          <div className="h-4 w-28 bg-stone-surface rounded" />
          <div className="h-11 w-full bg-stone-surface rounded-[10px]" />
        </div>
        <div className="space-y-3 mt-2">
          <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
            <div className="flex items-center gap-3">
              <div className="h-4 w-24 bg-stone-surface rounded animate-pulse" />
              <span className="text-zinc-300 ">|</span>
              <div className="h-4 w-24 bg-stone-surface rounded animate-pulse" />
            </div>
            <div className="h-3 w-32 bg-stone-surface rounded animate-pulse" />
          </div>
          <div className="divide-y divide-border/60 ">
            {Array.from({ length: optionCount }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-4 gap-4 px-1"
              >
                {/* Left: Option Name & Vol */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-4 w-2/3 bg-stone-surface rounded" />
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="h-3 w-12 bg-stone-surface rounded" />
                    <div className="h-4 w-10 bg-stone-surface rounded-[6px]" />
                  </div>
                </div>

                {/* Middle: Implied Probability */}
                <div className="w-16 sm:w-24 flex justify-center shrink-0">
                  <div className="h-5 w-8 bg-stone-surface rounded" />
                </div>

                {/* Right: Buttons */}
                <div className="flex gap-2 shrink-0">
                  <div className="h-9 w-[105px] sm:w-[120px] bg-stone-surface rounded-[10px]" />
                  <div className="h-9 w-[105px] sm:w-[120px] bg-stone-surface rounded-[10px]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

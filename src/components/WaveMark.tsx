/** The WisprFree waveform mark — nine rounded bars, same silhouette as the app icon. */
export function WaveMark({
  className = "",
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  const bars = [10, 20, 30, 42, 52, 42, 30, 20, 10];
  return (
    <svg viewBox="0 0 60 60" aria-hidden className={className}>
      {bars.map((h, i) => (
        <rect
          key={i}
          x={4 + i * 6.2}
          y={(60 - h) / 2}
          width={3.4}
          height={h}
          rx={1.7}
          fill="currentColor"
          className={animated ? "wispr-bar" : undefined}
          style={
            animated
              ? { animationDelay: `${Math.abs(i - 4) * 0.09}s` }
              : undefined
          }
        />
      ))}
    </svg>
  );
}

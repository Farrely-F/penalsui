// Background.tsx
export function Background() {
  return (
    <div className="absolute inset-0 z-[-1]">
      <div className="absolute inset-0 bg-gradient-to-b from-green-50 to-blue-50 dark:from-gray-950/90 from-20% via-gray-950/50 dark:to-blue-950 z-[1]" />
      <div
        className="absolute inset-0 bg-cover bg-center saturate-[40%]"
        style={{ backgroundImage: `url('/penalsui-bg.png')` }}
      />
    </div>
  );
}

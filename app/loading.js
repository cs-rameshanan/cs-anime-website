export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full border-4 border-aurora border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}


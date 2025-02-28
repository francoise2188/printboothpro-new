export default function SettingsLayout({ children }) {
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto p-6">
        {/* Content Area */}
        <div className="bg-gray-900 rounded-lg">
          {children}
        </div>
      </div>
    </div>
  );
} 
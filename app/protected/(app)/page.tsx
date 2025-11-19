import { Bell } from "lucide-react";

export default function ProtectedOverviewPage() {
  const categories = [
    { label: "Organize Kitchen", icon: "🥕" },
    { label: "Scan Items", icon: "📷" },
    { label: "Grocery Item List", icon: "🛒" },
    { label: "Find Recipes", icon: "📖" },
  ];

  return (
    <section className="relative flex flex-col flex-1 p-10">

      {/* Page Title */}
      <h1 className="text-2xl font-bold mb-8 text-center w-full">DASHBOARD</h1>

      {/* Larger Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-10 max-w-15xl">   
        {categories.map((cat, index) => (
          <button
            key={index}
            className="
              flex flex-col items-center justify-center
              border rounded-xl p-16
              bg-white shadow-sm
              hover:shadow-md hover:bg-gray-50
              transition-all duration-200
              text-center
            "
          >
            <div className="text-6xl mb-6">{cat.icon}</div>
            <span className="text-xl font-medium">{cat.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

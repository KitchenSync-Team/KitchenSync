import Link from "next/link"; 
import { Package, ScanBarcode, ScrollText, ChefHat } from "lucide-react"; 

export default function ProtectedOverviewPage() {
  
  // Defines the cards, including their icon, label, and the target URL (href).
  const categories = [
    { 
      label: "Organize Kitchen", 
      icon: <Package className="h-12 w-12 mb-4 text-primary" />, 
      href: "/protected/organize" //need to make organize kitchen button interactive as of now it doesn't work (also make sure to check wireframe before jumping on this issue to see the Ux design)
    },
    { 
      label: "Scan Items", 
      icon: <ScanBarcode className="h-12 w-12 mb-4 text-primary" />, 
      href: "/protected/scan"  //need to make scan item button interactive, as of now it doesn't work (also make sure to check wireframe before jumping on this issue to see the Ux design)
    },
    { 
      label: "Grocery Item List", 
      icon: <ScrollText className="h-12 w-12 mb-4 text-primary" />, 
      href: "/protected/inventory" // This links to the Inventory page
    },
    { 
      label: "Find Recipes", 
      icon: <ChefHat className="h-12 w-12 mb-4 text-primary" />, 
      href: "/protected/recipes" // This links to the Recipes page
    },
  ];

  // Define the paths that should NOT be clickable for now
  const disabledPaths = ["/protected/organize", "/protected/scan"];

  return (
    <section className="relative flex flex-col flex-1 p-10">
      {/* Page Title */}
      <h1 className="text-2xl font-bold mb-8 text-center w-full">DASHBOARD</h1>

      {/* Grid of Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-10 max-w-15xl">   
        {categories.map((cat, index) => {
          const isDisabled = disabledPaths.includes(cat.href);
          
          // Base styling is now the same for all cards (standard white background, shadow)
          const baseClasses = `
            flex flex-col items-center justify-center
            border rounded-xl p-16
            bg-white shadow-sm
            text-center
            h-full w-full
            transition-all duration-200
            ${isDisabled 
                ? 'cursor-default' // No pointer for disabled items
                : 'hover:shadow-lg hover:bg-gray-50 cursor-pointer' // Hover effect only for active items
            }
          `;

          const cardContent = (
            <button
              className={baseClasses}
              type="button"
              disabled={isDisabled} // This disables the native button click action
            >
              <div>{cat.icon}</div>
              <span className="text-xl font-medium mt-3">{cat.label}</span>
              {/* Removed the (Coming Soon) badge */}
            </button>
          );

          if (isDisabled) {
            // Render a simple div wrapper instead of Link to prevent navigation
            return <div key={index} className="contents">{cardContent}</div>;
          }

          // Wrap the card in Link for clickable items
          return (
            <Link 
              key={index} 
              href={cat.href} 
              className="contents" 
            >
              {cardContent}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from '@/components/ui/button'; // Import Button for consistent styling

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center bg-white shadow-sm rounded-xl p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <Button onClick={() => window.location.href = '/'} className="bg-blue-600 text-white hover:bg-blue-700">
          Return to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
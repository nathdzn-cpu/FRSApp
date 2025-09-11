import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Import Card components

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="flex items-center justify-center bg-[var(--saas-background)] p-4">
      <Card className="text-center bg-white shadow-xl rounded-xl p-8">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-4xl font-bold text-gray-900 mb-4">404</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
          <Button onClick={() => window.location.href = '/'} className="bg-blue-600 text-white hover:bg-blue-700">
            Return to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
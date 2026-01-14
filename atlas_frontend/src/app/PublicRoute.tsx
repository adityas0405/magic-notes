import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return null;
  }
  if (isAuthenticated) {
    return <Navigate to="/app/library" replace />;
  }
  return children;
};

export default PublicRoute;

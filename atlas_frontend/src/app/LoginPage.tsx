import AuthCard from "./AuthCard";
import { useAuth } from "../lib/auth";

const LoginPage = () => {
  const { login } = useAuth();

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to continue building your Atlas."
      buttonLabel="Sign In"
      footerText="New here?"
      footerLink="/signup"
      onSubmit={login}
    />
  );
};

export default LoginPage;

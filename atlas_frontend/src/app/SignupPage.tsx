import AuthCard from "./AuthCard";
import { useAuth } from "../lib/auth";

const SignupPage = () => {
  const { signup } = useAuth();

  return (
    <AuthCard
      title="Create your Atlas"
      subtitle="Start organizing your handwritten knowledge." 
      buttonLabel="Sign Up"
      footerText="Already have an account?"
      footerLink="/login"
      onSubmit={signup}
    />
  );
};

export default SignupPage;

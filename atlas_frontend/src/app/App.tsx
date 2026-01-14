import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./HomePage";
import LoginPage from "./LoginPage";
import SignupPage from "./SignupPage";
import LibraryPage from "./LibraryPage";
import SubjectDetailPage from "./SubjectDetailPage";
import NotebookDetailPage from "./NotebookDetailPage";
import SettingsPage from "./SettingsPage";
import DashboardLayout from "./DashboardLayout";
import ProtectedRoute from "./ProtectedRoute";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="library" element={<LibraryPage />} />
        <Route path="subjects/:subjectId" element={<SubjectDetailPage />} />
        <Route
          path="subjects/:subjectId/notebooks/:notebookId"
          element={<NotebookDetailPage />}
        />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

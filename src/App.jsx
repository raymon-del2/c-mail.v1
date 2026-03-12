import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Signup from './views/Signup';
import ProfileSetup from './views/ProfileSetup';
import Dashboard from './views/Dashboard';
import Settings from './views/Settings';
import AuthAuthorize from './views/AuthAuthorize';
import ApiDocs from './views/ApiDocs';
import Verify from './views/Verify';
import SplashScreen from './views/SplashScreen';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/login" element={<Signup />} />
        <Route path="/api-docs" element={<ApiDocs />} />
        <Route path="/setup-profile" element={<ProfileSetup />} />
        <Route path="/auth/authorize" element={<AuthAuthorize />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/:username/api-docs" element={<ApiDocs />} />
        <Route path="/:username" element={<Dashboard />} />
        <Route path="/:username/:folder" element={<Dashboard />} />
        <Route path="/:username/:folder/:messageId" element={<Dashboard />} />
        <Route path="/:username/settings" element={<Settings />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

export default App;

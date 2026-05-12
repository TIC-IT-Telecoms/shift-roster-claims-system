import MyProfile from "./pages/MyProfile";
import MyRoster from "./pages/MyRoster";
import MyClaims from "./pages/MyClaims";
import SubmitClaim from "./pages/SubmitClaim";
import MyPayroll from "./pages/MyPayroll";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import MyApprovals from "./pages/MyApprovals";
import MyReports from "./pages/MyReports";
import AdminDashboard from "./pages/AdminDashboard";
import Employees from "./pages/Employees";
import AddEmployee from "./pages/AddEmployee";
import Teams from "./pages/Teams";
import AddTeam from "./pages/AddTeam";
import Shifts from "./pages/Shifts";
import RotationCycles from "./pages/RotationCycles";
import AdminRosters from "./pages/AdminRosters";
import AdminClaims from "./pages/AdminClaims";
import AdminPayroll from "./pages/AdminPayroll";
import GeneratePayroll from "./pages/GeneratePayroll";
import Compliance from "./pages/Compliance";
import AdminReports from "./pages/AdminReports";
import Holidays from "./pages/Holidays";
import AdminSettings from "./pages/AdminSettings";



import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
       <Route path="/profile" element={<MyProfile />} />
       <Route path="/roster" element={<MyRoster />} />
       <Route path="/claims" element={<MyClaims />} />
       <Route path="/submit-claim" element={<SubmitClaim />} />
       <Route path="/payroll" element={<MyPayroll />} />
       <Route path="/notifications" element={<Notifications />} />
       <Route path="/settings" element={<Settings />} />
       <Route path="/approvals" element={<MyApprovals />} />
       <Route path="/reports" element={<MyReports />} />
       <Route path="/admin-dashboard" element={<AdminDashboard />} />
       <Route path="/employees" element={<Employees />} />
       <Route path="/employees/add" element={<AddEmployee />} />
       <Route path="/teams" element={<Teams />} />
       <Route path="/teams/add" element={<AddTeam />} />
       <Route path="/shifts" element={<Shifts />} />
       <Route path="/rotation-cycles" element={<RotationCycles />} />
       <Route path="/admin-rosters" element={<AdminRosters />} />
       <Route path="/admin-claims" element={<AdminClaims />} />
       <Route path="/payroll-admin" element={<AdminPayroll />} />
       <Route path="/payroll-admin/generate" element={<GeneratePayroll />} />
       <Route path="/compliance" element={<Compliance />} />
       <Route path="/admin-reports" element={<AdminReports />} />
       <Route path="/holidays" element={<Holidays />} />
       <Route path="/admin-settings" element={<AdminSettings />} />
       
      </Routes>
    </BrowserRouter>
  );
}

export default App;
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  CalendarDays,
  FileText,
  CheckCircle,
  Wallet,
  BarChart3,
  Bell,
  Settings as SettingsIcon,
  LogOut,
  Users,
  Clock,
  Repeat,
  ShieldAlert,
  CalendarCheck,
} from "lucide-react";

function Layout({ children }) {
  const navigate = useNavigate();
  const role = localStorage.getItem("role") || "employee";

  const handleLogout = () => {
    localStorage.removeItem("role");
    navigate("/");
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <nav className="side-menu">
          {role === "admin" ? (
            <>
              <NavLink to="/admin-dashboard">
                <LayoutDashboard size={16} /> Admin Dashboard
              </NavLink>

              <NavLink to="/employees">
                <Users size={16} /> Employees
              </NavLink>

              <NavLink to="/teams">
                <User size={16} /> Teams
              </NavLink>

              <NavLink to="/shifts">
                <Clock size={16} /> Shifts
              </NavLink>

              <NavLink to="/rotation-cycles">
                <Repeat size={16} /> Rotation Cycles
              </NavLink>

              <NavLink to="/admin-rosters">
                <CalendarDays size={16} /> Rosters
              </NavLink>

              <NavLink to="/admin-claims">
                <FileText size={16} /> Claims
              </NavLink>

              

              <NavLink to="/payroll-admin">
                <Wallet size={16} /> Payroll
              </NavLink>

              <NavLink to="/compliance">
                <ShieldAlert size={16} /> Compliance/Violations
              </NavLink>

              <NavLink to="/holidays">
                <CalendarCheck size={16} /> Holidays
              </NavLink>

              <NavLink to="/admin-reports">
  <BarChart3 size={16} /> Reports
</NavLink>

              <NavLink to="/settings">
                <SettingsIcon size={16} /> Settings
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/dashboard">
                <LayoutDashboard size={16} /> Dashboard
              </NavLink>

              <NavLink to="/profile">
                <User size={16} /> My Profile
              </NavLink>

              <NavLink to="/roster">
                <CalendarDays size={16} /> My Roster
              </NavLink>

              <NavLink to="/claims">
                <FileText size={16} /> My Claims
              </NavLink>

              <NavLink to="/approvals">
                <CheckCircle size={16} /> My Approvals
              </NavLink>

              <NavLink to="/payroll">
                <Wallet size={16} /> My Payroll
              </NavLink>

              <NavLink to="/reports">
                <BarChart3 size={16} /> My Reports
              </NavLink>

              <NavLink to="/notifications">
                <Bell size={16} /> Notifications
              </NavLink>

              

              <NavLink to="/admin-settings">
  <SettingsIcon size={16} /> Settings
</NavLink>
            </>
          )}

          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </nav>
      </aside>

      <main className="app-main">
       <header className="app-topbar compact-topbar">
  <div className="top-brand">
    <div className="small-logo">🛡️</div>
    <div>
      <h4>NOC ROSTER & CLAIMS</h4>
      <span>{role === "admin" ? "MANAGEMENT SYSTEM" : "EMPLOYEE PORTAL"}</span>
    </div>
  </div>

  <div className="top-search">
    <input placeholder="Search employees, shifts, claims, rosters..." />
  </div>

  <div className="top-actions">
    <span className="top-icon">🔍</span>
    <span className="top-icon">✉️</span>
    <div className="bell">🔔<span>3</span></div>
    <div className="avatar">{role === "admin" ? "A" : "LA"}</div>

    <div className="user-info">
      <strong>{role === "admin" ? "Ashura" : "Lesego Aphane"}</strong>
      <small>{role === "admin" ? "Administrator" : "Junior Developer"}</small>
    </div>
  </div>
</header>

        {children}
      </main>
    </div>
  );
}

export default Layout;
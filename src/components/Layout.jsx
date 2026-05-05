import { NavLink } from "react-router-dom";

import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  CalendarDays,
  FileText,
  CheckCircle,
  Wallet,
  BarChart3,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";

function Layout({ children }) {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
       <nav className="side-menu">
  <NavLink to="/dashboard"><LayoutDashboard size={16} /> Dashboard</NavLink>
  <NavLink to="/profile"><User size={16} /> My Profile</NavLink>
  <NavLink to="/roster"><CalendarDays size={16} /> My Roster</NavLink>
  <NavLink to="/claims"><FileText size={16} /> My Claims</NavLink>
  <NavLink to="#"><CheckCircle size={16} /> My Approvals</NavLink>
  <NavLink to="#"><Wallet size={16} /> My Payroll</NavLink>
  <NavLink to="#"><BarChart3 size={16} /> My Reports</NavLink>
  <NavLink to="#"><Bell size={16} /> Notifications</NavLink>
  <NavLink to="#"><Settings size={16} /> Settings</NavLink>
  <NavLink to="#"><LogOut size={16} /> Logout</NavLink>
</nav>
      </aside>

      <main className="app-main">
        <header className="app-topbar">
          <div className="top-brand">
            <div className="small-logo">🛡️</div>
            <div>
              <h4>NOC ROSTER & CLAIMS</h4>
              <span>EMPLOYEE PORTAL</span>
            </div>
          </div>

          <div className="top-search">
            <input placeholder="Search employees, shifts, claims..." />
          </div>

          <div className="top-actions">
            <div className="bell">🔔<span>3</span></div>
            <div className="avatar">LM</div>
            <div className="user-info">
              <strong>Lesego Aphane</strong>
              <small>Junior Developer</small>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

export default Layout;
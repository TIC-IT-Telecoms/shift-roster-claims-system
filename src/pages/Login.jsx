import { useNavigate } from "react-router-dom";

function Login() {
  // 👉 ADD IT HERE
  const navigate = useNavigate();

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo-circle">NOC</div>

        <h2>NOC Roster & Claims</h2>
        <p>Employee Portal</p>

        {/* Email */}
        <div className="form-group">
          <label>Email</label>
          <input type="email" placeholder="Enter your email" />
        </div>

        {/* Password */}
        <div className="form-group">
          <label>Password</label>
          <input type="password" placeholder="Enter your password" />
        </div>

        {/* Remember + Forgot */}
        <div className="form-options">
          <label className="remember">
            <input type="checkbox" />
            Remember me
          </label>

          <a href="#">Forgot Password?</a>
        </div>

        {/* 👉 UPDATE BUTTON */}
        <button onClick={() => navigate("/dashboard")}>
          Sign In
        </button>
      </div>
    </div>
  );
}

export default Login;
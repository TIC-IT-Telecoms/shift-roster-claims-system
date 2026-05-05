import Layout from "../components/Layout";

function Dashboard() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard</div>

        <h2>Welcome back, Lesego Aphane 👋</h2>
        <p className="subtitle">Here’s your overview for today.</p>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div>
              <span>My Next Shift</span>
              <h3>Night Shift</h3>
              <p>
                14 May 2025
                <br />
                14:00 - 22:00
              </p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">⏱️</div>
            <div>
              <span>This Week</span>
              <h3>40h 00m</h3>
              <p>Total Hours</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">📝</div>
            <div>
              <span>Claims Status</span>
              <h3>2</h3>
              <p>Pending</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">💰</div>
            <div>
              <span>Total Earnings (May)</span>
              <h3>R14,560.00</h3>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="panel roster-panel">
            <div className="panel-header">
              <h3>My Roster (This Week)</h3>
            </div>

            <div className="mini-roster">
              {[
                ["Mon", "12 May", "Day"],
                ["Tue", "13 May", "Night"],
                ["Wed", "14 May", "Night"],
                ["Thu", "15 May", "Night"],
                ["Fri", "16 May", "Off"],
                ["Sat", "17 May", "Day"],
                ["Sun", "18 May", "Day"],
              ].map((item, index) => (
                <div className="roster-day" key={index}>
                  <strong>{item[0]}</strong>
                  <small>{item[1]}</small>
                  <span className={item[2] === "Off" ? "off" : ""}>
                    {item[2]}
                  </span>
                  <p>
                    {item[2] === "Off"
                      ? "-"
                      : item[2] === "Day"
                      ? "06:00 - 14:00"
                      : "14:00 - 22:00"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel notifications-panel">
            <div className="panel-header">
              <h3>Recent Notifications</h3>
              <a>View All</a>
            </div>

            <ul className="notifications-list">
              <li>
                <span></span>
                <div>
                  <p>
                    Your claim <b>#CLM2025</b> is pending.
                  </p>
                  <small>20 May 2025 10:15 AM</small>
                </div>
              </li>

              <li>
                <span></span>
                <div>
                  <p>Roster published for next week.</p>
                  <small>20 May 2025 08:00 AM</small>
                </div>
              </li>

              <li>
                <span></span>
                <div>
                  <p>Payslip for May 2025 is available.</p>
                  <small>20 May 2025 06:40 AM</small>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default Dashboard;
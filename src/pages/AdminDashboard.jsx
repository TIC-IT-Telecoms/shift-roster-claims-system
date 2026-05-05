import Layout from "../components/Layout";

function AdminDashboard() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard</div>

        <div className="admin-stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div>
              <span>Total Employees</span>
              <h3>5</h3>
              <p>Active Employees</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">📋</div>
            <div>
              <span>Pending Claims</span>
              <h3>7</h3>
              <p>Awaiting Approval</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">✅</div>
            <div>
              <span>Approved Claims</span>
              <h3>21</h3>
              <p>This Month</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">💰</div>
            <div>
              <span>Total Payroll (May)</span>
              <h3>R156,480.00</h3>
              <p>This Month</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div>
              <span>Upcoming Holidays</span>
              <h3>2</h3>
              <p>Next 30 Days</p>
            </div>
          </div>
        </div>

        <div className="admin-dashboard-grid">
          <div className="panel">
            <div className="panel-header">
              <h3>Claims Overview (This Month)</h3>
            </div>

            <div className="fake-chart">
              <div className="chart-legend">
                <span><b className="blue-dot"></b> Submitted</span>
                <span><b className="green-dot"></b> Approved</span>
                <span><b className="red-dot"></b> Rejected</span>
              </div>

              <div className="chart-bars">
                {[40, 70, 60, 90, 75, 85, 65, 80].map((height, index) => (
                  <div className="chart-group" key={index}>
                    <div className="bar submitted" style={{ height: `${height}px` }}></div>
                    <div className="bar approved" style={{ height: `${height - 25}px` }}></div>
                    <div className="bar rejected" style={{ height: `${Math.max(height - 55, 12)}px` }}></div>
                  </div>
                ))}
              </div>

              <div className="chart-labels">
                <span>1 May</span>
                <span>7 May</span>
                <span>13 May</span>
                <span>19 May</span>
                <span>25 May</span>
                <span>31 May</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h3>Recent Activities</h3>
              <a>View All</a>
            </div>

            <ul className="admin-activity-list">
              <li>
                <span className="activity-icon">📝</span>
                <div>
                  <strong>Musiwa Khavhalani submitted a claim</strong>
                  <small>20 May 2025 10:15 AM</small>
                </div>
              </li>

              <li>
                <span className="activity-icon green">✅</span>
                <div>
                  <strong>Mpho Nemanmbula claim approved</strong>
                  <small>20 May 2025 09:47 AM</small>
                </div>
              </li>

              <li>
                <span className="activity-icon">📅</span>
                <div>
                  <strong>New roster published for next week</strong>
                  <small>20 May 2025 08:30 AM</small>
                </div>
              </li>

              <li>
                <span className="activity-icon purple">💰</span>
                <div>
                  <strong>Payroll generated for May 2025</strong>
                  <small>20 May 2025 06:15 AM</small>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default AdminDashboard;
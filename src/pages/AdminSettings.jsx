import Layout from "../components/Layout";

function AdminSettings() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Settings</div>

        <div className="settings-grid">
          <div className="settings-card">
            <h3>System Settings</h3>

            <div className="form-group">
              <label>Company Name</label>
              <input defaultValue="NOC Roster & Claims" />
            </div>

            <div className="form-group">
              <label>Default Hourly Rate</label>
              <input defaultValue="R100.00" />
            </div>

            <div className="form-group">
              <label>Overtime Multiplier</label>
              <input defaultValue="1.5" />
            </div>

            <button className="primary-btn">Save Settings</button>
          </div>

          <div>
            <div className="settings-card">
              <h3>Admin Notifications</h3>

              <div className="toggle-row">
                <span>Claim Approval Alerts</span>
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <b></b>
                </label>
              </div>

              <div className="toggle-row">
                <span>Compliance Alerts</span>
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <b></b>
                </label>
              </div>

              <div className="toggle-row">
                <span>Payroll Alerts</span>
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <b></b>
                </label>
              </div>
            </div>

            <div className="settings-card">
              <h3>Account Information</h3>

              <div className="account-row">
                <span>Admin ID</span>
                <strong>ADM001</strong>
              </div>

              <div className="account-row">
                <span>Role</span>
                <strong>Administrator</strong>
              </div>

              <div className="account-row">
                <span>Status</span>
                <strong className="active-text">Active</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default AdminSettings;
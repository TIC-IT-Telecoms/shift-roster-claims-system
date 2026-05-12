import Layout from "../components/Layout";

function Settings() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Settings</div>

        <div className="settings-grid">
          <div className="settings-card">
            <h3>Change Password</h3>

            <div className="form-group">
              <label>Current Password</label>
              <input type="password" placeholder="Enter current password" />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input type="password" placeholder="Enter new password" />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" placeholder="Confirm new password" />
            </div>

            <button className="primary-btn">Update Password</button>
          </div>

          <div>
            <div className="settings-card">
              <h3>Notification Preferences</h3>

              <div className="toggle-row">
                <span>Email Notifications</span>
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <b></b>
                </label>
              </div>

              <div className="toggle-row">
                <span>SMS Notifications</span>
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <b></b>
                </label>
              </div>

              <div className="toggle-row">
                <span>Roster Notifications</span>
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <b></b>
                </label>
              </div>

              <div className="toggle-row">
                <span>Claim Status Notifications</span>
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <b></b>
                </label>
              </div>
            </div>

            <div className="settings-card account-card">
              <h3>Account Information</h3>

              <div className="account-row">
                <span>Employee ID</span>
                <strong>EMP001</strong>
              </div>

              <div className="account-row">
                <span>Account Status</span>
                <strong className="active-text">Active</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default Settings;
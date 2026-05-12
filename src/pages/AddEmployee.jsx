import Layout from "../components/Layout";

function AddEmployee() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Employees &gt; Add Employee</div>

        <div className="page-title-row">
          <div>
            <h2>Add Employee</h2>
            <p className="subtitle">Create a new employee record.</p>
          </div>
        </div>

        <div className="claim-form-card">
          <h3>Employee Details</h3>

          <div className="claim-form-row">
            <div className="form-group">
              <label>Full Name</label>
              <input placeholder="Enter full name" />
            </div>

            <div className="form-group">
              <label>Employee ID</label>
              <input placeholder="EMP006" />
            </div>
          </div>

          <div className="claim-form-row">
            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="employee@company.co.za" />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input placeholder="071 234 5678" />
            </div>
          </div>

          <div className="claim-form-row">
            <div className="form-group">
              <label>Team</label>
              <select>
                <option>Network Ops</option>
                <option>Security Ops</option>
                <option>Service Desk</option>
              </select>
            </div>

            <div className="form-group">
              <label>Role</label>
              <select>
                <option>Lead Developer</option>
                <option>Developer</option>
                <option>Junior Developer</option>
                <option>DevOps</option>
              </select>
            </div>
          </div>

          <div className="claim-form-row">
            <div className="form-group">
              <label>Hourly Rate</label>
              <input placeholder="R100.00" />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <a href="/employees" className="cancel-btn">Cancel</a>
            <button className="primary-btn">Save Employee</button>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default AddEmployee;
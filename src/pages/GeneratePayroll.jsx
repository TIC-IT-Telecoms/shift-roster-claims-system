import Layout from "../components/Layout";

function GeneratePayroll() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Payroll &gt; Generate Payroll</div>

        <div className="claim-form-card">
          <h3>Generate Payroll</h3>

          <div className="claim-form-row">
            <div className="form-group">
              <label>Payroll Month</label>
              <select>
                <option>May 2025</option>
                <option>April 2025</option>
                <option>March 2025</option>
              </select>
            </div>

            <div className="form-group">
              <label>Team</label>
              <select>
                <option>All Teams</option>
                <option>Network Ops</option>
                <option>Security Ops</option>
                <option>Service Desk</option>
              </select>
            </div>
          </div>

          <div className="claim-form-row">
            <div className="form-group">
              <label>Normal Hour Rate</label>
              <input defaultValue="R100.00" />
            </div>

            <div className="form-group">
              <label>Overtime Multiplier</label>
              <input defaultValue="1.5" />
            </div>
          </div>

          <div className="claim-form-row">
            <div className="form-group">
              <label>Holiday Rate</label>
              <input defaultValue="R100.00" />
            </div>

            <div className="form-group">
              <label>Include Approved Claims Only</label>
              <select>
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>
          </div>

          <div className="payroll-preview-box">
            <h4>Payroll Preview</h4>
            <p>Total Employees: <strong>5</strong></p>
            <p>Approved Claims: <strong>21</strong></p>
            <p>Estimated Total Payroll: <strong>R156,480.00</strong></p>
          </div>

          <div className="form-actions">
            <a href="/payroll-admin" className="cancel-btn">Cancel</a>
            <button className="primary-btn">Generate Payroll</button>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default GeneratePayroll;
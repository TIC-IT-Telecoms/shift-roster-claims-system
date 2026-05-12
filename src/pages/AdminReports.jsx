import Layout from "../components/Layout";

function AdminReports() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Reports</div>

        <div className="report-filters">
          <div className="form-group">
            <label>Report Type</label>
            <select>
              <option>Payroll Summary</option>
              <option>Claims Report</option>
              <option>Roster Report</option>
              <option>Compliance Report</option>
            </select>
          </div>

          <div className="form-group">
            <label>From Date</label>
            <input type="date" defaultValue="2025-05-01" />
          </div>

          <div className="form-group">
            <label>To Date</label>
            <input type="date" defaultValue="2025-05-31" />
          </div>

          <button className="primary-btn report-generate-btn">
            Generate Report
          </button>
        </div>

        <div className="reports-layout">
          <div className="panel">
            <div className="panel-header">
              <h3>Payroll Summary (01 May - 31 May 2025)</h3>
            </div>

            <div className="bar-chart">
              {[
                ["Week 1", "60%"],
                ["Week 2", "78%"],
                ["Week 3", "92%"],
                ["Week 4", "72%"],
                ["Week 5", "52%"],
              ].map((item, index) => (
                <div className="bar-column" key={index}>
                  <div className="chart-bar" style={{ height: item[1] }}></div>
                  <span>{item[0]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="export-card">
            <h3>Export Report</h3>

            <button className="export-btn pdf">📄 Export as PDF</button>
            <button className="export-btn excel">📊 Export as Excel</button>
            <button className="export-btn csv">📁 Export as CSV</button>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default AdminReports;
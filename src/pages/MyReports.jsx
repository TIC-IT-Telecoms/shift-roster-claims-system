import Layout from "../components/Layout";

function MyReports() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; My Reports</div>

        <div className="page-title-row">
          <div>
            <h2>My Reports</h2>
            <p className="subtitle">Generate and export your roster, claims, and payroll reports.</p>
          </div>

          <button className="primary-btn">Generate Report</button>
        </div>

        <div className="reports-grid">
          <div className="report-card">
            <div className="report-icon">📅</div>
            <h3>Roster Report</h3>
            <p>View your shift schedule report for selected dates.</p>
            <button className="report-btn">Export PDF</button>
          </div>

          <div className="report-card">
            <div className="report-icon">📝</div>
            <h3>Claims Report</h3>
            <p>Download your submitted claims and claim status history.</p>
            <button className="report-btn">Export Excel</button>
          </div>

          <div className="report-card">
            <div className="report-icon">💰</div>
            <h3>Payroll Report</h3>
            <p>Export your monthly payroll and payslip summary.</p>
            <button className="report-btn">Export PDF</button>
          </div>

          <div className="report-card">
            <div className="report-icon">⚠️</div>
            <h3>Compliance Report</h3>
            <p>View overtime, rest period, and public holiday compliance.</p>
            <button className="report-btn">View Report</button>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default MyReports;
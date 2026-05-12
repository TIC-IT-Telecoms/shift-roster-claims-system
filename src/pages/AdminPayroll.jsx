import Layout from "../components/Layout";

const payrollData = [
  ["Musiwa Khavhalani", "Lead Developer", "R8,600.00", "R800.00", "R1,200.00", "R10,600.00"],
  ["Lesego Aphane", "Developer", "R6,200.00", "R900.00", "R1,000.00", "R8,100.00"],
  ["Mpho Nemanmbula", "DevOps", "R4,800.00", "R700.00", "R800.00", "R6,300.00"],
  ["Dimpho Makhatla", "Junior Developer", "R4,400.00", "R600.00", "R800.00", "R5,800.00"],
  ["Bashir", "DevOps", "R6,000.00", "R1,000.00", "R1,200.00", "R8,200.00"],
];

function AdminPayroll() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Payroll</div>

        <div className="page-title-row">
          <div>
            <h2>Payroll</h2>
            <p className="subtitle">Generate and review employee payroll summaries.</p>
          </div>

          <div className="page-actions">
           <a href="/payroll-admin/generate" className="primary-btn">Generate Payroll</a>
            <button className="filter-btn">Export ⌄</button>
          </div>
        </div>

        <div className="payroll-admin-summary">
          <div className="claim-summary-card">
            <span>Total Employees</span>
            <h3>5</h3>
          </div>

          <div className="claim-summary-card">
            <span>Total Payroll</span>
            <h3>R156,480.00</h3>
          </div>

          <div className="claim-summary-card">
            <span>Overtime Pay</span>
            <h3>R21,180.00</h3>
          </div>

          <div className="claim-summary-card">
            <span>Holiday Pay (R100/h)</span>
            <h3>R12,600.00</h3>
          </div>
        </div>

        <div className="roster-table-card">
          <table className="roster-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Normal Pay</th>
                <th>Overtime Pay</th>
                <th>Holiday Pay</th>
                <th>Total Pay</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {payrollData.map((item, index) => (
                <tr key={index}>
                  <td>{item[0]}</td>
                  <td>{item[1]}</td>
                  <td>{item[2]}</td>
                  <td>{item[3]}</td>
                  <td>{item[4]}</td>
                  <td>
                    <strong>{item[5]}</strong>
                  </td>
                  <td>
                    <button className="view-link">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="roster-note">
            Showing 1 to 5 of 5 entries <br />
            Note: Holiday pay calculated at R100.00 per hour.
          </p>
        </div>
      </section>
    </Layout>
  );
}

export default AdminPayroll;
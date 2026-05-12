import Layout from "../components/Layout";

const payslips = [
  ["May 2025", "R11,500.00", "20/05/2025"],
  ["April 2025", "R10,250.00", "20/04/2025"],
  ["March 2025", "R9,800.00", "20/03/2025"],
];

function MyPayroll() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; My Payroll</div>

        <div className="payroll-grid">
          <div className="payroll-summary-card">
            <h3>May 2025 Summary</h3>

            <div className="payroll-row">
              <span>Normal Pay</span>
              <strong>R8,000.00</strong>
            </div>

            <div className="payroll-row">
              <span>Overtime Pay</span>
              <strong>R2,100.00</strong>
            </div>

            <div className="payroll-row">
              <span>Holiday Pay</span>
              <strong>R1,400.00</strong>
            </div>

            <div className="payroll-total">
              <span>Total Earnings</span>
              <strong>R11,500.00</strong>
            </div>

            <p className="roster-note">
              Note: Holiday pay calculated at R100.00 per hour.
            </p>
          </div>

          <div className="payslip-card">
            <h3>Payslips</h3>

            {payslips.map((item, index) => (
              <div className="payslip-item" key={index}>
                <div>
                  <strong>{item[0]}</strong>
                  <span>{item[1]}</span>
                  <small>{item[2]}</small>
                </div>

                <button className="download-btn">⬇</button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default MyPayroll;
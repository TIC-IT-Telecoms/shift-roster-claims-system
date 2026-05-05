import Layout from "../components/Layout";

const complianceData = [
  ["CMP006", "Musiwa Khavhalani", "18/05/2025", "Exceeded 48 hours/week", "High", "Open"],
  ["CMP005", "Lesego Aphane", "17/05/2025", "Insufficient Rest Period", "Medium", "Open"],
  ["CMP004", "Mpho Nemanmbula", "16/05/2025", "Exceeded Night Shifts Limit", "High", "Open"],
  ["CMP003", "Dimpho Makhatla", "15/05/2025", "Missing Meal Break", "Low", "Resolved"],
  ["CMP002", "Bashir", "14/05/2025", "Exceeded 48 hours/week", "High", "Resolved"],
];

function Compliance() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Compliance</div>

        <div className="roster-table-card">
          <table className="roster-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Employee</th>
                <th>Date</th>
                <th>Violation</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {complianceData.map((item, index) => (
                <tr key={index}>
                  <td>{item[0]}</td>
                  <td>{item[1]}</td>
                  <td>{item[2]}</td>
                  <td>{item[3]}</td>
                  <td>
                    <span
                      className={
                        item[4] === "High"
                          ? "severity-high"
                          : item[4] === "Medium"
                          ? "severity-medium"
                          : "severity-low"
                      }
                    >
                      {item[4]}
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        item[5] === "Resolved"
                          ? "status-approved"
                          : "status-rejected"
                      }
                    >
                      {item[5]}
                    </span>
                  </td>
                  <td>
                    <button className="view-link">👁</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="roster-note">Showing 1 to 5 of 6 entries</p>
        </div>
      </section>
    </Layout>
  );
}

export default Compliance;
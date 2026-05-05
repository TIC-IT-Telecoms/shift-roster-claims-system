import Layout from "../components/Layout";

const claimsData = [
  ["#CLM2025", "14 May 2025", "Night Shift", "8h", "2h", "R1,200.00", "Pending"],
  ["#CLM2024", "10 May 2025", "Day Shift", "8h", "0h", "R800.00", "Approved"],
  ["#CLM2023", "05 May 2025", "Night Shift", "8h", "1h", "R1,050.00", "Rejected"],
];

function MyClaims() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; My Claims</div>

        <div className="page-title-row">
          <div>
            <h2>My Claims</h2>
            <p className="subtitle">Submit and track your shift claims.</p>
          </div>

          <a href="/submit-claim" className="primary-btn">+ Submit Claim</a>
        </div>

        <div className="claims-tabs">
  <button className="active">All (4)</button>
  <button>Pending (2)</button>
  <button>Approved (2)</button>
  <button>Rejected (0)</button>
</div>

<div className="roster-table-card">
  <table className="roster-table">
    <thead>
      <tr>
        <th>ID</th>
        <th>Date</th>
        <th>Shift</th>
        <th>Hours</th>
        <th>OT Hours</th>
        <th>Holiday</th>
        <th>Status</th>
        <th>Action</th>
      </tr>
    </thead>

    <tbody>
      {claimsData.map((claim, index) => (
        <tr key={index}>
          <td>{claim[0]}</td>
          <td>{claim[1]}</td>
          <td>{claim[2]}</td>
          <td>{claim[3]}</td>
          <td>{claim[4]}</td>
          <td>No</td>
          <td>
            <span
              className={
                claim[6] === "Approved"
                  ? "status-approved"
                  : claim[6] === "Rejected"
                  ? "status-rejected"
                  : "status-pending"
              }
            >
              {claim[6]}
            </span>
          </td>
          <td>
            <button className="view-link">View</button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>

  <p className="roster-note">Showing 1 to 4 of 4 entries</p>
</div>
      </section>
    </Layout>
  );
}

export default MyClaims;
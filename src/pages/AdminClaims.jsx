import Layout from "../components/Layout";

const adminClaims = [
  ["CLM027", "Musiwa Khavhalani", "20/05/2025", "Night", "8", "2", "No", "Pending"],
  ["CLM026", "Lesego Aphane", "20/05/2025", "Day", "8", "1", "No", "Pending"],
  ["CLM025", "Mpho Nemanmbula", "18/05/2025", "Grave", "8", "2", "No", "Pending"],
  ["CLM024", "Dimpho Makhatla", "18/05/2025", "Night", "8", "0", "Yes", "Pending"],
  ["CLM023", "Bashir", "16/05/2025", "Day", "8", "1", "No", "Pending"],
];

function AdminClaims() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Claims Approvals</div>

        <div className="claims-tabs">
          <button className="active">Pending (7)</button>
          <button>Approved (21)</button>
          <button>Rejected (4)</button>
        </div>

        <div className="employee-toolbar">
          <input placeholder="Search claims..." />
          <button className="filter-btn">Filter ⌄</button>
        </div>

        <div className="roster-table-card">
          <table className="roster-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Employee</th>
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
              {adminClaims.map((claim, index) => (
                <tr key={index}>
                  <td>{claim[0]}</td>
                  <td>{claim[1]}</td>
                  <td>{claim[2]}</td>
                  <td>{claim[3]}</td>
                  <td>{claim[4]}</td>
                  <td>{claim[5]}</td>
                  <td>{claim[6]}</td>
                  <td>
                    <span className="status-pending">{claim[7]}</span>
                  </td>
                  <td>
                    <div className="approval-actions">
                      <button className="approve-btn">✓</button>
                      <button className="reject-btn">×</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="roster-note">Showing 1 to 5 of 7 entries</p>
        </div>
      </section>
    </Layout>
  );
}

export default AdminClaims;
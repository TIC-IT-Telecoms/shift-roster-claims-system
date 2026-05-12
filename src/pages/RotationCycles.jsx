import Layout from "../components/Layout";

const rotationCycles = [
  ["RC001", "2 Days In / 1 Day Off", "3 Days", "Team A, Team B, Team C", "Active"],
  ["RC002", "2 Days In / 2 Days Off", "4 Days", "Team A, Team B", "Draft"],
  ["RC003", "Weekend Grave Rotation", "7 Days", "Team C, Team D", "Active"],
];

function RotationCycles() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Rotation Cycles</div>

        <div className="page-title-row">
          <div>
            <h2>Rotation Cycles</h2>
            <p className="subtitle">Manage team shift rotation patterns.</p>
          </div>

          <button className="primary-btn">+ Add Rotation Cycle</button>
        </div>

        <div className="employee-toolbar">
          <input placeholder="Search rotation cycles..." />
          <button className="filter-btn">Filter ⌄</button>
        </div>

        <div className="roster-table-card">
          <table className="roster-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cycle Name</th>
                <th>Cycle Length</th>
                <th>Teams</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {rotationCycles.map((cycle, index) => (
                <tr key={index}>
                  <td>{cycle[0]}</td>
                  <td>{cycle[1]}</td>
                  <td>{cycle[2]}</td>
                  <td>{cycle[3]}</td>
                  <td>
                    <span
                      className={
                        cycle[4] === "Active"
                          ? "status-approved"
                          : "status-pending"
                      }
                    >
                      {cycle[4]}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="edit-btn">✎</button>
                      <button className="delete-btn">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="roster-note">Showing 1 to 3 of 3 entries</p>
        </div>
      </section>
    </Layout>
  );
}

export default RotationCycles;
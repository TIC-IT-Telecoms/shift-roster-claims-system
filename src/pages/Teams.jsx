import Layout from "../components/Layout";

const teams = [
  ["TEAM001", "Network Ops", "2 Employees", "Musiwa Khavhalani", "Active"],
  ["TEAM002", "Security Ops", "3 Employees", "Lesego Aphane", "Active"],
  ["TEAM003", "Service Desk", "1 Employee", "Bashir", "Active"],
];

function Teams() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Teams</div>

        <div className="page-title-row">
          <div>
            <h2>Teams</h2>
            <p className="subtitle">Manage teams and employee groupings.</p>
          </div>

          <a href="/teams/add" className="primary-btn">+ Add Team</a>
        </div>

        <div className="employee-toolbar">
          <input placeholder="Search teams..." />
          <button className="filter-btn">Filter ⌄</button>
        </div>

        <div className="roster-table-card">
          <table className="roster-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Team Name</th>
                <th>Members</th>
                <th>Team Lead</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {teams.map((team, index) => (
                <tr key={index}>
                  <td>{team[0]}</td>
                  <td>{team[1]}</td>
                  <td>{team[2]}</td>
                  <td>{team[3]}</td>
                  <td><span className="status-approved">{team[4]}</span></td>
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

export default Teams;
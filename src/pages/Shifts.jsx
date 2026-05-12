import Layout from "../components/Layout";

const shifts = [
  ["SH001", "Day Shift", "06:00", "14:00", "No", "Active"],
  ["SH002", "Night Shift", "14:00", "22:00", "No", "Active"],
  ["SH003", "Grave Shift", "22:00", "06:00", "Yes", "Active"],
];

function Shifts() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Shifts</div>

        <div className="page-title-row">
          <div>
            <h2>Shifts</h2>
            <p className="subtitle">Manage shift types, start times, and end times.</p>
          </div>

          <button className="primary-btn">+ Add Shift</button>
        </div>

        <div className="employee-toolbar">
          <input placeholder="Search shifts..." />
          <button className="filter-btn">Filter ⌄</button>
        </div>

        <div className="roster-table-card">
          <table className="roster-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Shift Name</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Grave Shift</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {shifts.map((shift, index) => (
                <tr key={index}>
                  <td>{shift[0]}</td>
                  <td>{shift[1]}</td>
                  <td>{shift[2]}</td>
                  <td>{shift[3]}</td>
                  <td>{shift[4]}</td>
                  <td>
                    <span className="status-approved">{shift[5]}</span>
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

export default Shifts;
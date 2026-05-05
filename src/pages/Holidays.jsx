import Layout from "../components/Layout";

const holidays = [
  ["HOL001", "New Year’s Day", "01/01/2025", "Public Holiday", "Active"],
  ["HOL002", "Human Rights Day", "21/03/2025", "Public Holiday", "Active"],
  ["HOL003", "Freedom Day", "27/04/2025", "Public Holiday", "Active"],
  ["HOL004", "Workers’ Day", "01/05/2025", "Public Holiday", "Active"],
  ["HOL005", "Youth Day", "16/06/2025", "Public Holiday", "Active"],
];

function Holidays() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Holidays</div>

        <div className="page-title-row">
          <div>
            <h2>Holidays</h2>
            <p className="subtitle">
              Manage public holidays used for payroll and compliance.
            </p>
          </div>

          <button className="primary-btn">+ Add Holiday</button>
        </div>

        <div className="employee-toolbar">
          <input placeholder="Search holidays..." />
          <button className="filter-btn">Filter ⌄</button>
        </div>

        <div className="roster-table-card">
          <table className="roster-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Holiday Name</th>
                <th>Date</th>
                <th>Type</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {holidays.map((holiday, index) => (
                <tr key={index}>
                  <td>{holiday[0]}</td>
                  <td>{holiday[1]}</td>
                  <td>{holiday[2]}</td>
                  <td>{holiday[3]}</td>
                  <td>
                    <span className="status-approved">{holiday[4]}</span>
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

          <p className="roster-note">Showing 1 to 5 of 5 entries</p>
        </div>
      </section>
    </Layout>
  );
}

export default Holidays;
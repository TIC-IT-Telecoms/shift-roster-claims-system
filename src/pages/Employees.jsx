import Layout from "../components/Layout";

const employees = [
  ["EMP001", "Musiwa Khavhalani", "Network Ops", "Lead Developer", "R100.00", "Active"],
  ["EMP002", "Lesego Aphane", "Security Ops", "Developer", "R100.00", "Active"],
  ["EMP003", "Mpho Nemanmbula", "Security Ops", "DevOps", "R100.00", "Active"],
  ["EMP004", "Dimpho Makhatla", "Security Ops", "Junior Developer", "R100.00", "Active"],
  ["EMP005", "Bashir", "Service Desk", "DevOps", "R100.00", "Active"],
];

function Employees() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Employees</div>

        <div className="page-title-row">
          <div>
            <h2>Employees</h2>
            <p className="subtitle">Manage employee records and roles.</p>
          </div>

          <a href="/employees/add" className="primary-btn">+ Add Employee</a>
        </div>

        <div className="employee-toolbar">
          <input placeholder="Search employees..." />
          <button className="filter-btn">Filter ⌄</button>
        </div>

        <div className="roster-table-card">
          <table className="roster-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Team</th>
                <th>Role</th>
                <th>Rate (R/h)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {employees.map((emp, index) => (
                <tr key={index}>
                  <td>{emp[0]}</td>
                  <td>{emp[1]}</td>
                  <td>{emp[2]}</td>
                  <td>{emp[3]}</td>
                  <td>{emp[4]}</td>
                  <td>
                    <span className="status-approved">{emp[5]}</span>
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

export default Employees;
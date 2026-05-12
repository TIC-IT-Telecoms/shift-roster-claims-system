import Layout from "../components/Layout";

const rosterRows = [
  ["Musiwa Khavhalani", "Day", "Night", "Grave", "Day", "Off", "Night"],
  ["Lesego Aphane", "Night", "Day", "Day", "Night", "Night", "Day"],
  ["Mpho Nemanmbula", "Grave", "Day", "Day", "Night", "Night", "Grave"],
  ["Dimpho Makhatla", "Day", "Off", "Day", "Night", "Grave", "Day"],
  ["Bashir", "Night", "Day", "Off", "Day", "Day", "Night"],
];

function AdminRosters() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Rosters</div>

        <div className="roster-toolbar">
          <button className="arrow-btn">‹</button>

          <div className="date-picker">
            19 May 2025 - 25 May 2025
            <span>⌄</span>
          </div>

          <button className="filter-btn">All Teams ⌄</button>
          <button className="view-btn">Week ⌄</button>
        </div>

        <div className="roster-table-card">
          <table className="roster-table admin-roster-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Mon<br />19 May</th>
                <th>Tue<br />20 May</th>
                <th>Wed<br />21 May</th>
                <th>Thu<br />22 May</th>
                <th>Fri<br />23 May</th>
                <th>Sun<br />25 May</th>
              </tr>
            </thead>

            <tbody>
              {rosterRows.map((row, index) => (
                <tr key={index}>
                  <td><strong>{row[0]}</strong></td>

                  {row.slice(1).map((shift, shiftIndex) => (
                    <td key={shiftIndex}>
                      <span
                        className={
                          shift === "Day"
                            ? "shift-day"
                            : shift === "Night"
                            ? "shift-night"
                            : shift === "Grave"
                            ? "shift-grave"
                            : "shift-off"
                        }
                      >
                        {shift}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="shift-legend">
            <span><b className="legend-day"></b> Day Shift</span>
            <span><b className="legend-night"></b> Night Shift</span>
            <span><b className="legend-grave"></b> Grave Shift</span>
            <span><b className="legend-off"></b> Off Day</span>
          </div>

          <p className="roster-note">
            Note: Roster is subject to change. Please check regularly.
          </p>
        </div>
      </section>
    </Layout>
  );
}

export default AdminRosters;
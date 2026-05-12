import Layout from "../components/Layout";

const rosterData = [
  ["Mon, 12 May 2025", "Monday", "Day Shift", "06:00 - 14:00", "30m", "Scheduled"],
  ["Tue, 13 May 2025", "Tuesday", "Night Shift", "14:00 - 22:00", "30m", "Scheduled"],
  ["Wed, 14 May 2025", "Wednesday", "Night Shift", "14:00 - 22:00", "30m", "Scheduled"],
  ["Thu, 15 May 2025", "Thursday", "Night Shift", "14:00 - 22:00", "30m", "Scheduled"],
  ["Fri, 16 May 2025", "Friday", "Off Day", "-", "-", "Off"],
  ["Sat, 17 May 2025", "Saturday", "Day Shift", "06:00 - 14:00", "30m", "Scheduled"],
  ["Sun, 18 May 2025", "Sunday", "Night Shift", "14:00 - 22:00", "30m", "Scheduled"],
];

function MyRoster() {
    const today = "Wed, 14 May 2025";
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; My Roster</div>

        <div className="roster-toolbar">
          <button className="arrow-btn">‹</button>

          <div className="date-picker">
            12 May 2025 - 18 May 2025
            <span>⌄</span>
          </div>

          <button className="view-btn">Week ⌄</button>
        </div>

        <div className="roster-table-card">
          <table className="roster-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Shift</th>
                <th>Time</th>
                <th>Break</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {rosterData.map((row, index) => (
                <tr key={index} className={row[0] === today ? "today-row" : ""}>
                  <td>{row[0]}</td>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                  <td>{row[3]}</td>
                  <td>{row[4]}</td>
                  <td>
                    <span className={row[5] === "Off" ? "status-off" : "status-scheduled"}>
                      {row[5]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="roster-note">
            Note: Roster is subject to change. Please check regularly.
          </p>
        </div>
      </section>
    </Layout>
  );
}

export default MyRoster;
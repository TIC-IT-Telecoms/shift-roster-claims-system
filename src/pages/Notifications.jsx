import Layout from "../components/Layout";

const notifications = [
  ["Claim Pending", "Your claim #CLM2025 is waiting for approval.", "20 May 2025 · 10:15 AM", "Unread"],
  ["Roster Published", "Your roster for next week has been published.", "20 May 2025 · 08:00 AM", "Unread"],
  ["Payslip Available", "Your May 2025 payslip is now available.", "20 May 2025 · 06:40 AM", "Read"],
  ["Claim Approved", "Your claim #CLM2024 has been approved.", "18 May 2025 · 14:25 PM", "Read"],
];

function Notifications() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Notifications</div>

        <div className="page-title-row">
          <div>
            <h2>Notifications</h2>
            <p className="subtitle">View your latest system updates.</p>
          </div>

          <button className="primary-btn">Mark All as Read</button>
        </div>

        <div className="notification-card">
          {notifications.map((item, index) => (
            <div className="notification-item" key={index}>
              <div className={item[3] === "Unread" ? "notice-dot unread" : "notice-dot"}></div>

              <div className="notification-content">
                <h4>{item[0]}</h4>
                <p>{item[1]}</p>
                <small>{item[2]}</small>
              </div>

              <span className={item[3] === "Unread" ? "status-pending" : "status-off"}>
                {item[3]}
              </span>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}

export default Notifications;
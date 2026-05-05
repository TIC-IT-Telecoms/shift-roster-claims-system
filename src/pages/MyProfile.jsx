import Layout from "../components/Layout";

function MyProfile() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; My Profile</div>

        <div className="profile-design-grid">
          <div className="profile-info-card">
            <div className="card-title-row">
              <h3>Personal Information</h3>
              <button className="small-edit-btn">Edit</button>
            </div>

            <div className="info-item">
              <span>Full Name</span>
              <strong>Lesego Aphane</strong>
            </div>

            <div className="info-item">
              <span>Employee ID</span>
              <strong>EMP001</strong>
            </div>

            <div className="info-item">
              <span>Email</span>
              <strong>laphane@tic-it.co.za</strong>
            </div>

            <div className="info-item">
              <span>Phone</span>
              <strong>071 234 5678</strong>
            </div>

            <div className="info-item">
              <span>ID Number</span>
              <strong>900101 1234 089</strong>
            </div>

            <div className="info-item">
              <span>Address</span>
              <strong>Polokwane, Limpopo, South Africa</strong>
            </div>
          </div>

          <div className="profile-info-card">
            <h3>Work Information</h3>

            <div className="info-item">
              <span>Team</span>
              <strong>Network Ops</strong>
            </div>

            <div className="info-item">
              <span>Role</span>
              <strong>Junior Developer</strong>
            </div>

            <div className="info-item">
              <span>Hourly Rate</span>
              <strong>R100.00 / hour</strong>
            </div>

            <div className="info-item">
              <span>Employment Type</span>
              <strong>Full Time</strong>
            </div>

            <div className="info-item">
              <span>Join Date</span>
              <strong>01 Jan 2023</strong>
            </div>

            <div className="info-item">
              <span>Supervisor</span>
              <strong>Ashura (Administrator)</strong>
            </div>
          </div>

          <div className="profile-side-card">
            <div className="profile-avatar big">LM</div>
            <h3>Lesego Aphane</h3>
            <p>Junior Developer</p>
            <button className="change-photo-btn">Change Photo</button>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default MyProfile;
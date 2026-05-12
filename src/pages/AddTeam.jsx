import Layout from "../components/Layout";

function AddTeam() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">Dashboard &gt; Teams &gt; Add Team</div>

        <div className="page-title-row">
          <div>
            <h2>Add Team</h2>
            <p className="subtitle">Create a new team.</p>
          </div>
        </div>

        <div className="claim-form-card">
          <h3>Team Details</h3>

          {/* Team Name */}
          <div className="form-group">
            <label>Team Name</label>
            <input placeholder="Enter team name" />
          </div>

          {/* Team Lead */}
          <div className="form-group">
            <label>Team Lead</label>
            <select>
              <option>Select team lead</option>
              <option>Musiwa Khavhalani</option>
              <option>Lesego Aphane</option>
              <option>Mpho Nemanmbula</option>
              <option>Bashir</option>
            </select>
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Description</label>
            <textarea placeholder="Enter team description"></textarea>
          </div>

          {/* Status */}
          <div className="form-group">
            <label>Status</label>
            <select>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="form-actions">
            <a href="/teams" className="cancel-btn">Cancel</a>
            <button className="primary-btn">Save Team</button>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default AddTeam;
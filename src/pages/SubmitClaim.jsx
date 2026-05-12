import Layout from "../components/Layout";

function SubmitClaim() {
  return (
    <Layout>
      <section className="content">
        <div className="breadcrumb">My Claims &gt; Submit New Claim</div>

        <div className="submit-claim-grid">
          <div className="claim-form-card">
            <h3>Claim Details</h3>

            <div className="claim-form-row">
              <div className="form-group">
                <label>Claim Date</label>
                <input type="date" defaultValue="2025-05-20" />
              </div>

              <div className="form-group">
                <label>Shift Type</label>
                <select defaultValue="Night Shift">
                  <option>Day Shift</option>
                  <option>Night Shift</option>
                  <option>Grave Shift</option>
                </select>
              </div>
            </div>

            <div className="claim-form-row">
              <div className="form-group">
                <label>Hours Worked</label>
                <input type="number" defaultValue="8" />
              </div>

              <div className="form-group">
                <label>Overtime Hours</label>
                <input type="number" defaultValue="2" />
              </div>
            </div>

            <div className="form-group">
              <label>Is Public Holiday?</label>

              <div className="radio-row">
                <label>
                  <input type="radio" name="holiday" /> Yes
                </label>

                <label>
                  <input type="radio" name="holiday" defaultChecked /> No
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Description / Notes</label>
              <textarea defaultValue="Network incident - Extra hours worked." />
            </div>

            <div className="form-actions">
              <button className="cancel-btn">Cancel</button>
              <button className="primary-btn">Submit Claim</button>
            </div>
          </div>

          <div className="recent-claims-card">
            <h3>My Recent Claims</h3>

            <div className="recent-claim-item">
              <div>
                <strong>16/05/2025</strong>
                <span>Night Shift</span>
              </div>
              <div>
                <span className="status-pending">Pending</span>
                <small>8h · 2h OT</small>
              </div>
            </div>

            <div className="recent-claim-item">
              <div>
                <strong>16/05/2025</strong>
                <span>Day Shift</span>
              </div>
              <div>
                <span className="status-approved">Approved</span>
                <small>8h · 1h OT</small>
              </div>
            </div>

            <div className="recent-claim-item">
              <div>
                <strong>14/05/2025</strong>
                <span>Grave Shift</span>
              </div>
              <div>
                <span className="status-approved">Approved</span>
                <small>8h · 2h OT</small>
              </div>
            </div>

            <a className="view-all-link">View All</a>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default SubmitClaim;
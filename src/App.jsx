import MyProfile from "./pages/MyProfile";
import MyRoster from "./pages/MyRoster";
import MyClaims from "./pages/MyClaims";
import SubmitClaim from "./pages/SubmitClaim";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
       <Route path="/profile" element={<MyProfile />} />
       <Route path="/roster" element={<MyRoster />} />
       <Route path="/claims" element={<MyClaims />} />
       <Route path="/submit-claim" element={<SubmitClaim />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
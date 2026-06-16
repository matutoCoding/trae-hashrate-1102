import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import QueueManagement from "@/pages/QueueManagement";
import VipManagement from "@/pages/VipManagement";
import PricingSettings from "@/pages/PricingSettings";
import Billing from "@/pages/Billing";
import BillsList from "@/pages/BillsList";
import MembershipManagement from "@/pages/MembershipManagement";
import StoreDashboard from "@/pages/StoreDashboard";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/queue" element={<QueueManagement />} />
          <Route path="/vip" element={<VipManagement />} />
          <Route path="/membership" element={<MembershipManagement />} />
          <Route path="/pricing" element={<PricingSettings />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/bills" element={<BillsList />} />
          <Route path="/dashboard" element={<StoreDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
}

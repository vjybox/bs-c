import { Route, Routes } from "react-router-dom";
import CreateCard from "./pages/CreateCard";
import Editor from "./pages/Editor";
import Requests from "./pages/Requests";
import RecipientView from "./pages/RecipientView";
import ContactsList from "./pages/ContactsList";
import ContactDetail from "./pages/ContactDetail";
import Demo from "./pages/Demo";
import CompaniesList from "./pages/CompaniesList";
import CompanyTree from "./pages/CompanyTree";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CreateCard />} />
      <Route path="/editor" element={<Editor />} />
      <Route path="/editor/requests" element={<Requests />} />
      <Route path="/c/:sessionId" element={<RecipientView />} />
      <Route path="/contacts" element={<ContactsList />} />
      <Route path="/contacts/:contactId" element={<ContactDetail />} />
      <Route path="/companies" element={<CompaniesList />} />
      <Route path="/companies/:companyId" element={<CompanyTree />} />
      <Route path="/demo" element={<Demo />} />
    </Routes>
  );
}

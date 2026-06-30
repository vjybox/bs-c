import { Route, Routes } from "react-router-dom";
import CreateCard from "./pages/CreateCard";
import Editor from "./pages/Editor";
import Requests from "./pages/Requests";
import RecipientView from "./pages/RecipientView";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CreateCard />} />
      <Route path="/editor" element={<Editor />} />
      <Route path="/editor/requests" element={<Requests />} />
      <Route path="/c/:sessionId" element={<RecipientView />} />
    </Routes>
  );
}

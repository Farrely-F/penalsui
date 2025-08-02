import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Homepage } from "./components/Homepage";
import { AppGame } from "./components/AppGame";
import { Toaster } from "./components/ui/sonner";
import { Background } from "./components/Background";
import { AudioPlayer } from "./components/AudioPlayer";

function App() {
  return (
    <Router>
      <AudioPlayer />
      <div className="flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 bg-none">
        <Background />

        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/app" element={<AppGame />} />
        </Routes>

        <Toaster />
      </div>
    </Router>
  );
}

export default App;

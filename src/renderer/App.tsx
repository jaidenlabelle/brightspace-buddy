import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
// import './App.scss';
import Avatar from '@mui/material/Avatar';
import icon from '../../assets/icon.svg';
import LoginPage from './components/LoginPage';

function Home() {
  return (
    <div>
      <Avatar className="avatar" alt="Jaiden Labelle" src={icon} />
      <h1>Home</h1>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<Home />} />
      </Routes>
    </Router>
  );
}

import React, { useEffect, useState } from 'react';
import {
  FiHome,
  FiCreditCard,
  FiBarChart2,
  FiUpload,
  FiGift,
  FiSettings,
  FiDollarSign,
  FiUser,
  FiX,
  FiPieChart,
  FiRepeat,
  FiLogOut,
  FiShield,
  FiTarget,
  FiBookOpen
} from 'react-icons/fi';
import { WiDaySunny, WiCloudy, WiRain, WiSnow, WiThunderstorm, WiFog, WiDayCloudy } from 'react-icons/wi';
import { useAuth } from '../../contexts/AuthContext';

function getWeatherInfo(code) {
  if (code === 0) return { icon: <WiDaySunny className="weather-icon" />, desc: 'Sereno' };
  if (code === 1) return { icon: <WiDaySunny className="weather-icon" />, desc: 'Prevalentemente sereno' };
  if (code === 2) return { icon: <WiDayCloudy className="weather-icon" />, desc: 'Parzialmente nuvoloso' };
  if (code === 3) return { icon: <WiCloudy className="weather-icon" />, desc: 'Nuvoloso' };
  if (code === 45 || code === 48) return { icon: <WiFog className="weather-icon" />, desc: 'Nebbia' };
  if ([51, 53, 55, 56, 57].includes(code)) return { icon: <WiRain className="weather-icon" />, desc: 'Pioggerella' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: <WiRain className="weather-icon" />, desc: 'Pioggia' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: <WiSnow className="weather-icon" />, desc: 'Neve' };
  if ([95, 96, 99].includes(code)) return { icon: <WiThunderstorm className="weather-icon" />, desc: 'Temporale' };
  return { icon: <WiDaySunny className="weather-icon" />, desc: 'N/D' };
}

function Sidebar({ activeMenu, setActiveMenu, sidebarOpen, setSidebarOpen }) {
  const { user, logout, isAdmin } = useAuth();
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!user?.uid) return;
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../../services/firebase');
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const city = userDoc?.exists?.() ? (userDoc.data().weatherCity || 'Roma') : 'Roma';

        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=it`
        );
        const geoData = await geoRes.json();
        if (!geoData.results || geoData.results.length === 0) {
          setWeather({ temp: '--', desc: 'Città non trovata', icon: <WiDaySunny className="weather-icon" />, city });
          return;
        }
        const { latitude, longitude, name } = geoData.results[0];

        const meteoRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
        );
        const meteoData = await meteoRes.json();
        const temp = Math.round(meteoData.current.temperature_2m);
        const weatherInfo = getWeatherInfo(meteoData.current.weather_code);

        setWeather({ temp, desc: weatherInfo.desc, icon: weatherInfo.icon, city: name });
      } catch (error) {
        console.error('Errore caricamento meteo:', error);
        setWeather({ temp: '--', desc: 'Errore', icon: <WiDaySunny className="weather-icon" />, city: '...' });
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const menuItems = [
    { id: 'dashboard', icon: <FiHome />, label: 'Dashboard', color: '#4f46e5' },
    { id: 'accounts', icon: <FiCreditCard />, label: 'Conti', color: '#06b6d4' },
    { id: 'transactions', icon: <FiDollarSign />, label: 'Transazioni', color: '#10b981' },
    { id: 'subscriptions', icon: <FiRepeat />, label: 'Abbonamenti', color: '#0ea5e9' },
    { id: 'categories', icon: <FiBarChart2 />, label: 'Categorie', color: '#8b5cf6' },
    { id: 'reports', icon: <FiBarChart2 />, label: 'Report', color: '#f59e0b' },
    { id: 'budgets', icon: <FiPieChart />, label: 'Budget', color: '#22c55e' },
    { id: 'savings', icon: <FiTarget />, label: 'Obiettivi', color: '#f97316' },
    { id: 'import', icon: <FiUpload />, label: 'Importa', color: '#ef4444' },
    { id: 'birthdays', icon: <FiGift />, label: 'Compleanni', color: '#ec4899' },
    { id: 'loans', icon: <FiBookOpen />, label: 'Prestiti', color: '#f97316' },
    { id: 'admin', icon: <FiShield />, label: 'Admin', color: '#dc2626' },
    { id: 'settings', icon: <FiSettings />, label: 'Impostazioni', color: '#6b7280' }
  ];

  const handleClose = () => setSidebarOpen(false);

  const handleMenuClick = (itemId) => {
    setActiveMenu(itemId);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Errore logout:', e);
    }
  };

  return (
    <>
      {sidebarOpen && <div className="sidebar-overlay" onClick={handleClose} />}

      <div className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="aurora-background">
          <div className="aurora-layer-1"></div>
          <div className="aurora-layer-2"></div>
          <div className="aurora-layer-3"></div>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-header">
            <div className="logo">
              <div className="logo-icon">
                <div className="aurora-glow"></div>
                <img src="/aurora-ghibli.png" alt="Aurora" className="logo-img" />
              </div>
              <div className="logo-text">
                <h2>Aurora</h2>
                <span>4.0</span>
              </div>
            </div>
            <button className="close-sidebar" onClick={handleClose} type="button">
              <FiX />
            </button>
          </div>

          <nav className="sidebar-nav">
            {menuItems
              .filter((item) => {
                if ((item.id === 'admin' || item.id === 'loans') && !isAdmin) return false;
                return true;
              })
              .map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
                  onClick={() => handleMenuClick(item.id)}
                  style={{ '--accent-color': item.color }}
                  type="button"
                >
                  <div className="nav-icon-wrapper">{item.icon}</div>
                  <span className="nav-label">{item.label}</span>
                  <div className="nav-indicator" />
                </button>
              ))}
          </nav>

          <div className="sidebar-footer">
            <div className="weather-card">
              {weather ? weather.icon : <WiDaySunny className="weather-icon" />}
              <div className="weather-info">
                <div className="weather-temp">{weather ? `${weather.temp}°C` : '...'}</div>
                <div className="weather-location">
                  {weather ? `${weather.city}, ${weather.desc}` : 'Caricamento...'}
                </div>
              </div>
            </div>

            <div className="user-card">
              <div className="user-avatar">
                {user?.photoURL ? <img src={user.photoURL} alt="Avatar" className="avatar-img" /> : <FiUser />}
              </div>
              <div className="user-info">
                <div className="user-name">{user?.displayName || 'Utente'}</div>
                <div className="user-status">{isAdmin ? 'Admin' : 'Online'}</div>
              </div>
              <button className="logout-btn desktop-only" onClick={handleLogout} title="Logout" type="button">
                <FiLogOut />
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default Sidebar;

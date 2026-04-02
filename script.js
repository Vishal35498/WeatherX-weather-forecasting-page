
const API_KEY = '92d52ddfe0fa0153558480abe1c8f826';
const BASE = 'https://api.openweathermap.org/data/2.5';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


function updateClock() {
  document.getElementById('clock').textContent =
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

function getEmoji(id, isDay = true) {
  if (id >= 200 && id < 300) return '⛈️';
  if (id >= 300 && id < 400) return '🌦️';
  if (id >= 500 && id < 600) return id === 511 ? '🌨️' : '🌧️';
  if (id >= 600 && id < 700) return '❄️';
  if (id >= 700 && id < 800) return '🌫️';
  if (id === 800) return isDay ? '☀️' : '🌙';
  if (id === 801) return '🌤️';
  if (id === 802) return '⛅';
  return '🌥️';
}

function fmtTime(unix) {
  return new Date(unix * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtHour(unix) {
  return new Date(unix * 1000).toLocaleTimeString([], { hour: 'numeric', hour12: true });
}

function windDir(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function uvLabel(uv) {
  if (uv <= 2) return 'Low';
  if (uv <= 5) return 'Moderate';
  if (uv <= 7) return 'High';
  return 'Very High';
}


function showError(visible) {
  document.getElementById('error').classList.toggle('show', visible);
}


async function loadWeather(city) {
  if (API_KEY === '92d52ddfe0fa0153558480abe1c8f826') {
    loadDemo();
    return;
  }

  showError(false);

  try {
    //current weather
    const curRes = await fetch(
      `${BASE}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
    );
    if (!curRes.ok) { showError(true); return; }
    const cur = await curRes.json();

    // 2. 5-day / 3-hour forecast
    const fcRes = await fetch(
      `${BASE}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
    );
    const fcData = await fcRes.json();

    renderWeather(cur, fcData);

  } catch (e) {
    showError(true);
  }
}

// ── FETCH WEATHER BY GPS COORDINATES ─────────────────────────────────────────
async function loadByCoords(lat, lon) {
  if (API_KEY === '92d52ddfe0fa0153558480abe1c8f826') { loadDemo(); return; }

  showError(false);
  try {
    const curRes = await fetch(
      `${BASE}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );
    const cur = await curRes.json();

    const fcRes = await fetch(
      `${BASE}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );
    const fcData = await fcRes.json();

    renderWeather(cur, fcData);
  } catch (e) {
    showError(true);
  }
}

// ── RENDER REAL API DATA ──────────────────────────────────────────────────────
function renderWeather(cur, fcData) {
  const sys = cur.sys;
  const isDay = cur.dt > sys.sunrise && cur.dt < sys.sunset;

  // Hero card
  document.getElementById('heroCity').textContent  = cur.name;
  document.getElementById('heroMeta').textContent  =
    `${sys.country} · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}`;
  document.getElementById('heroTemp').innerHTML    = `${Math.round(cur.main.temp)}<sup>°C</sup>`;
  document.getElementById('heroDesc').textContent  = cur.weather[0].description;
  document.getElementById('heroFeels').textContent = `Feels like ${Math.round(cur.main.feels_like)}°C`;
  document.getElementById('heroIcon').textContent  = getEmoji(cur.weather[0].id, isDay);

  // Stats
  document.getElementById('sHumidity').innerHTML = `${cur.main.humidity}<span class="stat-unit">%</span>`;
  document.getElementById('sWind').innerHTML     = `${Math.round(cur.wind.speed * 3.6)}<span class="stat-unit"> km/h</span>`;
  document.getElementById('sVis').innerHTML      = `${(cur.visibility / 1000).toFixed(1)}<span class="stat-unit"> km</span>`;
  document.getElementById('sPres').innerHTML     = `${cur.main.pressure}<span class="stat-unit"> hPa</span>`;

  // Sunrise / sunset bar
  document.getElementById('rise').textContent = fmtTime(sys.sunrise);
  document.getElementById('set').textContent  = fmtTime(sys.sunset);
  const pct = Math.max(0, Math.min(100,
    ((Date.now() / 1000 - sys.sunrise) / (sys.sunset - sys.sunrise)) * 100
  ));
  document.getElementById('sunFill').style.width = pct + '%';

  // Extra info
  document.getElementById('eCloud').textContent = `${cur.clouds.all}%`;
  document.getElementById('eWind').textContent  = windDir(cur.wind.deg);
  document.getElementById('eCond').textContent  = cur.weather[0].main;
  document.getElementById('eUV').textContent    = '—';

  // Hourly forecast (next 8 slots = 24 hours)
  const hourHTML = fcData.list.slice(0, 8).map((item, i) => `
    <div class="hour-card">
      <div class="hour-time">${i === 0 ? 'Now' : fmtHour(item.dt)}</div>
      <div class="hour-icon">${getEmoji(item.weather[0].id)}</div>
      <div class="hour-temp">${Math.round(item.main.temp)}°</div>
    </div>
  `).join('');
  document.getElementById('hourly').innerHTML = hourHTML;

  // 7-day forecast — group by date
  const byDate = {};
  fcData.list.forEach(item => {
    const d = new Date(item.dt * 1000);
    const key = d.toDateString();
    if (!byDate[key]) byDate[key] = { dayIdx: d.getDay(), items: [] };
    byDate[key].items.push(item);
  });

  const fcHTML = Object.entries(byDate).slice(0, 7).map(([key, v], i) => {
    const temps = v.items.map(x => x.main.temp);
    const mid   = v.items[Math.floor(v.items.length / 2)];
    return `
      <div class="fc-card ${i === 0 ? 'today' : ''}">
        <div class="fc-day">${i === 0 ? 'Today' : DAYS[v.dayIdx]}</div>
        <div class="fc-icon">${getEmoji(mid.weather[0].id)}</div>
        <div class="fc-hi">${Math.round(Math.max(...temps))}°</div>
        <div class="fc-lo">${Math.round(Math.min(...temps))}°</div>
      </div>
    `;
  }).join('');
  document.getElementById('forecast').innerHTML = fcHTML;
}

// ── DEMO MODE — shown when no API key is set ──────────────────────────────────
function loadDemo() {
  document.getElementById('heroCity').textContent  = 'New Delhi';
  document.getElementById('heroMeta').textContent  = 'India · Demo Mode — add your API key!';
  document.getElementById('heroTemp').innerHTML    = '33<sup>°C</sup>';
  document.getElementById('heroDesc').textContent  = 'Partly Cloudy';
  document.getElementById('heroFeels').textContent = 'Feels like 36°C';
  document.getElementById('heroIcon').textContent  = '⛅';

  document.getElementById('sHumidity').innerHTML = '58<span class="stat-unit">%</span>';
  document.getElementById('sWind').innerHTML     = '18<span class="stat-unit"> km/h</span>';
  document.getElementById('sVis').innerHTML      = '9.0<span class="stat-unit"> km</span>';
  document.getElementById('sPres').innerHTML     = '1008<span class="stat-unit"> hPa</span>';

  document.getElementById('rise').textContent       = '6:12 AM';
  document.getElementById('set').textContent        = '6:44 PM';
  document.getElementById('sunFill').style.width    = '45%';
  document.getElementById('eUV').textContent        = '7 — High';
  document.getElementById('eCloud').textContent     = '40%';
  document.getElementById('eWind').textContent      = 'NW';
  document.getElementById('eCond').textContent      = 'Clouds';

  const demoHourly = [
    { t: 'Now',   i: '⛅', v: 33 },
    { t: '1 PM',  i: '☀️', v: 35 },
    { t: '2 PM',  i: '☀️', v: 36 },
    { t: '3 PM',  i: '🌤️', v: 34 },
    { t: '4 PM',  i: '⛅', v: 32 },
    { t: '5 PM',  i: '🌦️', v: 30 },
    { t: '6 PM',  i: '🌧️', v: 28 },
    { t: '7 PM',  i: '🌧️', v: 27 }
  ];
  document.getElementById('hourly').innerHTML = demoHourly.map(h => `
    <div class="hour-card">
      <div class="hour-time">${h.t}</div>
      <div class="hour-icon">${h.i}</div>
      <div class="hour-temp">${h.v}°</div>
    </div>
  `).join('');

  const demoForecast = [
    { d: 'Today', i: '⛅', hi: 33, lo: 24 },
    { d: 'Wed',   i: '🌤️', hi: 35, lo: 25 },
    { d: 'Thu',   i: '☀️', hi: 37, lo: 26 },
    { d: 'Fri',   i: '🌦️', hi: 30, lo: 23 },
    { d: 'Sat',   i: '🌧️', hi: 27, lo: 21 },
    { d: 'Sun',   i: '⛈️', hi: 26, lo: 20 },
    { d: 'Mon',   i: '🌤️', hi: 34, lo: 24 }
  ];
  document.getElementById('forecast').innerHTML = demoForecast.map((f, i) => `
    <div class="fc-card ${i === 0 ? 'today' : ''}">
      <div class="fc-day">${f.d}</div>
      <div class="fc-icon">${f.i}</div>
      <div class="fc-hi">${f.hi}°</div>
      <div class="fc-lo">${f.lo}°</div>
    </div>
  `).join('');
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────
document.getElementById('searchBtn').addEventListener('click', () => {
  const city = document.getElementById('cityInput').value.trim();
  if (city) loadWeather(city);
});

document.getElementById('cityInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const city = document.getElementById('cityInput').value.trim();
    if (city) loadWeather(city);
  }
});

document.getElementById('locBtn').addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => loadByCoords(pos.coords.latitude, pos.coords.longitude),
    ()  => alert('Location access denied. Please allow location access.')
  );
});

// ── START ─────────────────────────────────────────────────────────────────────
loadDemo(); // shows demo data until you add a real API key
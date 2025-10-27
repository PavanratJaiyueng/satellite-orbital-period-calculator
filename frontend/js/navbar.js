const navbarContainer = document.getElementById('navbar');

// ฟังก์ชันอัพเดทเวลา UTC
function updateUTCTime() {
  const now = new Date();
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  
  const utcTimeElement = document.getElementById('utcTime');
  if (utcTimeElement) {
    utcTimeElement.textContent = `${hours}:${minutes}:${seconds}`;
  }
}

async function loadNavbar() {
  try {
    const res = await fetch('/checkSession');
    const { loggedIn, user } = await res.json();

    const currentPath = window.location.pathname;

    // ฟังก์ชันช่วยสร้างลิงก์เมนู
    function navLink(path, label, icon) {
      const isActive = currentPath === path;
      return `
        <a class="dropdown-item ${isActive ? 'active current-page' : ''}" 
           href="${isActive ? '#' : path}">
          <i class="fas ${icon} me-2"></i>
          ${label}
        </a>
      `;
    }

    if (loggedIn) {
      const fullName = user ? `${user.name} ${user.lastname}` : 'User';
      
      navbarContainer.innerHTML = `
              <nav class="navbar navbar-expand-lg custom-navbar">
                <div class="container-fluid">
                  <a class="navbar-brand" href="calculate">Satellite Orbital Period Calculator</a>
                  <div class="collapse navbar-collapse justify-content-end">
                    <ul class="navbar-nav me-3 align-items-center">
                      <!-- UTC Clock -->
                      <li class="nav-item me-3">
                        <div class="utc-clock">
                          <span class="utc-label">UTC</span>
                          <span class="utc-time" id="utcTime">00:00:00</span>
                        </div>
                      </li>
                      
                      <!-- Help Button -->
                      <li class="nav-item me-3">
                        <a href="/help" class="btn btn-outline-light d-flex align-items-center gap-2">
                          <i class="fas fa-question-circle"></i>
                          <span>Help</span>
                        </a>
                      </li>
                      
                      <!-- User Dropdown -->
                      <li class="nav-item dropdown">
                        <button class="btn nav-link dropdown-toggle d-flex align-items-center gap-2" 
                                id="userDropdown" 
                                data-bs-toggle="dropdown" 
                                aria-expanded="false">
                          <span class="username-text">${fullName}</span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end user-dropdown" aria-labelledby="userDropdown">
                          <li class="dropdown-header">
                            <div class="user-greeting">Hi,</div>
                            <div class="user-name">${fullName}</div>
                          </li>
                          <li><hr class="dropdown-divider"></li>

                          <li>${navLink('/edit_profile', 'Profile', 'fa-user-circle')}</li>
                          <li>${navLink('/calculate', 'Satellite Tracking', 'fa-satellite')}</li>
                          <li>${navLink('/generate-token', 'API Tokens', 'fa-cog')}</li>
                          
                          <li><hr class="dropdown-divider"></li>
                          <li>
                            <button id="logoutBtn" class="dropdown-item text-danger">
                              <i class="fas fa-sign-out-alt me-2"></i>
                              Logout
                            </button>
                          </li>
                        </ul>
                      </li>
                    </ul>
                  </div>
                </div>
              </nav>
            `;
      
      // เริ่มอัพเดทเวลา UTC
      updateUTCTime();
      setInterval(updateUTCTime, 1000);
      
      // Logout functionality
      document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
          const response = await fetch('/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          const data = await response.json();
          
          if (data.success) {
            console.log('Logout successful');
            window.location.href = '/';
          } else {
            alert('Logout failed: ' + (data.message || 'Unknown error'));
          }
        } catch (error) {
          console.error('Logout error:', error);
          window.location.href = '/';
        }
      });
      
    } else {
      navbarContainer.innerHTML = `
        <nav class="navbar navbar-expand-lg custom-navbar">
          <div class="container-fluid">
            <a class="navbar-brand" href="welcome.html">Satellite Orbital Period Calculator</a>
            <div class="collapse navbar-collapse justify-content-end">
              <ul class="navbar-nav me-5 align-items-center">
                <!-- UTC Clock for guests -->
                <li class="nav-item me-3">
                  <div class="utc-clock">
                    <span class="utc-label">UTC</span>
                    <span class="utc-time" id="utcTime">00:00:00</span>
                  </div>
                </li>
                
                <li class="nav-item">
                  ${navLink('/login.html', 'Login', 'fa-sign-in-alt')}
                </li>
                <li class="nav-item">
                  ${navLink('/register.html', 'Register', 'fa-user-plus')}
                </li>
              </ul>
            </div>
          </div>
        </nav>
      `;
      
      // เริ่มอัพเดทเวลา UTC สำหรับผู้ที่ยังไม่ล็อกอิน
      updateUTCTime();
      setInterval(updateUTCTime, 1000);
    }
  } catch (err) {
    console.error('Error loading navbar:', err);
  }
}

loadNavbar();
// ===== TOKEN MANAGEMENT =====
export function getAuthToken() {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

export function setAuthToken(token, remember = false) {
  if (remember) {
    localStorage.setItem('authToken', token);
  } else {
    sessionStorage.setItem('authToken', token);
  }
}

export function clearAuthToken() {
  localStorage.removeItem('authToken');
  sessionStorage.removeItem('authToken');
}

// ===== SEARCH SATELLITES API =====
export async function searchSatellites(searchTerm, searchType = 'name') {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please login.');
  }

  try {
    // สร้าง URL ตาม searchType
    const queryParam = searchType === 'norad' ? 'norad_id' : 'name';
    const url = `/search?${queryParam}=${encodeURIComponent(searchTerm)}`;
    
    console.log('Search URL:', url);
    console.log('Search Type:', searchType);
    console.log('Search Term:', searchTerm);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please login again.');
      }
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Search failed');
    }

    const data = await response.json();
    console.log('Search results:', data);
    
    return data;
  } catch (error) {
    console.error('Search API error:', error);
    throw error;
  }
}

// ===== CALCULATE SATELLITES API =====
export async function calculateSatellites(payload) {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please login.');
  }

  try {
    console.log('Sending calculation request...');
    console.log('Payload:', payload);
    
    const response = await fetch('/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid or expired token');
      }
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Calculation failed');
    }

    const result = await response.json();
    console.log('Calculation result received');
    
    return result;
  } catch (error) {
    console.error('Calculate API error:', error);
    throw error;
  }
}

// ===== RANDOM SATELLITES API =====
export async function getRandomSatellites(payload) {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please login.');
  }

  try {
    console.log('Sending random satellites request...');
    console.log('Payload:', payload);
    
    const response = await fetch('/random-satellites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid or expired token');
      }
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Random satellite request failed');
    }

    const result = await response.json();
    console.log('Random satellites result received');
    
    return result;
  } catch (error) {
    console.error('Random satellites API error:', error);
    throw error;
  }
}

// ===== LOGIN API =====
export async function login(email, password) {
  try {
    console.log('Attempting login...');
    
    const response = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    if (data.token) {
      setAuthToken(data.token);
      console.log('Login successful, token saved');
    }

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// ===== REGISTER API =====
export async function register(name, lastname, email, password) {
  try {
    console.log('Attempting registration...');
    
    const response = await fetch('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, lastname, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    if (data.token) {
      setAuthToken(data.token);
      console.log('Registration successful, token saved');
    }

    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

// ===== LOGOUT API =====
export async function logout() {
  try {
    console.log('Attempting logout...');
    
    const response = await fetch('/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    clearAuthToken();
    console.log('Logout successful, token cleared');

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Logout error:', error);
    clearAuthToken();
    throw error;
  }
}

// ===== CHECK SESSION API =====
export async function checkSession() {
  try {
    const response = await fetch('/checkSession', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to check session');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Check session error:', error);
    throw error;
  }
}

// ===== PROFILE API =====
export async function getProfile() {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please login.');
  }

  try {
    const response = await fetch('/api/showprofile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please login again.');
      }
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Failed to get profile');
    }

    return await response.json();
  } catch (error) {
    console.error('Get profile error:', error);
    throw error;
  }
}

export async function updateProfile(name, lastname) {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please login.');
  }

  try {
    const response = await fetch('/api/updateprofile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name, lastname })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please login again.');
      }
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Failed to update profile');
    }

    return await response.json();
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
}

export async function changePassword(currentPassword, newPassword) {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please login.');
  }

  try {
    const response = await fetch('/api/changepassword', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please login again.');
      }
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Failed to change password');
    }

    return await response.json();
  } catch (error) {
    console.error('Change password error:', error);
    throw error;
  }
}

// ===== TOKEN MANAGEMENT API =====
export async function createAPIToken(name) {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please login.');
  }

  try {
    const response = await fetch('/api/createtoken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please login again.');
      }
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Failed to create token');
    }

    return await response.json();
  } catch (error) {
    console.error('Create API token error:', error);
    throw error;
  }
}

export async function getAPITokens() {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please login.');
  }

  try {
    const response = await fetch('/api/showtokens', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please login again.');
      }
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Failed to get tokens');
    }

    return await response.json();
  } catch (error) {
    console.error('Get API tokens error:', error);
    throw error;
  }
}

export async function deleteAPIToken(tokenId) {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please login.');
  }

  try {
    const response = await fetch(`/api/deletetoken/${tokenId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please login again.');
      }
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Failed to delete token');
    }

    return await response.json();
  } catch (error) {
    console.error('Delete API token error:', error);
    throw error;
  }
}

export async function showAPIToken(tokenId) {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please login.');
  }

  try {
    const response = await fetch(`/api/showtoken/${tokenId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please login again.');
      }
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Failed to show token');
    }

    return await response.json();
  } catch (error) {
    console.error('Show API token error:', error);
    throw error;
  }
}
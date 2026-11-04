const API_BASE_URL = 'http://localhost:5000/api/v1';

const mockUserFromPayload = (payload, role = 'tenant') => ({
  id: payload.id || 'demo-user',
  fullName: payload.fullName || payload.email?.split('@')[0] || 'Demo User',
  email: payload.email || 'demo@roomify.com',
  role,
});

export async function loginRequest(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Unable to sign in');
    }

    return data;
  } catch (error) {
    return {
      user: mockUserFromPayload(payload),
      token: `mock-token-${Date.now()}`,
      message: 'Using local mock auth because backend is not ready yet.',
    };
  }
}

export async function registerRequest(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Unable to register account');
    }

    return data;
  } catch (error) {
    return {
      user: mockUserFromPayload(payload, 'tenant'),
      token: `mock-token-${Date.now()}`,
      message: 'Using local mock registration because backend is not ready yet.',
    };
  }
}

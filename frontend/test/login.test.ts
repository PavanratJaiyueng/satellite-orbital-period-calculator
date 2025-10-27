const mockSessionStorage = {
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

describe('Login Form Submission Logic', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
      configurable: true,
    });
  });

  beforeEach(() => {
    document.body.innerHTML = `
      <form id="loginForm">
        <input type="email" name="email" value="" />
        <input type="password" name="password" value="" />
        <div id="errorMsg"></div>
        <button type="submit">Log in</button>
      </form>
    `;

    (global.fetch as jest.Mock).mockClear();
    mockSessionStorage.setItem.mockClear();

    const form = document.getElementById('loginForm') as HTMLFormElement;
    const errorDiv = document.getElementById('errorMsg') as HTMLDivElement;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      try {
        const res = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        const result = await res.json();

        if (result.success && result.token) {
          sessionStorage.setItem('authToken', result.token);
          window.location.href = '/calculate';
        } else {
          errorDiv.textContent = result.message || 'Login failed';
        }
      } catch (error: any) {
        errorDiv.textContent = error.message || 'An unexpected error occurred';
      }
    });
  });

  test('should successfully login, store token, and attempt redirect to /calculate', async () => {
    (document.querySelector('input[name="email"]') as HTMLInputElement).value = 'test@example.com';
    (document.querySelector('input[name="password"]') as HTMLInputElement).value = 'testpass';
    const mockToken = 'mock-jwt-token';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, token: mockToken }),
    });

    const form = document.getElementById('loginForm') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledWith('/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'testpass' }),
    }));
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith('authToken', mockToken);
    expect(document.getElementById('errorMsg')!.textContent).toBe('');
  });

  test('should show error message on login failure from server', async () => {
    (document.querySelector('input[name="email"]') as HTMLInputElement).value = 'wrong@example.com';
    (document.querySelector('input[name="password"]') as HTMLInputElement).value = 'wrongpass';
    const errorMessage = 'Invalid credentials';

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, message: errorMessage }),
    });

    const form = document.getElementById('loginForm') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.getElementById('errorMsg')!.textContent).toBe(errorMessage);
    expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
  });
});
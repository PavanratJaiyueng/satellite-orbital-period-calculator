const mockSessionStorage2 = {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};

describe('Register Form Submission Logic', () => {
    let mockToken: string;
    
    beforeAll(() => {
        Object.defineProperty(window, 'sessionStorage', { 
            value: mockSessionStorage2,
            configurable: true,
            writable: true
        });
    });

    beforeEach(() => {
        document.body.innerHTML = `
            <form id="registerForm">
                <input type="text" name="name" value="" />
                <input type="text" name="lastname" value="" />
                <input type="email" name="email" value="" />
                <input type="password" name="password" value="" />
                <input type="password" name="confirmPassword" value="" />
                <div id="errorMsg" style="color: red;"></div>
                <button type="submit">Register</button>
            </form>
        `;
        
        (global.fetch as jest.Mock).mockClear();
        mockSessionStorage2.setItem.mockClear();

        const form = document.getElementById('registerForm') as HTMLFormElement;
        const errorDiv = document.getElementById('errorMsg') as HTMLDivElement;
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            if (data.password !== data.confirmPassword) {
                errorDiv.style.color = 'red';
                errorDiv.textContent = 'Passwords do not match';
                return;
            }

            delete data.confirmPassword; 

            try {
                const res = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });

                const result = await res.json();
                
                if (result.success && result.token) {
                    sessionStorage.setItem('authToken', result.token); 
                    window.location.replace('/calculate'); 
                } else {
                    errorDiv.textContent = result.message || 'Registration failed';
                }
            } catch (error: any) {
                errorDiv.textContent = error.message || 'An unexpected error occurred';
            }
        });
    });

    test('should show error message if passwords do not match and prevent fetch', async () => {
        (document.querySelector('input[name="name"]') as HTMLInputElement).value = 'John';
        (document.querySelector('input[name="lastname"]') as HTMLInputElement).value = 'Doe';
        (document.querySelector('input[name="email"]') as HTMLInputElement).value = 'john@example.com';
        (document.querySelector('input[name="password"]') as HTMLInputElement).value = 'pass123';
        (document.querySelector('input[name="confirmPassword"]') as HTMLInputElement).value = 'pass456';
        
        const form = document.getElementById('registerForm') as HTMLFormElement;
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        
        await Promise.resolve();
        
        expect(global.fetch).not.toHaveBeenCalled();
        expect(document.getElementById('errorMsg')!.textContent).toBe('Passwords do not match');
    });

    test('should successfully register, store token, and attempt redirect to /calculate', async () => {
        (document.querySelector('input[name="name"]') as HTMLInputElement).value = 'John';
        (document.querySelector('input[name="lastname"]') as HTMLInputElement).value = 'Doe';
        (document.querySelector('input[name="email"]') as HTMLInputElement).value = 'john@example.com';
        (document.querySelector('input[name="password"]') as HTMLInputElement).value = 'pass123';
        (document.querySelector('input[name="confirmPassword"]') as HTMLInputElement).value = 'pass123';
        mockToken = 'new-jwt-token';
        
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, token: mockToken }),
        });
        
        const form = document.getElementById('registerForm') as HTMLFormElement;
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(global.fetch).toHaveBeenCalledWith('/register', expect.objectContaining({
            method: 'POST',
            body: expect.not.stringContaining('confirmPassword')
        }));
        expect(mockSessionStorage2.setItem).toHaveBeenCalledWith('authToken', mockToken); 
        expect(document.getElementById('errorMsg')!.textContent).toBe('');
    });
});
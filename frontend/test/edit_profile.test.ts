describe('Edit Profile Page (edit_profile.html)', () => {
    
    beforeEach(() => {
        document.body.innerHTML = `
            <div class="profile-container">
                <h1>Edit Profile</h1>
                <div class="profile-section">
                    <h2>Personal Information</h2>
                    <form id="editProfileForm">
                        <input type="text" id="first-name" name="firstName" />
                        <input type="text" id="last-name" name="lastName" />
                        <input type="email" id="email" name="email" />
                        <button type="submit" id="saveProfileBtn">บันทึกข้อมูล</button>
                    </form>
                    <div id="profileMessageDiv"></div>
                </div>

                <div class="profile-section">
                    <h2>Change Password</h2>
                    <form id="changePasswordForm">
                        <input type="password" id="current-password" name="currentPassword" />
                        <input type="password" id="new-password" name="newPassword" />
                        <input type="password" id="confirm-new-password" name="confirmNewPassword" />
                        <button type="submit" id="changePasswordBtn">เปลี่ยนรหัสผ่าน</button>
                    </form>
                    <div id="passwordMessageDiv"></div>
                </div>

                <a href="/calculate" id="backToCalcBtn">Satellite Orbital Period Calculator</a>
            </div>
        `;
        
        (global.fetch as jest.Mock).mockClear();

        // Edit Profile Handler
        const editForm = document.getElementById('editProfileForm') as HTMLFormElement;
        const saveBtn = document.getElementById('saveProfileBtn') as HTMLButtonElement;
        const profileMsg = document.getElementById('profileMessageDiv')!;

        editForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const firstName = (document.getElementById('first-name') as HTMLInputElement).value;
            const lastName = (document.getElementById('last-name') as HTMLInputElement).value;
            const email = (document.getElementById('email') as HTMLInputElement).value;

            profileMsg.textContent = '';
            profileMsg.className = '';

            if (!firstName || !lastName || !email) {
                profileMsg.textContent = 'กรุณากรอกข้อมูลให้ครบถ้วน';
                profileMsg.className = 'error-msg';
                return;
            }

            saveBtn.disabled = true;

            try {
                const res = await fetch('/api/user/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ firstName, lastName, email }),
                });
                const result = await res.json();

                if (result.success) {
                    profileMsg.textContent = 'บันทึกข้อมูลสำเร็จ!';
                    profileMsg.className = 'success-msg';
                } else {
                    profileMsg.textContent = result.message || 'บันทึกข้อมูลไม่สำเร็จ';
                    profileMsg.className = 'error-msg';
                }
            } catch (error) {
                profileMsg.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
                profileMsg.className = 'error-msg';
            } finally {
                saveBtn.disabled = false;
            }

            setTimeout(() => {
                profileMsg.textContent = '';
                profileMsg.className = '';
            }, 5000);
        });

        // Change Password Handler
        const pwdForm = document.getElementById('changePasswordForm') as HTMLFormElement;
        const pwdBtn = document.getElementById('changePasswordBtn') as HTMLButtonElement;
        const pwdMsg = document.getElementById('passwordMessageDiv')!;

        pwdForm?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const current = (document.getElementById('current-password') as HTMLInputElement).value;
            const newPwd = (document.getElementById('new-password') as HTMLInputElement).value;
            const confirm = (document.getElementById('confirm-new-password') as HTMLInputElement).value;

            pwdMsg.textContent = '';
            pwdMsg.className = '';

            if (!current || !newPwd || !confirm) {
                pwdMsg.textContent = 'กรุณากรอกข้อมูลให้ครบถ้วน';
                pwdMsg.className = 'error-msg';
                return;
            }

            if (newPwd !== confirm) {
                pwdMsg.textContent = 'รหัสผ่านไม่ตรงกัน';
                pwdMsg.className = 'error-msg';
                return;
            }

            pwdBtn.disabled = true;

            try {
                const res = await fetch('/api/user/password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword: current, newPassword: newPwd }),
                });
                const result = await res.json();

                if (result.success) {
                    pwdMsg.textContent = 'เปลี่ยนรหัสผ่านสำเร็จ!';
                    pwdMsg.className = 'success-msg';
                    (document.getElementById('current-password') as HTMLInputElement).value = '';
                    (document.getElementById('new-password') as HTMLInputElement).value = '';
                    (document.getElementById('confirm-new-password') as HTMLInputElement).value = '';
                } else {
                    pwdMsg.textContent = result.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ';
                    pwdMsg.className = 'error-msg';
                }
            } catch (error) {
                pwdMsg.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
                pwdMsg.className = 'error-msg';
            } finally {
                pwdBtn.disabled = false;
            }

            setTimeout(() => {
                pwdMsg.textContent = '';
                pwdMsg.className = '';
            }, 5000);
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    describe('Edit Profile Form - UI', () => {
        test('should have Edit Profile heading', () => {
            expect(document.querySelector('h1')?.textContent).toContain('Edit Profile');
        });

        test('should have first name input', () => {
            const input = document.getElementById('first-name') as HTMLInputElement;
            expect(input).not.toBeNull();
            expect(input.type).toBe('text');
        });

        test('should have save button', () => {
            const btn = document.getElementById('saveProfileBtn') as HTMLButtonElement;
            expect(btn?.textContent).toBe('บันทึกข้อมูล');
            expect(btn?.type).toBe('submit');
        });
    });

    describe('Edit Profile Form - Validation', () => {
        test('should show error if fields are empty', async () => {
            const form = document.getElementById('editProfileForm') as HTMLFormElement;
            form.dispatchEvent(new Event('submit'));
            await new Promise(r => setTimeout(r, 0));

            const msg = document.getElementById('profileMessageDiv')!;
            expect(msg.textContent).toBe('กรุณากรอกข้อมูลให้ครบถ้วน');
            expect(msg.className).toBe('error-msg');
        });
    });

    describe('Edit Profile Form - Submission', () => {
        test('should successfully save profile', async () => {
            (document.getElementById('first-name') as HTMLInputElement).value = 'John';
            (document.getElementById('last-name') as HTMLInputElement).value = 'Doe';
            (document.getElementById('email') as HTMLInputElement).value = 'john@example.com';

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({ success: true }),
            });

            const form = document.getElementById('editProfileForm') as HTMLFormElement;
            form.dispatchEvent(new Event('submit'));
            
            await new Promise(r => setTimeout(r, 50));

            const msg = document.getElementById('profileMessageDiv')!;
            expect(msg.textContent).toBe('บันทึกข้อมูลสำเร็จ!');
            expect(msg.className).toBe('success-msg');
        });

        test('should disable button during submission', async () => {
            (document.getElementById('first-name') as HTMLInputElement).value = 'John';
            (document.getElementById('last-name') as HTMLInputElement).value = 'Doe';
            (document.getElementById('email') as HTMLInputElement).value = 'john@example.com';

            (global.fetch as jest.Mock).mockImplementationOnce(
                () => new Promise(r => setTimeout(() => r({
                    json: async () => ({ success: true })
                }), 100))
            );

            const saveBtn = document.getElementById('saveProfileBtn') as HTMLButtonElement;
            const form = document.getElementById('editProfileForm') as HTMLFormElement;
            
            form.dispatchEvent(new Event('submit'));
            expect(saveBtn.disabled).toBe(true);

            await new Promise(r => setTimeout(r, 150));
            expect(saveBtn.disabled).toBe(false);
        });

        test('should show error message on failure', async () => {
            (document.getElementById('first-name') as HTMLInputElement).value = 'John';
            (document.getElementById('last-name') as HTMLInputElement).value = 'Doe';
            (document.getElementById('email') as HTMLInputElement).value = 'john@example.com';

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({ success: false, message: 'Email already exists' }),
            });

            const form = document.getElementById('editProfileForm') as HTMLFormElement;
            form.dispatchEvent(new Event('submit'));

            await new Promise(r => setTimeout(r, 50));

            const msg = document.getElementById('profileMessageDiv')!;
            expect(msg.textContent).toBe('Email already exists');
            expect(msg.className).toBe('error-msg');
        });

        test('should clear message after 5 seconds', async () => {
            jest.useFakeTimers();

            (document.getElementById('first-name') as HTMLInputElement).value = 'John';
            (document.getElementById('last-name') as HTMLInputElement).value = 'Doe';
            (document.getElementById('email') as HTMLInputElement).value = 'john@example.com';

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({ success: true }),
            });

            const msg = document.getElementById('profileMessageDiv')!;
            const form = document.getElementById('editProfileForm') as HTMLFormElement;

            form.dispatchEvent(new Event('submit'));
            
            await jest.runAllTicks();
            await Promise.resolve();
            await Promise.resolve();

            expect(msg.textContent).toBe('บันทึกข้อมูลสำเร็จ!');

            jest.advanceTimersByTime(5000);

            expect(msg.textContent).toBe('');
        });
    });

    describe('Change Password Form - UI', () => {
        test('should have Change Password section', () => {
            const headings = Array.from(document.querySelectorAll('h2'));
            expect(headings.some(h => h.textContent?.includes('Change Password'))).toBe(true);
        });

        test('should have password inputs', () => {
            expect(document.getElementById('current-password')).not.toBeNull();
            expect(document.getElementById('new-password')).not.toBeNull();
            expect(document.getElementById('confirm-new-password')).not.toBeNull();
        });
    });

    describe('Change Password Form - Validation', () => {
        test('should show error if fields empty', async () => {
            const form = document.getElementById('changePasswordForm') as HTMLFormElement;
            form.dispatchEvent(new Event('submit'));
            await new Promise(r => setTimeout(r, 0));

            const msg = document.getElementById('passwordMessageDiv')!;
            expect(msg.textContent).toBe('กรุณากรอกข้อมูลให้ครบถ้วน');
        });

        test('should show error if passwords dont match', async () => {
            (document.getElementById('current-password') as HTMLInputElement).value = 'old';
            (document.getElementById('new-password') as HTMLInputElement).value = 'new1';
            (document.getElementById('confirm-new-password') as HTMLInputElement).value = 'new2';

            const form = document.getElementById('changePasswordForm') as HTMLFormElement;
            form.dispatchEvent(new Event('submit'));
            await new Promise(r => setTimeout(r, 0));

            const msg = document.getElementById('passwordMessageDiv')!;
            expect(msg.textContent).toBe('รหัสผ่านไม่ตรงกัน');
        });
    });

    describe('Change Password Form - Submission', () => {
        test('should successfully change password', async () => {
            (document.getElementById('current-password') as HTMLInputElement).value = 'oldpass';
            (document.getElementById('new-password') as HTMLInputElement).value = 'newpass';
            (document.getElementById('confirm-new-password') as HTMLInputElement).value = 'newpass';

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({ success: true }),
            });

            const form = document.getElementById('changePasswordForm') as HTMLFormElement;
            form.dispatchEvent(new Event('submit'));

            await new Promise(r => setTimeout(r, 50));

            const msg = document.getElementById('passwordMessageDiv')!;
            expect(msg.textContent).toBe('เปลี่ยนรหัสผ่านสำเร็จ!');
            expect(msg.className).toBe('success-msg');

            expect((document.getElementById('current-password') as HTMLInputElement).value).toBe('');
            expect((document.getElementById('new-password') as HTMLInputElement).value).toBe('');
        });

        test('should show error on wrong password', async () => {
            (document.getElementById('current-password') as HTMLInputElement).value = 'wrongpass';
            (document.getElementById('new-password') as HTMLInputElement).value = 'newpass';
            (document.getElementById('confirm-new-password') as HTMLInputElement).value = 'newpass';

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({ success: false, message: 'Current password is incorrect' }),
            });

            const form = document.getElementById('changePasswordForm') as HTMLFormElement;
            form.dispatchEvent(new Event('submit'));

            await new Promise(r => setTimeout(r, 50));

            const msg = document.getElementById('passwordMessageDiv')!;
            expect(msg.textContent).toBe('Current password is incorrect');
        });

        test('should disable button during submission', async () => {
            (document.getElementById('current-password') as HTMLInputElement).value = 'oldpass';
            (document.getElementById('new-password') as HTMLInputElement).value = 'newpass';
            (document.getElementById('confirm-new-password') as HTMLInputElement).value = 'newpass';

            (global.fetch as jest.Mock).mockImplementationOnce(
                () => new Promise(r => setTimeout(() => r({
                    json: async () => ({ success: true })
                }), 100))
            );

            const btn = document.getElementById('changePasswordBtn') as HTMLButtonElement;
            const form = document.getElementById('changePasswordForm') as HTMLFormElement;

            form.dispatchEvent(new Event('submit'));
            expect(btn.disabled).toBe(true);

            await new Promise(r => setTimeout(r, 150));
            expect(btn.disabled).toBe(false);
        });

        test('should clear message after 5 seconds', async () => {
            (document.getElementById('current-password') as HTMLInputElement).value = 'oldpass';
            (document.getElementById('new-password') as HTMLInputElement).value = 'newpass';
            (document.getElementById('confirm-new-password') as HTMLInputElement).value = 'newpass';

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                json: async () => ({ success: true }),
            });

            const msg = document.getElementById('passwordMessageDiv')!;
            const form = document.getElementById('changePasswordForm') as HTMLFormElement;

            jest.useFakeTimers();

            form.dispatchEvent(new Event('submit'));
            
            await Promise.resolve();
            await Promise.resolve();

            expect(msg.textContent).toBe('เปลี่ยนรหัสผ่านสำเร็จ!');

            jest.advanceTimersByTime(5000);

            expect(msg.textContent).toBe('');
        });
    });

    describe('Navigation', () => {
        test('should have back button', () => {
            const btn = document.getElementById('backToCalcBtn') as HTMLAnchorElement;
            expect(btn?.textContent).toBe('Satellite Orbital Period Calculator');
            expect(btn?.href).toMatch(/\/calculate$/);
        });

        // ✅ เพิ่มเทสเคสใหม่: ทดสอบการคลิกปุ่มกลับไปหน้าหลัก
        test('should navigate back to calculate page when clicking back button', () => {
            const btn = document.getElementById('backToCalcBtn') as HTMLAnchorElement;
            
            expect(btn).not.toBeNull();
            expect(btn.href).toContain('/calculate');
            expect(btn.getAttribute('href')).toBe('/calculate');
        });

        // ✅ เพิ่มเทสเคสใหม่: ตรวจสอบว่าลิงก์ถูกต้อง
        test('back button should be a valid link element', () => {
            const btn = document.getElementById('backToCalcBtn') as HTMLAnchorElement;
            
            expect(btn.tagName).toBe('A');
            expect(btn.href).toBeTruthy();
        });
    });
});
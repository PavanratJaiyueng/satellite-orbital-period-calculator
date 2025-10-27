declare global {
    interface Window {
        generateToken: () => Promise<void>;
        deleteToken: (tokenId: string) => Promise<void>;
        loadTokens: () => Promise<void>;
        showTokenModal: (token: string) => void;
        closeTokenModal: () => void;
        copyToken: (token: string) => void;
        openGenerateModal: () => void;
        closeGenerateModal: () => void;
    }
}

describe('Personal Access Token Logic', () => {
    
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="tokenSection">
                <table id="tokenTable">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Last Used</th>
                            <th>Expires</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="tokenTableBody"></tbody>
                </table>
                
                <div id="tokenStats">
                    <span>Total Tokens: </span>
                    <span id="totalTokens">0</span>
                </div>
                
                <button id="generateBtn">Generate New Token</button>
                <span id="generateLoading" style="display: none;">Loading...</span>
            </div>

            <!-- Generate Token Modal -->
            <div id="generateModal" style="display: none;">
                <div class="modal-content">
                    <h3>Generate New Token</h3>
                    <input type="text" id="newTokenName" placeholder="Token Name" value="" />
                    <button id="generateTokenBtn">Generate Token</button>
                    <button id="cancelGenerateBtn">Cancel</button>
                </div>
            </div>

            <!-- Show Token Modal -->
            <div id="showTokenModal" style="display: none;">
                <div class="modal-content">
                    <h3>Your Token</h3>
                    <div id="tokenDisplay"></div>
                    <button id="copyTokenBtn">COPY</button>
                    <button id="closeTokenBtn">Close</button>
                </div>
            </div>
        `;
        
        (global.fetch as jest.Mock).mockClear();
        (global.alert as jest.Mock).mockClear();
        
        // Load Tokens Function
        (window as any).loadTokens = async () => {
            try {
                const res = await fetch('/api/tokens');
                const result = await res.json();
                if (result.success && result.tokens) {
                    const tbody = document.getElementById('tokenTableBody')!;
                    tbody.innerHTML = '';
                    
                    result.tokens.forEach((token: any) => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${token.name}</td>
                            <td>${token.status}</td>
                            <td>${token.created}</td>
                            <td>${token.lastUsed || '-'}</td>
                            <td>${token.expires}</td>
                            <td>
                                <button class="showBtn" data-token="${token.token}">Show</button>
                                <button class="deleteBtn" data-id="${token.id}">Delete</button>
                            </td>
                        `;
                        tbody.appendChild(row);
                    });
                    
                    document.getElementById('totalTokens')!.textContent = result.tokens.length.toString();
                }
            } catch (error) {}
        };

        // Open Generate Modal
        (window as any).openGenerateModal = () => {
            const modal = document.getElementById('generateModal')!;
            modal.style.display = 'block';
        };

        // Close Generate Modal
        (window as any).closeGenerateModal = () => {
            const modal = document.getElementById('generateModal')!;
            modal.style.display = 'none';
            (document.getElementById('newTokenName') as HTMLInputElement).value = '';
        };

        // Generate Token Function
        (window as any).generateToken = async () => {
            const name = (document.getElementById('newTokenName') as HTMLInputElement).value;
            
            if (!name) {
                global.alert('Please enter token name');
                return;
            }
            
            const btn = document.getElementById('generateTokenBtn')!;
            const loading = document.getElementById('generateLoading')!;

            btn.style.display = 'none';
            loading.style.display = 'block';

            try {
                const res = await fetch('/api/tokens', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name }),
                });

                const result = await res.json();
                
                if (result.success) {
                    (window as any).closeGenerateModal();
                    await (window as any).loadTokens();
                    (window as any).showTokenModal(result.token);
                    global.alert('Token generated successfully!');
                } else {
                    global.alert(`Failed to generate token: ${result.message || 'Unknown error'}`);
                }
            } catch (error) {
                global.alert(`Error generating token: ${(error as Error).message}`);
            } finally {
                btn.style.display = 'block';
                loading.style.display = 'none';
            }
        };

        // Show Token Modal
        (window as any).showTokenModal = (token: string) => {
            const modal = document.getElementById('showTokenModal')!;
            const display = document.getElementById('tokenDisplay')!;
            display.textContent = token;
            modal.style.display = 'block';
        };

        // Close Token Modal
        (window as any).closeTokenModal = () => {
            const modal = document.getElementById('showTokenModal')!;
            modal.style.display = 'none';
        };

        // Copy Token
        (window as any).copyToken = (token: string) => {
            navigator.clipboard.writeText(token);
            global.alert('Token copied to clipboard!');
        };

        // Delete Token Function
        (window as any).deleteToken = async (tokenId: string) => {
            if (!window.confirm(`Confirm delete token ${tokenId}?`)) {
                return;
            }

            try {
                const res = await fetch(`/api/tokens/${tokenId}`, {
                    method: 'DELETE',
                });
                
                const result = await res.json();
                if (result.success) {
                    global.alert('Token deleted successfully.');
                    await (window as any).loadTokens();
                } else {
                    global.alert(`Failed to delete token: ${result.message || 'Unknown error'}`);
                }
            } catch (error) {
                global.alert(`Error deleting token: ${(error as Error).message}`);
            }
        };

        // Event Listeners
        document.getElementById('generateBtn')?.addEventListener('click', () => {
            (window as any).openGenerateModal();
        });

        document.getElementById('cancelGenerateBtn')?.addEventListener('click', () => {
            (window as any).closeGenerateModal();
        });

        document.getElementById('generateTokenBtn')?.addEventListener('click', () => {
            (window as any).generateToken();
        });

        document.getElementById('closeTokenBtn')?.addEventListener('click', () => {
            (window as any).closeTokenModal();
        });

        document.getElementById('copyTokenBtn')?.addEventListener('click', () => {
            const token = document.getElementById('tokenDisplay')!.textContent || '';
            (window as any).copyToken(token);
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('UI Elements - Token Table', () => {
        test('should have token table with correct headers', () => {
            const table = document.getElementById('tokenTable');
            expect(table).not.toBeNull();
            
            const headers = Array.from(table!.querySelectorAll('th')).map(th => th.textContent);
            expect(headers).toContain('Name');
            expect(headers).toContain('Status');
            expect(headers).toContain('Created');
            expect(headers).toContain('Last Used');
            expect(headers).toContain('Expires');
            expect(headers).toContain('Action');
        });

        test('should display token table body', () => {
            const tbody = document.getElementById('tokenTableBody');
            expect(tbody).not.toBeNull();
        });

        test('should display total tokens counter', () => {
            const totalTokens = document.getElementById('totalTokens');
            expect(totalTokens).not.toBeNull();
            expect(totalTokens?.textContent).toBe('0');
        });
    });

    describe('Load Tokens', () => {
        test('should load tokens on initial load', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, tokens: [] }),
            });

            await (window as any).loadTokens();
            
            expect(global.fetch).toHaveBeenCalledWith('/api/tokens');
            expect(document.getElementById('totalTokens')!.textContent).toBe('0');
        });

        test('should display total token count after loading', async () => {
            const mockTokens = [
                { id: 'a', name: 't1', status: 'Active', created: '2025-01-01', expires: '2026-01-01', token: 'token1' },
                { id: 'b', name: 't2', status: 'Active', created: '2025-01-02', expires: '2026-01-02', token: 'token2' },
                { id: 'c', name: 't3', status: 'Active', created: '2025-01-03', expires: '2026-01-03', token: 'token3' }
            ];
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, tokens: mockTokens }),
            });

            await (window as any).loadTokens();

            expect(global.fetch).toHaveBeenCalledWith('/api/tokens');
            expect(document.getElementById('totalTokens')!.textContent).toBe(mockTokens.length.toString());
        });

        test('should populate table with token data', async () => {
            const mockTokens = [
                { 
                    id: 'token1', 
                    name: 'My Token', 
                    status: 'Active', 
                    created: '2025-01-01', 
                    lastUsed: '2025-01-15',
                    expires: '2026-01-01',
                    token: 'abc123'
                }
            ];
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, tokens: mockTokens }),
            });

            await (window as any).loadTokens();

            const tbody = document.getElementById('tokenTableBody')!;
            expect(tbody.children.length).toBe(1);
            expect(tbody.innerHTML).toContain('My Token');
            expect(tbody.innerHTML).toContain('Active');
            expect(tbody.innerHTML).toContain('2025-01-01');
            expect(tbody.innerHTML).toContain('2026-01-01');
        });
    });

    describe('Generate Token Modal', () => {
        test('should have Generate New Token button', () => {
            const btn = document.getElementById('generateBtn');
            expect(btn).not.toBeNull();
            expect(btn?.textContent).toBe('Generate New Token');
        });

        test('should open generate modal when clicking Generate button', () => {
            const btn = document.getElementById('generateBtn')!;
            const modal = document.getElementById('generateModal')!;
            
            expect(modal.style.display).toBe('none');
            btn.click();
            expect(modal.style.display).toBe('block');
        });

        test('should have token name input in modal', () => {
            const input = document.getElementById('newTokenName') as HTMLInputElement;
            expect(input).not.toBeNull();
            expect(input.type).toBe('text');
            expect(input.placeholder).toBe('Token Name');
        });

        test('should be able to type token name', () => {
            const input = document.getElementById('newTokenName') as HTMLInputElement;
            input.value = 'My API Token';
            expect(input.value).toBe('My API Token');
        });

        test('should have Cancel button in modal', () => {
            const btn = document.getElementById('cancelGenerateBtn');
            expect(btn).not.toBeNull();
            expect(btn?.textContent).toBe('Cancel');
        });

        test('should close modal when clicking Cancel', () => {
            const openBtn = document.getElementById('generateBtn')!;
            const cancelBtn = document.getElementById('cancelGenerateBtn')!;
            const modal = document.getElementById('generateModal')!;
            
            openBtn.click();
            expect(modal.style.display).toBe('block');
            
            cancelBtn.click();
            expect(modal.style.display).toBe('none');
        });

        test('should clear input when closing modal', () => {
            const input = document.getElementById('newTokenName') as HTMLInputElement;
            const openBtn = document.getElementById('generateBtn')!;
            const cancelBtn = document.getElementById('cancelGenerateBtn')!;
            
            openBtn.click();
            input.value = 'Test Token';
            cancelBtn.click();
            
            expect(input.value).toBe('');
        });

        test('should have Generate Token button in modal', () => {
            const btn = document.getElementById('generateTokenBtn');
            expect(btn).not.toBeNull();
            expect(btn?.textContent).toBe('Generate Token');
        });
    });

    describe('Generate Token Functionality', () => {
        test('should show alert if token name is empty', async () => {
            const input = document.getElementById('newTokenName') as HTMLInputElement;
            input.value = '';
            
            await (window as any).generateToken();
            
            expect(global.alert).toHaveBeenCalledWith('Please enter token name');
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('should generate token and reload token list', async () => {
            const input = document.getElementById('newTokenName') as HTMLInputElement;
            input.value = 'My Token';
            
            const btn = document.getElementById('generateTokenBtn')!;
            const loading = document.getElementById('generateLoading')!;
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, token: 'new-token-123' }),
            });
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, tokens: [{ id: 'a', name: 'My Token', status: 'Active', created: '2025-01-01', expires: '2026-01-01', token: 'new-token-123' }] }),
            });

            const promise = (window as any).generateToken();
            
            expect(btn.style.display).toBe('none');
            expect(loading.style.display).toBe('block');
            
            await promise;
            
            expect(global.fetch).toHaveBeenCalledTimes(2);
            expect(btn.style.display).toBe('block');
            expect(loading.style.display).toBe('none');
            expect(document.getElementById('totalTokens')!.textContent).toBe('1');
        });

        test('should close generate modal after successful generation', async () => {
            const input = document.getElementById('newTokenName') as HTMLInputElement;
            input.value = 'My Token';
            
            const modal = document.getElementById('generateModal')!;
            modal.style.display = 'block';
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, token: 'new-token-123' }),
            });
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, tokens: [] }),
            });

            await (window as any).generateToken();
            
            expect(modal.style.display).toBe('none');
        });

        test('should show alert on successful generation', async () => {
            const input = document.getElementById('newTokenName') as HTMLInputElement;
            input.value = 'My Token';
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, token: 'new-token-123' }),
            });
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, tokens: [] }),
            });

            await (window as any).generateToken();
            
            expect(global.alert).toHaveBeenCalledWith('Token generated successfully!');
        });
    });

    describe('Show Token Modal', () => {
        test('should have show token modal', () => {
            const modal = document.getElementById('showTokenModal');
            expect(modal).not.toBeNull();
        });

        test('should display token when Show button clicked', async () => {
            const mockTokens = [
                { id: 'token1', name: 'My Token', status: 'Active', created: '2025-01-01', expires: '2026-01-01', token: 'abc123xyz' }
            ];
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, tokens: mockTokens }),
            });

            await (window as any).loadTokens();
            
            const showBtn = document.querySelector('.showBtn') as HTMLButtonElement;
            expect(showBtn).not.toBeNull();
            
            showBtn.click();
            (window as any).showTokenModal(showBtn.dataset.token!);
            
            const modal = document.getElementById('showTokenModal')!;
            const display = document.getElementById('tokenDisplay')!;
            
            expect(modal.style.display).toBe('block');
            expect(display.textContent).toBe('abc123xyz');
        });

        test('should have COPY button in show token modal', () => {
            const btn = document.getElementById('copyTokenBtn');
            expect(btn).not.toBeNull();
            expect(btn?.textContent).toBe('COPY');
        });

        test('should copy token to clipboard when clicking COPY', () => {
            const mockToken = 'test-token-123';
            document.getElementById('tokenDisplay')!.textContent = mockToken;
            
            Object.assign(navigator, {
                clipboard: {
                    writeText: jest.fn(),
                },
            });
            
            const copyBtn = document.getElementById('copyTokenBtn')!;
            copyBtn.click();
            
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockToken);
            expect(global.alert).toHaveBeenCalledWith('Token copied to clipboard!');
        });

        test('should have Close button in show token modal', () => {
            const btn = document.getElementById('closeTokenBtn');
            expect(btn).not.toBeNull();
            expect(btn?.textContent).toBe('Close');
        });

        test('should close modal when clicking Close button', () => {
            const modal = document.getElementById('showTokenModal')!;
            modal.style.display = 'block';
            
            const closeBtn = document.getElementById('closeTokenBtn')!;
            closeBtn.click();
            
            expect(modal.style.display).toBe('none');
        });
    });

    describe('Delete Token', () => {
        test('should delete token and reload tokens after confirmation', async () => {
            const deleteId = 'token-to-delete';
            jest.spyOn(window, 'confirm').mockReturnValue(true);
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            });
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, tokens: [] }),
            });

            await (window as any).deleteToken(deleteId);

            expect(window.confirm).toHaveBeenCalledWith(`Confirm delete token ${deleteId}?`);
            
            expect(global.fetch).toHaveBeenCalledWith(`/api/tokens/${deleteId}`, expect.objectContaining({
                method: 'DELETE',
            }));
            
            expect(global.alert).toHaveBeenCalledWith('Token deleted successfully.');

            const fetchMock = global.fetch as jest.Mock;
            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(fetchMock.mock.calls[1][0]).toBe('/api/tokens');
        });

        test('should do nothing if user cancels deletion', async () => {
            const deleteId = 'token-to-cancel';
            jest.spyOn(window, 'confirm').mockReturnValue(false);

            await (window as any).deleteToken(deleteId);

            expect(window.confirm).toHaveBeenCalledWith(`Confirm delete token ${deleteId}?`);
            expect(global.fetch).not.toHaveBeenCalled();
            expect(global.alert).not.toHaveBeenCalled();
        });

        test('should have Delete button in token table', async () => {
            const mockTokens = [
                { id: 'token1', name: 'My Token', status: 'Active', created: '2025-01-01', expires: '2026-01-01', token: 'abc123' }
            ];
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, tokens: mockTokens }),
            });

            await (window as any).loadTokens();
            
            const deleteBtn = document.querySelector('.deleteBtn');
            expect(deleteBtn).not.toBeNull();
            expect(deleteBtn?.textContent).toBe('Delete');
        });
    });

    describe('Integration Tests', () => {
        test('complete flow: open modal, enter name, generate, show token, copy, close', async () => {
            Object.assign(navigator, {
                clipboard: {
                    writeText: jest.fn(),
                },
            });

            // Open modal
            const openBtn = document.getElementById('generateBtn')!;
            openBtn.click();
            expect(document.getElementById('generateModal')!.style.display).toBe('block');

            // Enter name
            const input = document.getElementById('newTokenName') as HTMLInputElement;
            input.value = 'Test Token';

            // Generate token
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, token: 'generated-token-xyz' }),
            });
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, tokens: [] }),
            });

            await (window as any).generateToken();

            // Show token modal
            (window as any).showTokenModal('generated-token-xyz');
            expect(document.getElementById('showTokenModal')!.style.display).toBe('block');
            expect(document.getElementById('tokenDisplay')!.textContent).toBe('generated-token-xyz');

            // Copy token
            const copyBtn = document.getElementById('copyTokenBtn')!;
            copyBtn.click();
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('generated-token-xyz');

            // Close modal
            const closeBtn = document.getElementById('closeTokenBtn')!;
            closeBtn.click();
            expect(document.getElementById('showTokenModal')!.style.display).toBe('none');
        });

        test('complete flow: load tokens, show token, delete token', async () => {
            jest.spyOn(window, 'confirm').mockReturnValue(true);

            // Load tokens
            const mockTokens = [
                { id: 'token1', name: 'My Token', status: 'Active', created: '2025-01-01', expires: '2026-01-01', token: 'abc123' }
            ];
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, tokens: mockTokens }),
            });

            await (window as any).loadTokens();
            expect(document.getElementById('totalTokens')!.textContent).toBe('1');

            // Show token
            const showBtn = document.querySelector('.showBtn') as HTMLButtonElement;
            const token = showBtn.dataset.token!;
            (window as any).showTokenModal(token);
            expect(document.getElementById('showTokenModal')!.style.display).toBe('block');

            // Close show modal
            (window as any).closeTokenModal();

            // Delete token
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            });
            
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, tokens: [] }),
            });

            await (window as any).deleteToken('token1');
            expect(document.getElementById('totalTokens')!.textContent).toBe('0');
        });
    });
});
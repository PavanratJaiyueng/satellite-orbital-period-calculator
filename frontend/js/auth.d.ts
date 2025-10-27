export function checkSession(redirectIfLoggedIn?: boolean): Promise<void>;
export function preventBackToAuth(): void;
export function requireAuth(): Promise<void>;
export function handleLogin(email: string, password: string): Promise<{
  success: boolean;
  message: string;
  user?: any;
}>;
export function handleRegister(
  name: string,
  lastname: string,
  email: string,
  password: string
): Promise<{
  success: boolean;
  message: string;
  user?: any;
}>;
export function handleLogout(): Promise<void>;
export function getAuthToken(): string | null;
export function setAuthToken(token: string): void;
export function removeAuthToken(): void;
export function getAuthStatus(): Promise<{
  isAuthenticated: boolean;
  method?: string;
  user?: any;
}>;
export function searchSatellites(searchTerm: string): Promise<any>;
export function calculateSatellites(payload: any): Promise<any>;
export function getRandomSatellites(payload: any): Promise<any>;
export function preventBackNavigation(): void;
let _token = null;

export function setAuthToken(token) { _token = token; }
export function getAuthToken() { return _token; }
export function getAuthHeaders() {
    if (!_token) throw new Error('Token de autenticación no disponible');
    return { Authorization: `Bearer ${_token}` };
}

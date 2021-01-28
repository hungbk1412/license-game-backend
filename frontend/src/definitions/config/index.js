let BACKEND_BASE_URL_API = '';
let KEYCLOAK_BASE_URL_API = '';
if (process.env.NODE_ENV === 'prod') {
    BACKEND_BASE_URL_API = 'http://backend:5000/api/v1';
    KEYCLOAK_BASE_URL_API = 'http://keycloak:8080/';
} else {
    BACKEND_BASE_URL_API = 'http://localhost:5000/api/v1';
    KEYCLOAK_BASE_URL_API = 'http://localhost:8080/';
}


export {BACKEND_BASE_URL_API, KEYCLOAK_BASE_URL_API};
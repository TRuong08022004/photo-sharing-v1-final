const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8081/api";
const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, "");

const apiUrl = (path) =>
  `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

const serverUrl = (path) =>
  `${SERVER_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;

export { API_BASE_URL, SERVER_BASE_URL, apiUrl, serverUrl };

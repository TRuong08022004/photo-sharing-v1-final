import { apiUrl } from "../config.api";

/**
 * fetchModel - Fetch a model from the web server.
 *
 * @param {string} url      The URL to issue the GET request.
 *
 */
async function fetchModel(url) {
  const token = localStorage.getItem("token");

  const models = await fetch(apiUrl(url), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (models.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login-register";
    return null;
  }

  const data = await models.json();
  return data;
}

export default fetchModel;

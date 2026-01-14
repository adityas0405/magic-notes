export const apiBaseUrl = import.meta.env.VITE_API_URL;

if (!apiBaseUrl) {
  throw new Error("VITE_API_URL is required for the Anything web app.");
}

export const apiFetch = async (path, options = {}) => {
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }
  return response;
};

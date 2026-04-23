const API_BASE_URL =
  import.meta.env.VITE_API_SERVER_URL || "http://127.0.0.1:3001";

const apiServerClient = {
  baseUrl: API_BASE_URL,
  fetch: async (path, options = {}) => {
    try {
      const token = localStorage.getItem("authToken");
      const isFormData = options.body instanceof FormData;
      const headers = {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token && !(options.headers || {}).Authorization
          ? { Authorization: `Bearer ${token}` }
          : {}),
        ...(options.headers || {}),
      };

      const response = await window.fetch(`${API_BASE_URL}${path}`, {
        method: options.method || "GET",
        headers,
        body: options.body,
        credentials: "include",
      });

      const contentType = response.headers.get("content-type");

      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const error = new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
        error.status = response.status;
        error.statusText = response.statusText;
        error.body = data;
        throw error;
      }

      if (data && (typeof data === "object" || typeof data === "function")) {
        Object.defineProperties(data, {
          ok: { value: true, enumerable: false },
          json: { value: async () => data, enumerable: false },
          status: { value: response.status, enumerable: false },
        });
      }

      return data;
    } catch (err) {
      console.error("API Error:", err);
      throw err;
    }
  },
};

export default apiServerClient;

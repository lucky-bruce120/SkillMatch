const API_BASE_URL =
  import.meta.env.VITE_API_SERVER_URL || "http://127.0.0.1:3001";

const apiServerClient = {
  fetch: async (path, options = {}) => {
    try {
      const response = await window.fetch(`${API_BASE_URL}${path}`, {
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        body: options.body,
        credentials: "include", // ✅ important if using cookies/sessions
      });

      // Handle non-JSON responses safely
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

      return data;
    } catch (err) {
      console.error("API Error:", err);
      throw err;
    }
  },
};

export default apiServerClient;
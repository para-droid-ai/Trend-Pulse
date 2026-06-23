import axios from "axios";

// Create axios instance
const api = axios.create({
  baseURL: "http://localhost:8000",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 2700000, // Increased to 45 minutes (2,700,000 ms)
});

// Add request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Add response interceptor for handling common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle session timeout/token expiration
    if (error.response && error.response.status === 401) {
      // Clear auth tokens and redirect to login if unauthorized
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      localStorage.removeItem("user_id");

      // Only redirect if we're not already on the login page
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    // Add more logging for other error types

    return Promise.reject(error);
  },
);

// Retry logic for API calls
const retryRequest = async (apiCall, maxRetries = 3) => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await apiCall();
    } catch (error) {
      // Only retry on network errors or 5xx server errors
      if (
        error.response &&
        error.response.status < 500 &&
        error.code !== "ECONNABORTED"
      ) {
        throw error; // Don't retry client errors (4xx)
      }

      retries++;
      if (retries >= maxRetries) {
        throw error; // Max retries reached
      }

      // Exponential backoff
      const delay = Math.pow(2, retries) * 300;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// Authentication API calls
export const authAPI = {
  login: async (email, password) => {
    const formData = new FormData();
    formData.append("username", email);
    formData.append("password", password);

    try {
      // Send request with FormData. Axios should set Content-Type automatically.
      // We pass specific config to override the default 'application/json' for this call.
      const response = await api.post("/token", formData, {
        headers: {
          // Let Axios handle the Content-Type for FormData
          "Content-Type": undefined,
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  register: async (email, password) => {
    try {
      const response = await api.post("/users/", { email, password });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Topic Stream API calls
export const topicStreamAPI = {
  getAll: async () => {
    return retryRequest(async () => {
      const response = await api.get("/topic-streams/");
      return response.data;
    });
  },

  create: async (topicStream) => {
    try {
      const response = await api.post("/topic-streams/", topicStream);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  update: async (id, topicStream) => {
    try {
      const response = await api.put(`/topic-streams/${id}`, topicStream);
      return response.data;
    } catch (error) {
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Failed to update topic stream";

      throw new Error(errorMessage);
    }
  },

  delete: async (id) => {
    try {
      const response = await api.delete(`/topic-streams/${id}`);

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getById: async (id) => {
    return retryRequest(async () => {
      const response = await api.get(`/topic-streams/${id}`);
      return response.data;
    });
  },

  getSummaries: async (id) => {
    return retryRequest(async () => {
      const response = await api.get(`/topic-streams/${id}/summaries/`);
      return response.data;
    });
  },

  updateNow: async (
    id,
    options = { ignore_all_previous_summaries_override: false },
  ) => {
    try {
      // Ensure 'options' is sent as the request body for the POST request
      const response = await api.post(
        `/topic-streams/${id}/update-now`,
        options,
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  appendSummary: async (id, content) => {
    try {
      const response = await api.post(`/topic-streams/${id}/summaries/`, {
        content,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteSummary: async (streamId, summaryId) => {
    try {
      // Use explicit URL construction to ensure correct format
      const url = `/topic-streams/${streamId}/summaries/${summaryId}`;

      const response = await api.delete(url);

      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Deep Dive API calls
export const deepDiveAPI = {
  askQuestion: async (topicStreamId, summaryId, question, model) => {
    try {
      const response = await api.post("/deep-dive/", {
        topic_stream_id: topicStreamId,
        summary_id: summaryId,
        question: question,
        model: model,
      });

      return {
        answer: response.data.answer,
        sources: response.data.sources,
        model: response.data.model, // Return the model information
      };
    } catch (error) {
      // Get a more detailed error message if available
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "An error occurred while processing your question";
      throw new Error(`Deep dive failed: ${errorMessage}`);
    }
  },
};

// Optimize Prompt API calls
export const optimizePromptAPI = {
  optimize: async (topicQuery) => {
    try {
      const response = await api.post("/optimize-prompt/", {
        topic_query: topicQuery,
      });

      return {
        optimized_query: response.data.optimized_query,
        model: response.data.model,
      };
    } catch (error) {
      // Get a more detailed error message if available
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "An error occurred while optimizing the prompt";
      throw new Error(`Prompt optimization failed: ${errorMessage}`);
    }
  },
};

export default api;

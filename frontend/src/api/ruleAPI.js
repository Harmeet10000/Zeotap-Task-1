import axios from "axios";

const API_URL = "http://localhost:8000/api";

export const RuleService = {
  // Create a new rule by sending it to the backend
  async createRule(ruleName, ruleString) {
    try {
      console.log("Creating rule", ruleName, ruleString);
      const response = await axios.post(`${API_URL}/rules`, {
        ruleName,
        ruleString,
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to create rule");
    }
  },

  // Get all rules
  async getRules() {
    try {
      const response = await axios.get(`${API_URL}/rules`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch rules");
    }
  },

  // Combine multiple rules by sending them to the backend
  async combineRules(ruleIds) {
    try {
      const response = await axios.post(`${API_URL}/rules/combine`, {
        ruleIds,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to combine rules"
      );
    }
  },

  // Evaluate a rule by sending data to the backend
  async evaluateRule(ruleId, data) {
    try {
      console.log("Evaluating rule", ruleId, data);
      const response = await axios.post(`${API_URL}/rules/${ruleId}/evaluate`, {
        data,
      });
      return response.data.eligible;
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to evaluate rule"
      );
    }
  },

  // Get a specific rule
  async getRule(id) {
    try {
      const response = await axios.get(`${API_URL}/rules/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to fetch rule");
    }
  },

  // Delete a specific rule
  async deleteRule(ruleId) {
    try {
      const response = await axios.delete(`${API_URL}/rules/${ruleId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to delete rule");
    }
  },

  // Update a specific rule
  async updateRule(ruleId, updatedData) {
    try {
      const response = await axios.put(
        `${API_URL}/rules/${ruleId}`,
        updatedData
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to update rule");
    }
  },
};

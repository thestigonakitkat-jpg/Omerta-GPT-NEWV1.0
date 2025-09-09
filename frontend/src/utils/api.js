// OMERTÁ API Integration - Backend Communication
const API_BASE_URL = 'http://localhost:8001/api';

class OmertaAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Graphite Defense System APIs
  async getGraphiteStatus() {
    return this.makeRequest('/graphite/status');
  }

  async reportThreat(threatData) {
    return this.makeRequest('/graphite/report-threat', {
      method: 'POST',
      body: JSON.stringify(threatData),
    });
  }

  async activateCountermeasures() {
    return this.makeRequest('/graphite/activate-countermeasures', {
      method: 'POST',
    });
  }

  // Admin System APIs
  async getAdminStatus() {
    return this.makeRequest('/admin/status');
  }

  async authenticateAdmin(credentials) {
    return this.makeRequest('/admin/authenticate', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  // DEFCON-1 Protocol APIs
  async initiateDefcon1(adminData) {
    return this.makeRequest('/admin/defcon1/initiate', {
      method: 'POST',
      body: JSON.stringify(adminData),
    });
  }

  async signOperation(operationData) {
    return this.makeRequest('/admin/defcon1/sign', {
      method: 'POST',
      body: JSON.stringify(operationData),
    });
  }

  // Health Check
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export const omertaAPI = new OmertaAPI();
export default omertaAPI;
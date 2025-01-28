import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

export interface RESTConnectorOptions {
  baseUrl: string;
  headers?: Record<string, string>; // Custom headers for the requests
  timeout?: number;
}

export class RESTConnector {
  private axiosInstance: AxiosInstance;

  constructor(options: RESTConnectorOptions) {
    this.axiosInstance = axios.create({
      baseURL: options.baseUrl,
      headers: options.headers || {},
      timeout: options.timeout || 5000, // 5 seconds
    });
  }

  // Generic GET request method
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.get<T>(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  // Generic POST request method
  public async post<T>(url: string, data: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  // Generic PUT request method
  public async put<T>(url: string, data: any, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  // Generic DELETE request method
  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.delete<T>(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error; // Re-throw the error after logging or processing it
    }
  }

  // Helper method to handle errors specifically for Axios errors
  private handleError(error: unknown): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      // Now, we can access axios specific properties like status, response, etc.
      console.error(`Axios Error: ${axiosError.message}`);
      if (axiosError.response) {
        console.error(`Response data: ${JSON.stringify(axiosError.response.data)}`);
        console.error(`Status: ${axiosError.response.status}`);
        console.error(`Headers: ${JSON.stringify(axiosError.response.headers)}`);
      } else if (axiosError.request) {
        console.error(`No response received: ${axiosError.request}`);
      } else {
        console.error(`Error occurred while setting up request: ${axiosError.message}`);
      }
    } else {
      console.error(`Non-Axios Error: ${(error as Error).message}`);
    }
  }

  // Helper method to set/update headers dynamically
  public setHeaders(headers: Record<string, string>): void {
    this.axiosInstance.defaults.headers = {
      ...this.axiosInstance.defaults.headers,
      ...headers,
    };
  }
}

import axios from 'axios';

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;
    
    // Check if it's a NestJS-style validation error with message as array or string
    if (responseData && typeof responseData === 'object') {
      const message = (responseData as any).message;
      if (Array.isArray(message)) {
        return message.join('\n');
      }
      if (typeof message === 'string') {
        return message;
      }
    }

    // Fallback error messages based on status codes
    const status = error.response?.status;
    if (status === 400) {
      return 'Bad Request. Please check your inputs.';
    }
    if (status === 401) {
      return 'Unauthorized. Please login again.';
    }
    if (status === 403) {
      return 'Forbidden. You do not have permission to perform this action.';
    }
    if (status === 404) {
      return 'Not Found. The requested resource does not exist.';
    }
    if (status !== undefined && status >= 500) {
      return 'Server Error. Please try again later.';
    }

    // Network / request error without a response
    if (error.message === 'Network Error' || !error.response) {
      return 'Network Error. Please check your internet connection.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

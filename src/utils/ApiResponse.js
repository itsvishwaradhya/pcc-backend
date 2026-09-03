/**
 * Standardised API response wrapper.
 *
 * Every successful or failed response sent by the application goes through
 * this class so that clients always receive a predictable JSON shape:
 *
 *   { success: boolean, statusCode: number, message: string, data: any }
 */
class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code.
   * @param {string} message    - Human-readable message.
   * @param {any}    data       - Payload (null for errors).
   */
  constructor(statusCode, message, data = null) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = statusCode >= 200 && statusCode < 300;
  }

  /**
   * Send a success response.
   *
   * @param {object} res        - Express response object.
   * @param {any}    data       - Payload to return.
   * @param {string} message    - Success message.
   * @param {number} statusCode - HTTP status (default 200).
   */
  static success(res, data, message = "Success", statusCode = 200) {
    return res.status(statusCode).json(new ApiResponse(statusCode, message, data));
  }

  /**
   * Send an error response.
   *
   * @param {object} res        - Express response object.
   * @param {string} message    - Error message.
   * @param {number} statusCode - HTTP status (default 500).
   * @param {any}    errors     - Optional detailed error list.
   */
  static error(res, message = "Internal server error", statusCode = 500, errors = []) {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      errors,
      data: null,
    });
  }
}

export default ApiResponse;

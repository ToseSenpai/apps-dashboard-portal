/**
 * Utility functions for formatting data display
 */

/**
 * Formats bytes to human-readable size
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted size (e.g., "45.2 MB", "1.5 GB")
 */
export const formatBytes = (bytes, decimals = 1) => {
  if (bytes === 0 || bytes === undefined || bytes === null) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

/**
 * Formats download speed to human-readable format
 * @param {number} bytesPerSecond - Speed in bytes per second
 * @returns {string} Formatted speed (e.g., "5.2 MB/s", "1.1 GB/s")
 */
export const formatSpeed = (bytesPerSecond) => {
  if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s';

  return formatBytes(bytesPerSecond, 1) + '/s';
};

/**
 * Calculates estimated time remaining for download
 * @param {number} bytesReceived - Bytes already downloaded
 * @param {number} bytesTotal - Total bytes to download
 * @param {number} speed - Current download speed in bytes per second
 * @returns {string} Formatted time (e.g., "2m 15s", "1h 5m", "< 1s")
 */
export const calculateTimeRemaining = (bytesReceived, bytesTotal, speed) => {
  if (!speed || speed === 0 || !bytesTotal || bytesReceived >= bytesTotal) {
    return 'calculating...';
  }

  const bytesRemaining = bytesTotal - bytesReceived;
  const secondsRemaining = Math.floor(bytesRemaining / speed);

  if (secondsRemaining < 1) return '< 1s';
  if (secondsRemaining < 60) return `${secondsRemaining}s`;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

/**
 * Formats progress percentage
 * @param {number} progress - Progress value (0-100)
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted percentage (e.g., "45%", "78.5%")
 */
export const formatProgress = (progress, decimals = 0) => {
  if (progress === undefined || progress === null) return '0%';

  return progress.toFixed(decimals) + '%';
};

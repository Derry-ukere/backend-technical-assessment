/**
 * Custom Validators for Schema Validation
 * These validators are referenced by the 'custom' property in schema.models.js
 */
module.exports = {
    /**
     * Username validation
     * - Must be 3-20 characters
     * - Alphanumeric with underscores allowed
     */
    'username': (data) => {
        if (typeof data !== 'string') return false;
        if (data.trim().length < 3 || data.trim().length > 20) return false;
        // Allow alphanumeric and underscores only
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        return usernameRegex.test(data.trim());
    },

    /**
     * Email validation
     * - Standard email format validation
     */
    'email': (data) => {
        if (typeof data !== 'string') return false;
        const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return emailRegex.test(data.toLowerCase().trim());
    },

    /**
     * Password validation (strong passwords)
     * - Minimum 8 characters
     * - At least one uppercase letter
     * - At least one lowercase letter
     * - At least one number
     * - At least one special character
     */
    'password': (data) => {
        if (typeof data !== 'string') return false;
        if (data.length < 8 || data.length > 100) return false;
        // Check for uppercase
        if (!/[A-Z]/.test(data)) return false;
        // Check for lowercase
        if (!/[a-z]/.test(data)) return false;
        // Check for number
        if (!/[0-9]/.test(data)) return false;
        // Check for special character
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(data)) return false;
        return true;
    },

    /**
     * Phone number validation
     * - Supports international format
     * - Allows +, -, spaces, and parentheses
     */
    'phone': (data) => {
        if (typeof data !== 'string') return false;
        if (!data || data.trim().length === 0) return true; // Optional field, empty is valid
        // Remove common formatting characters for length check
        const digitsOnly = data.replace(/[\s\-\(\)\+]/g, '');
        if (digitsOnly.length < 7 || digitsOnly.length > 15) return false;
        // Validate format: allows +, digits, spaces, dashes, parentheses
        const phoneRegex = /^\+?[\d\s\-\(\)]{7,20}$/;
        return phoneRegex.test(data);
    },

    /**
     * MongoDB ObjectId validation
     * - Must be a 24-character hex string
     */
    'objectId': (data) => {
        if (typeof data !== 'string') return false;
        const objectIdRegex = /^[0-9a-fA-F]{24}$/;
        return objectIdRegex.test(data);
    },

    /**
     * Date validation
     * - Accepts ISO 8601 format or common date formats
     * - Returns true if valid date
     */
    'date': (data) => {
        if (typeof data !== 'string' && !(data instanceof Date)) return false;
        const date = new Date(data);
        return !isNaN(date.getTime());
    },

    /**
     * Past date validation
     * - Must be a valid date in the past
     */
    'pastDate': (data) => {
        if (typeof data !== 'string' && !(data instanceof Date)) return false;
        const date = new Date(data);
        if (isNaN(date.getTime())) return false;
        return date < new Date();
    },

    /**
     * Future date validation
     * - Must be a valid date in the future
     */
    'futureDate': (data) => {
        if (typeof data !== 'string' && !(data instanceof Date)) return false;
        const date = new Date(data);
        if (isNaN(date.getTime())) return false;
        return date > new Date();
    },

    /**
     * Academic year validation
     * - Format: YYYY-YYYY (e.g., 2024-2025)
     * - Second year must be first year + 1
     */
    'academicYear': (data) => {
        if (typeof data !== 'string') return false;
        const regex = /^(\d{4})-(\d{4})$/;
        const match = data.match(regex);
        if (!match) return false;
        const startYear = parseInt(match[1], 10);
        const endYear = parseInt(match[2], 10);
        return endYear === startYear + 1;
    },

    /**
     * Name validation (for human names)
     * - Only letters, spaces, hyphens, and apostrophes
     */
    'name': (data) => {
        if (typeof data !== 'string') return false;
        if (data.trim().length < 1 || data.trim().length > 100) return false;
        const nameRegex = /^[a-zA-Z\s\-']+$/;
        return nameRegex.test(data.trim());
    },

    /**
     * Alphanumeric validation
     * - Only letters and numbers
     */
    'alphanumeric': (data) => {
        if (typeof data !== 'string') return false;
        const regex = /^[a-zA-Z0-9]+$/;
        return regex.test(data);
    },

    /**
     * URL validation
     * - Standard URL format
     */
    'url': (data) => {
        if (typeof data !== 'string') return false;
        try {
            new URL(data);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Positive integer validation
     */
    'positiveInteger': (data) => {
        const num = Number(data);
        return Number.isInteger(num) && num > 0;
    },

    /**
     * Year validation
     * - Must be a 4-digit year between 1800 and current year + 10
     */
    'year': (data) => {
        const year = Number(data);
        const currentYear = new Date().getFullYear();
        return Number.isInteger(year) && year >= 1800 && year <= currentYear + 10;
    },

    /**
     * Gender validation
     * - Must be one of: male, female, other
     */
    'gender': (data) => {
        if (typeof data !== 'string') return false;
        const validGenders = ['male', 'female', 'other'];
        return validGenders.includes(data.toLowerCase());
    },

    /**
     * Role validation
     * - Must be one of: superadmin, school_admin
     */
    'role': (data) => {
        if (typeof data !== 'string') return false;
        const validRoles = ['superadmin', 'school_admin'];
        return validRoles.includes(data);
    },

    /**
     * Non-empty string validation
     */
    'nonEmpty': (data) => {
        return typeof data === 'string' && data.trim().length > 0;
    },

    /**
     * Array of strings validation
     */
    'arrayOfStrings': (data) => {
        if (!Array.isArray(data)) return false;
        return data.every(item => typeof item === 'string' && item.trim().length > 0);
    },

    /**
     * Boolean validation
     */
    'boolean': (data) => {
        return typeof data === 'boolean' || data === 'true' || data === 'false';
    },

    /**
     * Capacity validation
     * - Must be positive integer between 1 and 500
     */
    'capacity': (data) => {
        const num = Number(data);
        return Number.isInteger(num) && num >= 1 && num <= 500;
    },
}
/**
 * Utility functions for formatting dates and numbers system-wide.
 */

/**
 * Formats a date string (YYYY-MM-DD) to DD/MM/AAAA.
 * Handles null, undefined or empty strings gracefully.
 */
export const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '—';
    try {
        const [year, month, day] = dateString.split('-');
        if (!year || !month || !day) return dateString; // Return original if not YYYY-MM-DD
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateString;
    }
};

/**
 * Parses a numeric input string that might contain a comma as a decimal separator.
 * Converts to a standard JavaScript number.
 */
export const parseNumericInput = (value: string): number => {
    if (!value) return 0;
    const normalized = value.toString().replace(',', '.');
    return parseFloat(normalized) || 0;
};

/**
 * Formats a number to a string with a comma as the decimal separator.
 */
export const formatNumber = (value: number | string | undefined, decimals: number = 2): string => {
    if (value === undefined || value === null || value === '') return '0,00';
    const num = typeof value === 'string' ? parseNumericInput(value) : value;
    return num.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
};

/**
 * Formats a currency value.
 */
export const formatCurrency = (value: number | string | undefined): string => {
    if (value === undefined || value === null || value === '') return 'R$ 0,00';
    const num = typeof value === 'string' ? parseNumericInput(value) : value;
    return num.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
};

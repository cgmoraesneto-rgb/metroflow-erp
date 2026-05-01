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
        
        // If day contains time component (e.g. 10T14:53...), strip it
        const cleanDay = day.includes('T') ? day.split('T')[0] : day;
        
        const result = `${cleanDay}/${month}/${year}`;
        // Extra protection: if result still has 'T' or other ISO junk, clean the part before '/'
        return result.split('/')[0].includes('T') ? `${result.split('/')[0].split('T')[0]}/${month}/${year}` : result;
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

/**
 * Formats a given date string into "Month de Year" format (e.g. "Dezembro de 2025").
 * Supports YYYY-MM-DD or MM/YYYY or DD/MM/YYYY formats.
 */
export const formatStandardValidity = (dateString: string | null | undefined): string => {
    if (!dateString) return '—';
    try {
        let year, month;
        if (dateString.includes('-')) {
            [year, month] = dateString.split('-');
        } else if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
                 year = parts[2];
                 month = parts[1];
            } else if (parts.length === 2) {
                 month = parts[0];
                 year = parts[1];
            } else {
                 return dateString;
            }
        } else {
            return dateString;
        }

        const monthMap: { [key: string]: string } = {
            '01': 'Janeiro', '1': 'Janeiro',
            '02': 'Fevereiro', '2': 'Fevereiro',
            '03': 'Março', '3': 'Março',
            '04': 'Abril', '4': 'Abril',
            '05': 'Maio', '5': 'Maio',
            '06': 'Junho', '6': 'Junho',
            '07': 'Julho', '7': 'Julho',
            '08': 'Agosto', '8': 'Agosto',
            '09': 'Setembro', '9': 'Setembro',
            '10': 'Outubro',
            '11': 'Novembro',
            '12': 'Dezembro'
        };

        const monthName = monthMap[month as string] || month;

        // If it's already a full year, use it, else keep original format
        const cleanYear = year?.slice(0, 4);

        if (monthName && cleanYear) {
            return `${monthName} de ${cleanYear}`;
        }
        return dateString;
    } catch {
        return dateString;
    }
};

/**
 * Formats a CNPJ string (XX.XXX.XXX/XXXX-XX).
 */
export const formatCNPJ = (value: string | undefined): string => {
    if (!value) return '';
    const cnpj = value.replace(/\D/g, '');
    if (cnpj.length !== 14) return value;
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

/**
 * Validates a CNPJ checksum.
 */
export const isValidCNPJ = (cnpj: string | undefined): boolean => {
    if (!cnpj) return false;
    const cleanCnpj = cnpj.replace(/\D/g, '');
    
    if (cleanCnpj.length !== 14) return false;
    
    if (/^(\d)\1+$/.test(cleanCnpj)) return false;
    
    let size = cleanCnpj.length - 2;
    let numbers = cleanCnpj.substring(0, size);
    const digits = cleanCnpj.substring(size);
    let sum = 0;
    let pos = size - 7;
    
    for (let i = size; i >= 1; i--) {
        sum += parseInt(numbers.charAt(size - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;
    
    size = size + 1;
    numbers = cleanCnpj.substring(0, size);
    sum = 0;
    pos = size - 7;
    
    for (let i = size; i >= 1; i--) {
        sum += parseInt(numbers.charAt(size - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;
    
    return true;
};


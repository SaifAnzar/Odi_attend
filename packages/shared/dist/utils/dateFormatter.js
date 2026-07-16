"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatApiDate = exports.formatDisplayDate = void 0;
const formatDisplayDate = (date) => {
    if (!date)
        return '';
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};
exports.formatDisplayDate = formatDisplayDate;
const formatApiDate = (date) => {
    if (!date)
        return '';
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
};
exports.formatApiDate = formatApiDate;

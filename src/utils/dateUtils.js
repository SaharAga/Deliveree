/**
 * Formats a date string into a friendly localized display
 */
export function formatDate(dateString, locale = 'en') {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Formats full timestamp with time
 */
export function formatDateTime(dateString, locale = 'en') {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Calculates days remaining until expected delivery date
 */
export function getDaysRemaining(expectedDateString, locale = 'en') {
  if (!expectedDateString) return null;
  try {
    const target = new Date(expectedDateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffMs = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { days: 0, text: locale === 'he' ? 'מגיע היום!' : 'Arriving today!', isUrgent: true, isLate: false };
    } else if (diffDays === 1) {
      return { days: 1, text: locale === 'he' ? 'מחר' : 'Tomorrow', isUrgent: true, isLate: false };
    } else if (diffDays > 1) {
      return {
        days: diffDays,
        text: locale === 'he' ? `עוד ${diffDays} ימים` : `In ${diffDays} days`,
        isUrgent: false,
        isLate: false
      };
    } else {
      const lateDays = Math.abs(diffDays);
      return {
        days: diffDays,
        text: locale === 'he' ? `באיחור של ${lateDays} ימים` : `${lateDays} days overdue`,
        isUrgent: true,
        isLate: true
      };
    }
  } catch {
    return null;
  }
}

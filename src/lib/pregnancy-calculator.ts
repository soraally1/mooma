/**
 * Pregnancy Calculator Service
 * Handles all pregnancy-related calculations
 */

export interface PregnancyCalculations {
  pregnancyWeek: number;
  pregnancyDay: number;
  trimester: number;
  daysRemaining: number;
  estimatedDueDate: string;
  gestationalAge: string;
  trimesterLabel: string;
}

/**
 * Parse date string in DD-MM-YYYY format
 */
function parseDateString(dateStr: string): Date {
  if (!dateStr) throw new Error('Date string is required');
  
  const parts = dateStr.split('-');
  if (parts.length !== 3) throw new Error('Invalid date format. Use DD-MM-YYYY');
  
  const [day, month, year] = parts.map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format date to DD-MM-YYYY string
 */
function formatDateString(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Calculate estimated due date (280 days from HPHT)
 * HPHT = Hari Pertama Haid Terakhir (Last Menstrual Period)
 */
export function calculateEstimatedDueDate(hphtString: string): string {
  try {
    const hpht = parseDateString(hphtString);
    const dueDate = new Date(hpht);
    dueDate.setDate(dueDate.getDate() + 280); // 280 days = 40 weeks
    return formatDateString(dueDate);
  } catch (error) {
    console.error('Error calculating due date:', error);
    throw error;
  }
}

/**
 * Calculate pregnancy week and day from HPHT
 */
export function calculatePregnancyWeekAndDay(hphtString: string): { week: number; day: number } {
  try {
    const hpht = parseDateString(hphtString);
    const today = new Date();
    
    // Calculate days since HPHT
    const timeDiff = today.getTime() - hpht.getTime();
    const daysSinceHpht = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    // Calculate week and day
    const week = Math.floor(daysSinceHpht / 7);
    const day = daysSinceHpht % 7;
    
    return { week, day };
  } catch (error) {
    console.error('Error calculating pregnancy week:', error);
    throw error;
  }
}

/**
 * Calculate trimester based on pregnancy week
 * Trimester 1: Week 1-13
 * Trimester 2: Week 14-26
 * Trimester 3: Week 27-40
 */
export function calculateTrimester(week: number): { trimester: number; label: string } {
  if (week < 1) return { trimester: 0, label: 'Sebelum Kehamilan' };
  if (week <= 13) return { trimester: 1, label: 'Trimester 1' };
  if (week <= 26) return { trimester: 2, label: 'Trimester 2' };
  if (week <= 40) return { trimester: 3, label: 'Trimester 3' };
  return { trimester: 4, label: 'Sudah Melahirkan' };
}

/**
 * Calculate days remaining until due date
 */
export function calculateDaysRemaining(dueDateString: string): number {
  try {
    const dueDate = parseDateString(dueDateString);
    const today = new Date();
    
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    
    return Math.max(0, daysRemaining);
  } catch (error) {
    console.error('Error calculating days remaining:', error);
    throw error;
  }
}

/**
 * Get gestational age string (e.g., "13 minggu 5 hari")
 */
export function getGestationalAgeString(week: number, day: number): string {
  return `${week} minggu ${day} hari`;
}

/**
 * Main calculation function - returns all pregnancy calculations
 */
export function calculatePregnancyMetrics(hphtString: string): PregnancyCalculations {
  try {
    // Calculate estimated due date
    const estimatedDueDate = calculateEstimatedDueDate(hphtString);
    
    // Calculate pregnancy week and day
    const { week, day } = calculatePregnancyWeekAndDay(hphtString);
    
    // Calculate trimester
    const { trimester, label: trimesterLabel } = calculateTrimester(week);
    
    // Calculate days remaining
    const daysRemaining = calculateDaysRemaining(estimatedDueDate);
    
    // Get gestational age string
    const gestationalAge = getGestationalAgeString(week, day);
    
    return {
      pregnancyWeek: week,
      pregnancyDay: day,
      trimester,
      daysRemaining,
      estimatedDueDate,
      gestationalAge,
      trimesterLabel,
    };
  } catch (error) {
    console.error('Error calculating pregnancy metrics:', error);
    throw error;
  }
}

/**
 * Get pregnancy stage description based on week
 */
export function getPregnancyStageDescription(week: number): string {
  if (week < 1) return 'Belum hamil';
  if (week < 4) return 'Awal kehamilan';
  if (week < 8) return 'Embrio berkembang';
  if (week < 12) return 'Organ terbentuk';
  if (week < 16) return 'Janin mulai bergerak';
  if (week < 20) return 'Pertumbuhan janin';
  if (week < 24) return 'Viabilitas janin';
  if (week < 28) return 'Trimester 2 akhir';
  if (week < 32) return 'Persiapan persalinan';
  if (week < 36) return 'Janin posisi turun';
  if (week < 40) return 'Siap melahirkan';
  return 'Sudah melahirkan';
}

/**
 * Validate HPHT date (should not be in future)
 */
export function validateHphtDate(hphtString: string): { valid: boolean; message: string } {
  try {
    const hpht = parseDateString(hphtString);
    const today = new Date();
    
    if (hpht > today) {
      return { valid: false, message: 'HPHT tidak boleh di masa depan' };
    }
    
    // Check if HPHT is not too old (more than 42 weeks ago)
    const maxHphtDate = new Date();
    maxHphtDate.setDate(maxHphtDate.getDate() - 294); // 42 weeks
    
    if (hpht < maxHphtDate) {
      return { valid: false, message: 'HPHT terlalu lama, mungkin sudah melahirkan' };
    }
    
    return { valid: true, message: 'HPHT valid' };
  } catch (error) {
    return { valid: false, message: 'Format tanggal tidak valid. Gunakan DD-MM-YYYY' };
  }
}

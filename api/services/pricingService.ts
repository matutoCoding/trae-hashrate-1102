import { getPricingRates, updatePricingRate, addPricingRate, deletePricingRate } from '../store/dataStore.js';
import type { PricingRate, BillingSegment, CalculatePriceResponse } from '../../shared/types.js';

function generateId(): string {
  return 'id-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function parseTime(timeStr: string, date: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function getApplicableRates(date: Date): PricingRate[] {
  const allRates = getPricingRates().filter(r => r.isActive);
  const weekend = isWeekend(date);
  
  return allRates.filter(rate => {
    if (rate.dayType === 'all') return true;
    if (weekend && rate.dayType === 'weekend') return true;
    if (!weekend && rate.dayType === 'weekday') return true;
    return false;
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60));
}

export function calculatePrice(startTime: Date, endTime: Date, basePrice: number = 0): CalculatePriceResponse {
  if (startTime >= endTime) {
    return {
      totalAmount: basePrice,
      segments: [],
      totalMinutes: 0,
    };
  }

  const segments: BillingSegment[] = [];
  const rates = getApplicableRates(startTime);
  
  if (rates.length === 0) {
    const totalMinutes = minutesBetween(startTime, endTime);
    return {
      totalAmount: basePrice,
      segments: [],
      totalMinutes: Math.round(totalMinutes),
    };
  }

  let currentTime = new Date(startTime);
  const serviceEndTime = new Date(endTime);

  while (currentTime < serviceEndTime) {
    const currentDay = new Date(currentTime);
    currentDay.setHours(0, 0, 0, 0);
    
    const dayRates = getApplicableRates(currentTime);
    
    let segmentEnd = new Date(serviceEndTime);
    let matchedRate: PricingRate | null = null;
    
    for (const rate of dayRates) {
      const rateStart = parseTime(rate.startTime, currentTime);
      const rateEnd = parseTime(rate.endTime, currentTime);
      
      if (rateEnd <= rateStart) {
        rateEnd.setDate(rateEnd.getDate() + 1);
      }
      
      if (currentTime >= rateStart && currentTime < rateEnd) {
        matchedRate = rate;
        if (rateEnd < segmentEnd) {
          segmentEnd = new Date(rateEnd);
        }
        break;
      }
      
      if (rateStart > currentTime && rateStart < segmentEnd) {
        segmentEnd = new Date(rateStart);
      }
    }
    
    if (!matchedRate) {
      const nextDay = new Date(currentTime);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);
      
      if (nextDay < segmentEnd) {
        segmentEnd = nextDay;
      }
    }
    
    if (segmentEnd > serviceEndTime) {
      segmentEnd = new Date(serviceEndTime);
    }
    
    const duration = minutesBetween(currentTime, segmentEnd);
    
    if (duration > 0 && matchedRate) {
      const subtotal = duration * matchedRate.pricePerMinute;
      
      segments.push({
        id: generateId(),
        periodName: matchedRate.name,
        startTime: new Date(currentTime),
        endTime: new Date(segmentEnd),
        durationMinutes: Math.round(duration * 100) / 100,
        unitPrice: matchedRate.pricePerMinute,
        subtotal: Math.round(subtotal * 100) / 100,
      });
    }
    
    currentTime = new Date(segmentEnd);
    
    if (currentTime.getTime() === segmentEnd.getTime() && 
        currentTime.getHours() === 0 && 
        currentTime.getMinutes() === 0) {
      continue;
    }
  }

  const totalAmount = segments.reduce((sum, seg) => sum + seg.subtotal, 0) + basePrice;
  const totalMinutes = segments.reduce((sum, seg) => sum + seg.durationMinutes, 0);

  return {
    totalAmount: Math.round(totalAmount * 100) / 100,
    segments,
    totalMinutes: Math.round(totalMinutes * 100) / 100,
  };
}

export function getAllRates(): PricingRate[] {
  return getPricingRates();
}

export function createRate(rate: Omit<PricingRate, 'id'>): PricingRate {
  const newRate: PricingRate = {
    ...rate,
    id: generateId(),
  };
  addPricingRate(newRate);
  return newRate;
}

export function modifyRate(id: string, updates: Partial<PricingRate>): PricingRate | undefined {
  return updatePricingRate(id, updates);
}

export function removeRate(id: string): boolean {
  return deletePricingRate(id);
}

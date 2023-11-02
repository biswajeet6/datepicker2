import {isBefore,isSameDay, isAfter} from 'date-fns'
import {IDateRange} from '@/app/types/store'

/**
 * Determine if date passed is between or on same day as date range
 * @param date 
 * @param DateRange 
 * @returns 
 */
 const checkDateBetween = (date: Date, DateRange: IDateRange): Boolean => {
  return isSameDay(date, DateRange.start) 
      || isSameDay(date, DateRange.end) 
      || (isAfter(date, DateRange.start) && isBefore(date, DateRange.end))
}


export default checkDateBetween
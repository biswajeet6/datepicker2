export const DAYS_IN_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const DateHelper = () => ({
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dayToString: (day: number) => {
        return DAYS_IN_WEEK[day]
    }
})

export default DateHelper
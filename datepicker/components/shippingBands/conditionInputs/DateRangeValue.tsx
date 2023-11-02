import {Stack, DatePicker} from '@shopify/polaris'
import React, {useCallback, useEffect, useState} from 'react'
import {IDateRange} from '@/app/types/store'

const DateRangeValue: React.FC<{
  value: { start: Date, end: Date }
  callback(value: { start: Date, end: Date })
}> = ({value, callback}): JSX.Element => {

  const today = new Date();

  const [{month, year}, setDate] = useState({
    month: today.getUTCMonth(), 
    year: today.getUTCFullYear()
  });
  const [selectedDates, setSelectedDates] = useState<IDateRange>({
    start: today,
    end: today
  });

  useEffect(() => {
    if (value.start && value.end) {
      setSelectedDates({
        start: new Date(value.start),
        end: new Date(value.end),
      })
    }
  }, [])

  const handleMonthChange = useCallback(
    (month, year) => setDate({month, year}),
    [],
  );

  useEffect(() => {
    callback(selectedDates)
  }, [selectedDates])

  const handleChangeSelectedDate = useCallback((selected) => {
    setSelectedDates(Object.assign(
        {},
        selectedDates,
        {
            start: selected.start,
            end: selected.end,
        }
    ))
  }, [selectedDates])

    return (
        <React.Fragment>
            {(month !== null && year !== null) && <React.Fragment>
              <div style={{ width: '90%' }}>
                <Stack alignment={'center'} >
                  <DatePicker
                    month={month}
                    year={year}
                    onChange={handleChangeSelectedDate}
                    onMonthChange={handleMonthChange}
                    selected={{
                      start: selectedDates.start,
                      end: selectedDates.end
                    }}
                    allowRange
                  />
                </Stack>
              </div>
            </React.Fragment>}
        </React.Fragment>
    )
}

export default DateRangeValue
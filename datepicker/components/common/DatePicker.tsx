import React, {useCallback, useEffect, useState} from "react";
import {DatePicker as PolarisDatePicker} from '@shopify/polaris'

interface IDatePicker {
    ranged: boolean,
    initialDateStart: Date,
    initialDateEnd: Date | null,

    selectedCallback(selected): any
}

const DatePicker: React.FC<IDatePicker> = ({
                                               ranged,
                                               initialDateStart,
                                               initialDateEnd = null,
                                               selectedCallback
                                           }): JSX.Element => {

    const [{month, year}, setDate] = useState({
        month: (initialDateStart.getMonth() + 1),
        year: initialDateStart.getFullYear()
    })

    const [selectedDates, setSelectedDates] = useState({
        start: initialDateStart,
        end: initialDateEnd ?? initialDateStart
    })

    const handleMonthChange = useCallback((month, year) => {
        setDate({month, year})
    }, [])

    // trigger callback
    useEffect(() => {
        selectedCallback(selectedDates)
    }, [selectedDates])

    return (
        <React.Fragment>
            <PolarisDatePicker
                month={month}
                year={year}
                onChange={setSelectedDates}
                onMonthChange={handleMonthChange}
                selected={selectedDates}
                allowRange={ranged}
            />
        </React.Fragment>
    )
}

export default DatePicker
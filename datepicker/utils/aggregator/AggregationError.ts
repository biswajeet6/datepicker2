const AggregationError = ({message = 'Aggregation Error', errorCode = null, data = null} = {}) => ({
    name: 'AggregationError',
    message,
    errorCode,
    data
})

AggregationError.prototype = Error.prototype

export default AggregationError
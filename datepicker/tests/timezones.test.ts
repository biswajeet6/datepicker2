describe('timezones', () => {
    it('initializes in utc', async () => {
        expect((new Date()).getTimezoneOffset()).toBe(0)
    })
})

import rollbar from 'rollbar'

// @ts-ignore
let roll: any = global.roll

if (!roll) {

    roll = new rollbar({
      accessToken: process.env.ROLLBAR_PROJECT_KEY,
      captureUncaught: true,
      captureUnhandledRejections: true
    });

    // @ts-ignore
    global.roll = roll
}

export default roll
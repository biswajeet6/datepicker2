# Deployment

Deployments are handled with CircleCI.

At present, each app has its own [architecture](../architecture/readme.md) configured. The deployment of each instance is managed in its own `build-deploy` workflow.

The workflow makes use of CI contexts.

## Serverless

The CircleCI flow makes use of the [serverless next component](https://github.com/serverless-nextjs/serverless-next.js#readme) to handle the build and deployment of the nextjs app. There's very little configuration in place here for the build.

There is however some custom handling in place to get this working with automated deployments. The standard functionality of the serverless component will create JSON templates for each CloudFront distribution. To avoid creating a new distribution for each deployment the build steps `sync-local-serverless-configuration` and `sync-aws-serverless-configuration` have been added. Before each deploy, we fetch the distribution templates from S3 and then write them back when the deploy has finished. See read [here](https://github.com/serverless-nextjs/serverless-next.js#cicd-multi-stage-deployments--a-new-cloudfront-distribution-is-created-on-every-ci-build-i-wasnt-expecting-that) for more information on the subject.

## Stages

The following are the STAGE env configurations for each of the apps

- datepicker-cutter-staging
- datepicker-cutter-production

## Branching
The staging apps are connected to the `main` branch, and the live apps are connected to the `production` and `release/*` branches. 

## Testing
Jest tests are run on deploys. If a deploy fails, or if your running tests locally, then you may get duplicate id errors and Jest uses the same test DB for deploy and local development. If a deploy fails due to duplicate ids when running tests just restart the build as it should clear the DB.

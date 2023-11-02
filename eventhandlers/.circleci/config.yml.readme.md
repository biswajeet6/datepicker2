# Background

This code defines a CircleCI configuration file that automates the process of building, testing, and deploying a Node.js project. The code specifies three jobs and one workflow, with steps to build, test, and deploy the project.

1.  **Jobs:**
    
    -   `bootstrap-dependencies`: Installs the project's dependencies and caches them for use in later jobs. It uses the `cimg/node:12.16.1` Docker image as the build environment.
    -   `test-js`: Restores the cached dependencies and runs the project's tests using the command `npm run test`.
    -   `build-deploy`: Restores the cached dependencies, installs necessary tools (Serverless CLI, PIP, and AWS CLI), and deploys the project using the Serverless Framework. It also runs a custom script (`deploy/sync-templates.js`) to synchronize the local and AWS Serverless configurations.
2.  **Workflow:**
    
    -   `build-and-test`: Defines the order in which the jobs are executed and any required dependencies between them. The workflow is configured to run on the `main` and `production` branches only.
        -   First, it runs the `bootstrap-dependencies` job.
        -   Next, it runs the `test-js` job, which requires the completion of `bootstrap-dependencies`.
        -   Then, it runs the `build-deploy` job twice, once for staging and once for production. The staging deployment (`build-deploy-cutter-staging`) requires the completion of the `test-js` job. The production deployment (`build-deploy-cutter-production`) requires an approval step (`hold-deploy-cutter-live`) before proceeding.

The CircleCI configuration is designed to ensure that the project's dependencies are installed, the tests pass, and the deployments to staging and production environments are done correctly.

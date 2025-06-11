## Overview

The project is built in Node.js with Typescript and makes use of LocalStack Pro and
CDK to create the infrastructure locally.
LocalStack is installed via Docker Compose. To run this project you'll need a valid
LocalStack Pro token, as the cognito user pools are not available in the basic version.

To run properly, LocalStack may need particular permissions to be set for the
localstack-data folder.

The CDK code is in the file `infra/bin/app.ts`.

The source of the lambda is in the file `src/lambdas/payments.ts`.

The file `infra/architecture.pdf` is a diagram visualising the architecture.


## Architecture

An Api Gateway instance has a route "/payment" that takes POST requests and forwards them to a `payments` lambda.
The Api Gateway is authenticated via Cognito User Pools.
The lambda takes the payload from the post and writes it to the dynamodb table called "payments".
The logs go into CloudWatch.


## Install dependencies

Install aws-cdk and aws-cdk-local globally:

```
npm i -g aws-cdk aws-cdk-local
```

From the project folder, run:

```
npm i
```


## Start LocalStack

Set the token for LocalStack Pro in an env variable:

```
export LS_TOKEN=...
```

From the project folder, run:

```
docker-compose down
```

Followed by:

```
docker-compose up -d
```


## Test that LocalStack is running

Run:

```
curl http://localhost:4566/_localstack/health
```

You should get an output like this:

```
{"services": {"acm": "disabled", "apigateway": "available", "cloudformation": "disabled", "cloudwatch": "available", "config": "disabled", "dynamodb": "available", "dynamodbstreams": "available", "ec2": "disabled", "es": "disabled", "events": "available", "firehose": "disabled", "iam": "disabled", "kinesis": "available", "kms": "disabled", "lambda": "available", "logs": "available", "opensearch": "disabled", "redshift": "disabled", "resource-groups": "disabled", "resourcegroupstaggingapi": "disabled", "route53": "disabled", "route53resolver": "disabled", "s3": "available", "s3control": "disabled", "scheduler": "disabled", "secretsmanager": "disabled", "ses": "disabled", "sns": "disabled", "sqs": "disabled", "ssm": "disabled", "stepfunctions": "disabled", "sts": "available", "support": "disabled", "swf": "disabled", "transcribe": "disabled"}, "edition": "community", "version": "4.5.1.dev21"}
```

Which is a JSON object with the list of available services.


## Setting up CDK

```
npm run bootstrap
```


## Deploying the stack

To deploy the cdk stack, execute:

```
npm run deploy
```

This will also print the stack outputs, which are needed for the rest of the process.

PaymentApiStack.PaymentApiEndpoint = https://...
PaymentApiStack.UserPoolClientId = ...
PaymentApiStack.UserPoolId = ...

The <API_ID> can be obtained from the PaymentApiEndpoint

Existing stacks can be listed by running `npm run stacks`.


---

## Accessing the API

In order to access the API the client needs to have a user in the cognito user pool.
If the client has the credentials for a user in the pool, it can obtain a token that
can be passed in subsequent calls to the enpoint as the Authorization http header.
A succesful call will return 200 Payment stored, and will insert a record in the
DynamoDB table `payments`.
The following paragraphs detail the steps of the operation.


### Create a user in the cognito pool

This will create a user called `testuser`, with password `Passw0rd!`.
UserpoolClientId can be found in the outputs of the cdk deploy operation.

```
awslocal cognito-idp admin-create-user \
  --user-pool-id <UserpoolClientId> \
  --username testuser \
  --user-attributes Name=email,Value=testuser@example.com \
  --message-action SUPPRESS \
  --temporary-password Passw0rd!
```


### Fetch a token to access the API

This will retrieve an API token.

```
awslocal cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id <UserPoolClientId> \
  --auth-parameters USERNAME=testuser,PASSWORD=Passw0rd!
```


### Access the API

This will send a POST request to the `/payment` endpoint, using the token
retrieved in the previous step.

```
curl --request POST \
  --url http://localhost:4566/restapis/<API_ID>/prod/_user_request_/payment \
  --header 'Authorization: <COGNITO_TOKEN>' \
  --header 'Content-Type: application/json' \
  --data '{
  "paymentId": "payment#a3c1b7de-0c8a-4e1a-a06c-7cb5b8f1f6f9",
  "userId": "b7f1736e-4f18-4537-9f4d-9d3d29d46302",
  "timestamp": "2025-06-11T15:04:05Z",
  "description": "Subscription payment for June",
  "currency": "USD",
  "amount": 19.99
}
'
```


### Verify insertion in db

This will show the record inserted in the ddb table.

```
awslocal dynamodb scan --table-name payments
```

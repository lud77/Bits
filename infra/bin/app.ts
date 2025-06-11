import { App, Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

class PaymentApiStack extends Stack {
	constructor(scope: Construct, id: string, props?: StackProps) {
		super(scope, id, props);

    // CloudWatch
		const logGroup = new logs.LogGroup(this, 'ApiLogs');

		// DynamoDB Table
		const paymentsTable = new dynamodb.Table(this, 'PaymentsTable', {
			partitionKey: { name: 'paymentId', type: dynamodb.AttributeType.STRING },
			removalPolicy: RemovalPolicy.DESTROY,
      tableName: 'payments',
		});

		// Lambda Function
		const paymentHandler = new lambda.NodejsFunction(this, 'PaymentHandler', {
      functionName: 'PaymentHandlerFunc',
			entry: path.join(__dirname, '../../src/lambdas/payments.ts'),
			runtime: Runtime.NODEJS_18_X,
			environment: {
				TABLE_NAME: paymentsTable.tableName,
			},
		});

		paymentsTable.grantWriteData(paymentHandler);

		// Cognito
		const userPool = new cognito.UserPool(this, 'UserPool', {
			selfSignUpEnabled: true,
			signInAliases: { username: true, email: true },
			autoVerify: { email: true },
		});

		const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
			userPool,
			authFlows: {
				userPassword: true,
			},
		});

		new CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });

		// API Gateway
		const api = new apigateway.RestApi(this, 'PaymentApi', {
			restApiName: 'Payment Service',
			deployOptions: {
				accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
				accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
			},
		});

		const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'APIAuthorizer', {
			cognitoUserPools: [userPool],
		});

		const paymentResource = api.root.addResource('payment');
		paymentResource.addMethod('POST', new apigateway.LambdaIntegration(paymentHandler), {
			authorizer,
			authorizationType: apigateway.AuthorizationType.COGNITO,
		});
	}
}

const app = new App();

new PaymentApiStack(app, 'PaymentApiStack', {
  stackName: 'bits-res',
  env: {
		account: '000000000000',
		region: 'eu-west-1'
	},
});

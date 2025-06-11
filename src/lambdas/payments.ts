import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

export const handler: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod !== 'POST') {
    console.log('Received request with method', event.httpMethod);
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!event.body) {
    return { statusCode: 400, body: 'Request body is missing' };
  }

  let payment;
  try {
    payment = JSON.parse(event.body);
  } catch (err) {
    console.error('Failed to parse JSON', err);
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { paymentId, userId, timestamp, description, currency, amount } = payment;

  if (
    !paymentId || !userId || !timestamp ||
    !description || !currency || amount == null
  ) {
    return { statusCode: 400, body: 'Some required fields are missing' };
  }

  try {
    console.log('Sending to DDB');

    await ddb.send(new PutCommand({
      TableName: 'payments',
      Item: {
        paymentId,
        userId,
        timestamp,
        description,
        currency,
        amount,
      },
    }));

    return { statusCode: 200, body: 'Payment stored' };
  } catch (err) {
    return { statusCode: 500, body: 'Failed to store payment' };
  }
};

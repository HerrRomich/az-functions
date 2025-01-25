import { HttpResponseInit } from '@azure/functions';
import { StatusCodes } from 'http-status-codes';
import {
  BadRequestError,
  HttpTriggerError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from './http-controller.model';

describe('errors', () => {
  it.each([
    [
      'customized http trigger error',
      () => {
        throw new HttpTriggerError('Bad gateway.', {
          response: {
            status: StatusCodes.BAD_GATEWAY,
            body: 'Bad gateway.',
          },
        });
      },
      {
        status: StatusCodes.BAD_GATEWAY,
        body: 'Bad gateway.',
      },
    ],
    [
      'unspecified http trigger error',
      () => {
        throw new HttpTriggerError('Error request processing.');
      },
      {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        body: 'Error request processing.',
      },
    ],
    [
      'bad request',
      () => {
        throw new BadRequestError('Bad request.');
      },
      {
        status: StatusCodes.BAD_REQUEST,
        body: 'Bad request.',
      },
    ],
    [
      'unauthorized',
      () => {
        throw new UnauthorizedError('Unauthorized.');
      },
      {
        status: StatusCodes.UNAUTHORIZED,
        body: 'Unauthorized.',
      },
    ],
    [
      'not found',
      () => {
        throw new NotFoundError('Not found.');
      },
      {
        status: StatusCodes.NOT_FOUND,
        body: 'Not found.',
      },
    ],
    [
      'internal server error',
      () => {
        throw new InternalServerError('Internal server error.');
      },
      {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        body: 'Internal server error.',
      },
    ],
  ])('should throw %s', (_, exceptionProvider, response: HttpResponseInit) => {
    expect.assertions(2);
    try {
      exceptionProvider();
    } catch (e) {
      if (e instanceof HttpTriggerError) {
        expect(e.message).toEqual(response.body);
        expect(e.response).toEqual(response);
      }
    }
  });
});

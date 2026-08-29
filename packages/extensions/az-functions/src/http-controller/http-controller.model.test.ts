import { HttpResponseInit } from '@azure/functions/types/http';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import {
  BadRequestError,
  BaseHttpTriggerError,
  CommonHttpTriggerError,
  ForbiddenError,
  HttpDirectResponseBuilder,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from './http-controller.model';

describe('errors', () => {
  it.each<{
    description: string;
    exceptionProvider: () => never;
    response: HttpResponseInit;
  }>([
    {
      description: 'customized http trigger error',
      exceptionProvider: () => {
        throw new CommonHttpTriggerError('Bad gateway', {
          response: {
            status: StatusCodes.BAD_GATEWAY,
            body: 'Bad gateway',
          },
        });
      },
      response: {
        status: StatusCodes.BAD_GATEWAY,
        body: 'Bad gateway',
      },
    },
    {
      description: 'unspecified http trigger error without message',
      exceptionProvider: () => {
        throw new CommonHttpTriggerError();
      },
      response: {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        body: 'Internal Server Error',
      },
    },
    {
      description: 'unspecified http trigger error',
      exceptionProvider: () => {
        throw new CommonHttpTriggerError('Error request processing');
      },
      response: {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        body: 'Error request processing',
      },
    },
    {
      description: 'bad request',
      exceptionProvider: () => {
        throw new BadRequestError('Bad request');
      },
      response: {
        status: StatusCodes.BAD_REQUEST,
        body: 'Bad request',
      },
    },
    {
      description: 'unauthorized',
      exceptionProvider: () => {
        throw new UnauthorizedError('Unauthorized');
      },
      response: {
        status: StatusCodes.UNAUTHORIZED,
        body: 'Unauthorized',
      },
    },
    {
      description: 'not found',
      exceptionProvider: () => {
        throw new NotFoundError('Not found');
      },
      response: {
        status: StatusCodes.NOT_FOUND,
        body: 'Not found',
      },
    },
    {
      description: 'forbidden',
      exceptionProvider: () => {
        throw new ForbiddenError('Forbidden');
      },
      response: {
        status: StatusCodes.FORBIDDEN,
        body: 'Forbidden',
      },
    },
    {
      description: 'internal server error',
      exceptionProvider: () => {
        throw new InternalServerError('Internal server error');
      },
      response: {
        status: StatusCodes.INTERNAL_SERVER_ERROR,
        body: 'Internal server error',
      },
    },
  ])('should throw $description', ({ exceptionProvider, response }) => {
    try {
      exceptionProvider();
    } catch (e) {
      if (e instanceof BaseHttpTriggerError) {
        expect(e.message).toEqual(response.body);
        expect(e.response).toEqual(response);
        expect(e.status).toEqual(response.status);
        expect(e.details).toEqual(
          expect.objectContaining({
            httpStatus: response.status,
            reasonPhrase: getReasonPhrase(response.status!),
          }),
        );
      }
    }
  });
});

describe('HttpDirectResponse', () => {
  interface TestDto {
    stringProperty: string;
  }

  it('should create a direct response with status and body', async () => {
    const response = HttpDirectResponseBuilder.builder<TestDto>()
      .header('test-header1', 'test-header-value1')
      .addCookie({
        name: 'test-cookie1',
        value: 'test-cookie-value1',
      })
      .header('test-header2', 'test-header-value2')
      .addCookie({
        name: 'test-cookie2',
        value: 'test-cookie-value2',
        path: 'test-path',
      })
      .jsonBody({
        stringProperty: 'test-value',
      })
      .status(StatusCodes.CREATED)
      .build();

    expect(response.status).toEqual(StatusCodes.CREATED);
    const headers = new Headers(response.headers);
    expect(headers.get('test-header1')).toEqual('test-header-value1');
    expect(headers.get('test-header2')).toEqual('test-header-value2');
    expect(response.cookies).toEqual([
      {
        name: 'test-cookie1',
        value: 'test-cookie-value1',
      },
      {
        name: 'test-cookie2',
        value: 'test-cookie-value2',
        path: 'test-path',
      },
    ]);
    expect(response.jsonBody).toEqual({
      stringProperty: 'test-value',
    });
  });
});

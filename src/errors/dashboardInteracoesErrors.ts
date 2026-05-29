export class DataAccessException extends Error {
  constructor(message = 'Falha na extração dos dados') {
    super(message);
    this.name = 'DataAccessException';
  }
}

export class ServiceUnavailableException extends Error {
  constructor(message = 'Dashboard de interações indisponível') {
    super(message);
    this.name = 'ServiceUnavailableException';
  }
}

export class NoContentException extends Error {
  constructor(message = 'Sem dados de interações para o período') {
    super(message);
    this.name = 'NoContentException';
  }
}
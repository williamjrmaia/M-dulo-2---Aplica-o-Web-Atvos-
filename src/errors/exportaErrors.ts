export class EmptyDataException extends Error {
  constructor(message = 'Nenhum dado disponível para exportar') {
    super(message);
    this.name = 'EmptyDataException';
  }
}

export class DataAccessException extends Error {
  constructor(message = 'Falha na extração dos dados') {
    super(message);
    this.name = 'DataAccessException';
  }
}

export class InternalError extends Error {
  constructor(message = 'Falha na geração do arquivo') {
    super(message);
    this.name = 'InternalError';
  }
}
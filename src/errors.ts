export class OrchestratorError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = "OrchestratorError";
    this.code = code;
  }
}

export class ConfigurationError extends OrchestratorError {
  public constructor(message: string) {
    super("CONFIGURATION_ERROR", message);
    this.name = "ConfigurationError";
  }
}

export class ValidationError extends OrchestratorError {
  public readonly schemaName: string;
  public readonly path: string;
  public readonly expected: string;
  public readonly receivedType: string;

  public constructor(
    schemaName: string,
    path: string,
    expected: string,
    receivedType: string,
  ) {
    super(
      "VALIDATION_ERROR",
      `Validation failed for schema '${schemaName}' at path '${path}': expected ${expected}; received ${receivedType}.`,
    );
    this.name = "ValidationError";
    this.schemaName = schemaName;
    this.path = path;
    this.expected = expected;
    this.receivedType = receivedType;
  }
}

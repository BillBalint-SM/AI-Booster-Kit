import { OrchestratorError } from "../errors.js";

export class ContractError extends OrchestratorError {
  public readonly sourcePath: string;
  public readonly location: string;

  public constructor(sourcePath: string, location: string, message: string) {
    super("CONTRACT_ERROR", `Contract '${sourcePath}' ${location}: ${message}`);
    this.name = "ContractError";
    this.sourcePath = sourcePath;
    this.location = location;
  }
}

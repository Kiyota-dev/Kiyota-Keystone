import type { IdentityConnector } from "../connectors/types.js";
import type { EmailProvider } from "../email.js";
import type { SmsProvider } from "../sms.js";
import type { WorkflowStep, StepContext, StepResult } from "../workflows/steps.js";

export type WorkflowStepExecutor = (step: WorkflowStep, context: StepContext) => Promise<StepResult> | StepResult;

export interface KeystonePlugin {
  name: string;
  connectors?: Record<string, (config?: Record<string, unknown>) => IdentityConnector>;
  emailProvider?: EmailProvider;
  smsProvider?: SmsProvider;
  workflowSteps?: Record<string, WorkflowStepExecutor>;
}

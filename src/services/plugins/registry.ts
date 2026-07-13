import type { KeystonePlugin, WorkflowStepExecutor } from "./types.js";
import type { IdentityConnector } from "../connectors/types.js";
import type { EmailProvider } from "../email.js";
import type { SmsProvider } from "../sms.js";

const plugins: KeystonePlugin[] = [];
const connectorFactories = new Map<string, (config?: Record<string, unknown>) => IdentityConnector>();
const workflowStepExecutors = new Map<string, WorkflowStepExecutor>();
let emailProvider: EmailProvider | undefined;
let smsProvider: SmsProvider | undefined;

export function registerPlugin(plugin: KeystonePlugin): void {
  plugins.push(plugin);

  if (plugin.connectors) {
    for (const [type, factory] of Object.entries(plugin.connectors)) {
      connectorFactories.set(type, factory);
    }
  }

  if (plugin.emailProvider) {
    emailProvider = plugin.emailProvider;
  }

  if (plugin.smsProvider) {
    smsProvider = plugin.smsProvider;
  }

  if (plugin.workflowSteps) {
    for (const [type, executor] of Object.entries(plugin.workflowSteps)) {
      workflowStepExecutors.set(type, executor);
    }
  }
}

export function getConnectorFactory(type: string): ((config?: Record<string, unknown>) => IdentityConnector) | undefined {
  return connectorFactories.get(type);
}

export function getPluginEmailProvider(): EmailProvider | undefined {
  return emailProvider;
}

export function getPluginSmsProvider(): SmsProvider | undefined {
  return smsProvider;
}

export function getPluginWorkflowStep(type: string): WorkflowStepExecutor | undefined {
  return workflowStepExecutors.get(type);
}

export function listRegisteredPlugins(): Array<{ name: string }> {
  return plugins.map((p) => ({ name: p.name }));
}

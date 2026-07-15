import { useEffect, useState } from "react";
import {
  Activity,
  Users,
  Building2,
  LayoutGrid,
  ScrollText,
  LogOut,
  Plug,
  Lock,
  Puzzle,
  ToggleLeft,
  Shield,
  Workflow,
  CreditCard,
  Settings,
} from "lucide-react";
import { api } from "./api.ts";
import { Button } from "./components/ui/Button.tsx";
import { Alert } from "./components/ui/Alert.tsx";
import { LoadingState } from "./components/ui/LoadingState.tsx";
import { LoginForm } from "./components/LoginForm.tsx";
import { AppShell } from "./components/layout/AppShell.tsx";
import { OrganizationsPanel } from "./components/OrganizationsPanel.tsx";
import { ApplicationsPanel } from "./components/ApplicationsPanel.tsx";
import { UsersPanel } from "./components/UsersPanel.tsx";
import { AuditLogsPanel } from "./components/AuditLogsPanel.tsx";
import { KeysPanel } from "./components/KeysPanel.tsx";
import { PluginsPanel } from "./components/PluginsPanel.tsx";
import { FeatureFlagsPanel } from "./components/FeatureFlagsPanel.tsx";
import { EnterpriseSsoPanel } from "./components/EnterpriseSsoPanel.tsx";
import { WorkflowPanel } from "./components/WorkflowPanel.tsx";
import { BillingPanel } from "./components/BillingPanel.tsx";
import { OverviewPanel } from "./components/dashboard/OverviewPanel.tsx";
import { IdentityProvidersPanel } from "./components/dashboard/IdentityProvidersPanel.tsx";
import { OrganizationSelector } from "./components/dashboard/OrganizationSelector.tsx";
import { SettingsPanel } from "./components/dashboard/SettingsPanel.tsx";
import { useAuth } from "./hooks/useAuth.ts";
import { useAsync } from "./hooks/useAsync.ts";

export interface DataTabState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface PluginSummary {
  metadata: { name: string; version: string; description?: string; author?: string; homepage?: string };
  extensionPoints: string[];
}

interface ExtensionPointSummary {
  name: string;
  description: string;
  registered: string[];
}

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string | null;
  source: "database" | "environment";
}

interface ConfigurationProfile {
  id: string;
  name: string;
  description: string;
}

interface SamlConnection {
  id: string;
  name: string;
  idpEntityId: string | null;
  idpSsoUrl: string | null;
  spEntityId: string;
  spAcsUrl: string;
  isActive: boolean;
  createdAt: string;
}

interface OidcConnection {
  id: string;
  name: string;
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string | null;
  jwksUri: string | null;
  clientId: string;
  scopes: string[];
  isActive: boolean;
  createdAt: string;
}

interface WorkflowItem {
  id: string;
  name: string;
  trigger: string;
  definition: { steps: Array<{ type: string; name?: string }> };
  isActive: boolean;
  createdAt: string;
}

interface WorkflowRun {
  id: string;
  status: string;
  triggerEvent: string;
  startedAt: string | null;
  finishedAt: string | null;
  log: Array<{ step: string; status: string; error?: string }>;
}

interface Plan {
  id: string;
  name: string;
  description: string;
}

const API_BASE = import.meta.env.VITE_KEYSTONE_API_URL || "http://localhost:4001";

const TABS = [
  { id: "overview", label: "Overview", icon: <Activity className="w-4 h-4" /> },
  { id: "organizations", label: "Organizations", icon: <Building2 className="w-4 h-4" /> },
  { id: "applications", label: "Applications", icon: <LayoutGrid className="w-4 h-4" /> },
  { id: "users", label: "Users", icon: <Users className="w-4 h-4" /> },
  { id: "identity-providers", label: "Identity Providers", icon: <Plug className="w-4 h-4" /> },
  { id: "keys", label: "Keys", icon: <Lock className="w-4 h-4" /> },
  { id: "plugins", label: "Plugins", icon: <Puzzle className="w-4 h-4" /> },
  { id: "feature-flags", label: "Feature Flags", icon: <ToggleLeft className="w-4 h-4" /> },
  { id: "enterprise-sso", label: "Enterprise SSO", icon: <Shield className="w-4 h-4" /> },
  { id: "workflows", label: "Workflows", icon: <Workflow className="w-4 h-4" /> },
  { id: "billing", label: "Billing", icon: <CreditCard className="w-4 h-4" /> },
  { id: "audit-logs", label: "Audit Logs", icon: <ScrollText className="w-4 h-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
];

export default function Dashboard() {
  const { token, user, loading: authLoading, error: authError, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const {
    data: overviewData,
    loading: overviewLoading,
    error: overviewError,
  } = useAsync(async () => {
    const [health, config, queueStatus] = await Promise.all([
      api.getHealth(),
      api.getOpenIdConfig(),
      api.getQueueStatus(),
    ]);
    return { health, config, queueStatus };
  }, [token]);

  // Tab data states
  const [users, setUsers] = useState<DataTabState<{ users: unknown[] }>>({ data: null, loading: false, error: null });
  const [organizations, setOrganizations] = useState<DataTabState<{ organizations: unknown[] }>>({ data: null, loading: false, error: null });
  const [applications, setApplications] = useState<DataTabState<{ applications: unknown[] }>>({ data: null, loading: false, error: null });
  const [auditLogs, setAuditLogs] = useState<DataTabState<{ logs: unknown[] }>>({ data: null, loading: false, error: null });
  const [providers, setProviders] = useState<DataTabState<{ providers: Array<{ type: string; name: string; configured: boolean }> }>>({ data: null, loading: false, error: null });
  const [keys, setKeys] = useState<DataTabState<{ keys: Array<{ keyId: string; createdAt: string; expiresAt?: string | null }>; provider: string }>>({ data: null, loading: false, error: null });
  const [plugins, setPlugins] = useState<DataTabState<{ plugins: PluginSummary[] }>>({ data: null, loading: false, error: null });
  const [extensions, setExtensions] = useState<DataTabState<{ extensionPoints: ExtensionPointSummary[] }>>({ data: null, loading: false, error: null });
  const [featureFlags, setFeatureFlags] = useState<DataTabState<{ flags: FeatureFlag[] }>>({ data: null, loading: false, error: null });
  const [configProfiles, setConfigProfiles] = useState<DataTabState<{ profiles: ConfigurationProfile[] }>>({ data: null, loading: false, error: null });
  const [samlConnections, setSamlConnections] = useState<DataTabState<{ connections: SamlConnection[] }>>({ data: null, loading: false, error: null });
  const [oidcConnections, setOidcConnections] = useState<DataTabState<{ connections: OidcConnection[] }>>({ data: null, loading: false, error: null });
  const [scimConfig, setScimConfig] = useState<DataTabState<{ enabled: boolean; baseUrl: string; orgId: string }>>({ data: null, loading: false, error: null });
  const [workflows, setWorkflows] = useState<DataTabState<{ workflows: WorkflowItem[] }>>({ data: null, loading: false, error: null });
  const [workflowRuns, setWorkflowRuns] = useState<DataTabState<{ runs: WorkflowRun[] }>>({ data: null, loading: false, error: null });
  const [plans, setPlans] = useState<DataTabState<{ plans: Plan[] }>>({ data: null, loading: false, error: null });
  const [billingSummary, setBillingSummary] = useState<DataTabState<{ plan: string }>>({ data: null, loading: false, error: null });
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

  // Tab loaders
  async function loadTab<T>(state: DataTabState<T>, setState: (value: DataTabState<T>) => void, fetcher: () => Promise<T>) {
    if (state.data) return;
    setState({ ...state, loading: true, error: null });
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
    } catch (err) {
      setState({ data: null, loading: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const refreshUsers = () => loadTab({ data: null, loading: false, error: null }, setUsers, api.getUsers);
  const refreshOrganizations = () => loadTab({ data: null, loading: false, error: null }, setOrganizations, api.getOrganizations);
  const refreshApplications = () => loadTab({ data: null, loading: false, error: null }, setApplications, api.getApplications);
  const refreshAuditLogs = (event?: string) => loadTab({ data: null, loading: false, error: null }, setAuditLogs, () => api.getAuditLogs(event));
  const refreshKeys = () => loadTab({ data: null, loading: false, error: null }, setKeys, api.getSigningKeys);
  const refreshPlugins = () => {
    loadTab({ data: null, loading: false, error: null }, setPlugins, api.getPlugins);
    loadTab({ data: null, loading: false, error: null }, setExtensions, api.getPluginExtensionPoints);
  };
  const refreshFeatureFlags = () => {
    loadTab({ data: null, loading: false, error: null }, setFeatureFlags, api.getFeatureFlags);
    loadTab({ data: null, loading: false, error: null }, setConfigProfiles, api.getConfigurationProfiles);
  };
  const refreshEnterpriseSso = () => {
    if (!selectedOrgId) return;
    loadTab({ data: null, loading: false, error: null }, setSamlConnections, () => api.getSamlConnections(selectedOrgId));
    loadTab({ data: null, loading: false, error: null }, setOidcConnections, () => api.getOidcConnections(selectedOrgId));
    loadTab({ data: null, loading: false, error: null }, setScimConfig, () => api.getScimConfig(selectedOrgId));
  };
  const refreshWorkflows = () => loadTab({ data: null, loading: false, error: null }, setWorkflows, api.getWorkflows);
  const refreshBilling = () => {
    loadTab({ data: null, loading: false, error: null }, setPlans, api.getPlans);
    if (selectedOrgId) {
      loadTab({ data: null, loading: false, error: null }, setBillingSummary, () => api.getBillingSummary(selectedOrgId));
    }
  };

  // Event handlers
  const handleUnregisterPlugin = async (name: string) => {
    await api.unregisterPlugin(name);
    refreshPlugins();
  };
  const handleToggleFeatureFlag = async (key: string, enabled: boolean) => {
    await api.setFeatureFlag(key, enabled);
    refreshFeatureFlags();
  };
  const handleDeleteFeatureFlag = async (key: string) => {
    await api.deleteFeatureFlag(key);
    refreshFeatureFlags();
  };
  const handleCreateFeatureFlag = async (key: string, enabled: boolean, description?: string) => {
    await api.setFeatureFlag(key, enabled, description);
    refreshFeatureFlags();
  };
  const handleCreateSaml = async (input: { name: string; spEntityId: string; spAcsUrl: string }) => {
    if (!selectedOrgId) return;
    await api.createSamlConnection(selectedOrgId, input);
    refreshEnterpriseSso();
  };
  const handleDeleteSaml = async (id: string) => {
    if (!selectedOrgId) return;
    await api.deleteSamlConnection(selectedOrgId, id);
    refreshEnterpriseSso();
  };
  const handleCreateOidc = async (input: { name: string; issuer: string; authorizationEndpoint: string; tokenEndpoint: string; clientId: string; clientSecret: string }) => {
    if (!selectedOrgId) return;
    await api.createOidcConnection(selectedOrgId, input);
    refreshEnterpriseSso();
  };
  const handleDeleteOidc = async (id: string) => {
    if (!selectedOrgId) return;
    await api.deleteOidcConnection(selectedOrgId, id);
    refreshEnterpriseSso();
  };
  const handleCreateWorkflow = async (input: { name: string; trigger: string; definition: { steps: Array<{ type: string; name?: string }> } }) => {
    await api.createWorkflow(input);
    refreshWorkflows();
  };
  const handleDeleteWorkflow = async (id: string) => {
    await api.deleteWorkflow(id);
    if (selectedWorkflowId === id) setSelectedWorkflowId(null);
    refreshWorkflows();
  };
  const handleLoadWorkflowRuns = async (id: string) => {
    loadTab({ data: null, loading: false, error: null }, setWorkflowRuns, () => api.getWorkflowRuns(id));
  };
  const handleChangePlan = async (plan: string) => {
    if (!selectedOrgId) return;
    await api.updateOrganizationPlan(selectedOrgId, plan);
    refreshBilling();
    refreshOrganizations();
  };
  const handleProvisionCustomer = async () => {
    if (!selectedOrgId) return;
    await api.provisionBillingCustomer(selectedOrgId);
    refreshBilling();
  };

  useEffect(() => {
    if (selectedOrgId) return;
    const orgs = organizations.data?.organizations as Array<{ id: string }> | undefined;
    if (orgs && orgs.length > 0) {
      setSelectedOrgId(orgs[0].id);
    }
  }, [organizations.data, selectedOrgId]);

  useEffect(() => {
    if (!token) return;
    switch (activeTab) {
      case "users":
        loadTab(users, setUsers, api.getUsers);
        break;
      case "organizations":
        loadTab(organizations, setOrganizations, api.getOrganizations);
        break;
      case "applications":
        loadTab(applications, setApplications, api.getApplications);
        break;
      case "audit-logs":
        loadTab(auditLogs, setAuditLogs, api.getAuditLogs);
        break;
      case "identity-providers":
        loadTab(providers, setProviders, api.getFederationProviders);
        break;
      case "keys":
        loadTab(keys, setKeys, api.getSigningKeys);
        break;
      case "plugins":
        loadTab(plugins, setPlugins, api.getPlugins);
        loadTab(extensions, setExtensions, api.getPluginExtensionPoints);
        break;
      case "feature-flags":
        loadTab(featureFlags, setFeatureFlags, api.getFeatureFlags);
        loadTab(configProfiles, setConfigProfiles, api.getConfigurationProfiles);
        break;
      case "enterprise-sso":
        refreshEnterpriseSso();
        break;
      case "workflows":
        loadTab(workflows, setWorkflows, api.getWorkflows);
        break;
      case "billing":
        refreshBilling();
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token]);

  if (!token) {
    return <LoginForm onLogin={() => window.location.reload()} />;
  }

  const logo = (
    <div className="w-9 h-9 rounded-lg btn-gold flex items-center justify-center">
      <span className="text-sm font-bold">K</span>
    </div>
  );

  const headerActions = (
    <>
      {user && (
        <span className="hidden sm:inline text-[13px] txt-muted">
          {user.email}
        </span>
      )}
      <Button variant="secondary" size="sm" onClick={logout}>
        <LogOut className="w-4 h-4" />
        Logout
      </Button>
      <Button variant="secondary" size="sm" onClick={() => window.open(`${API_BASE}/documentation`, "_blank")}>
        API Docs
      </Button>
    </>
  );

  const renderContent = () => {
    if (authLoading || overviewLoading) {
      return <LoadingState message="Loading dashboard…" />;
    }

    if (authError) {
      return (
        <Alert variant="error" className="mb-4">
          Unable to authenticate: {authError}
        </Alert>
      );
    }

    if (overviewError) {
      return (
        <Alert variant="error" className="mb-4">
          Unable to load dashboard data: {overviewError}
        </Alert>
      );
    }

    const { health, config, queueStatus } = overviewData ?? { health: null, config: null, queueStatus: null };

    switch (activeTab) {
      case "overview":
        return <OverviewPanel health={health} config={config} queueStatus={queueStatus} />;
      case "organizations":
        return <OrganizationsPanel state={organizations} onRefresh={refreshOrganizations} />;
      case "applications":
        return <ApplicationsPanel state={applications} organizations={organizations} onRefresh={refreshApplications} />;
      case "users":
        return <UsersPanel state={users} onRefresh={refreshUsers} />;
      case "identity-providers":
        return <IdentityProvidersPanel state={providers} />;
      case "keys":
        return <KeysPanel state={keys} onRefresh={refreshKeys} />;
      case "plugins":
        return (
          <PluginsPanel
            pluginsState={plugins}
            extensionsState={extensions}
            onRefresh={refreshPlugins}
            onUnregister={handleUnregisterPlugin}
          />
        );
      case "feature-flags":
        return (
          <FeatureFlagsPanel
            flagsState={featureFlags}
            profilesState={configProfiles}
            onRefresh={refreshFeatureFlags}
            onToggle={handleToggleFeatureFlag}
            onDelete={handleDeleteFeatureFlag}
            onCreate={handleCreateFeatureFlag}
          />
        );
      case "enterprise-sso":
        return (
          <>
            <OrganizationSelector
              organizations={(organizations.data?.organizations as Array<{ id: string; name: string }> | undefined) ?? []}
              selectedId={selectedOrgId}
              onChange={setSelectedOrgId}
              className="mb-4"
            />
            <EnterpriseSsoPanel
              samlState={samlConnections}
              oidcState={oidcConnections}
              scimState={scimConfig}
              selectedOrgId={selectedOrgId}
              onRefresh={refreshEnterpriseSso}
              onCreateSaml={handleCreateSaml}
              onDeleteSaml={handleDeleteSaml}
              onCreateOidc={handleCreateOidc}
              onDeleteOidc={handleDeleteOidc}
            />
          </>
        );
      case "workflows":
        return (
          <WorkflowPanel
            workflowsState={workflows}
            runsState={workflowRuns}
            selectedWorkflowId={selectedWorkflowId}
            onSelectWorkflow={setSelectedWorkflowId}
            onRefresh={refreshWorkflows}
            onCreate={handleCreateWorkflow}
            onDelete={handleDeleteWorkflow}
            onLoadRuns={handleLoadWorkflowRuns}
          />
        );
      case "billing":
        return (
          <>
            <OrganizationSelector
              organizations={(organizations.data?.organizations as Array<{ id: string; name: string }> | undefined) ?? []}
              selectedId={selectedOrgId}
              onChange={setSelectedOrgId}
              className="mb-4"
            />
            <BillingPanel
              plansState={plans}
              billingState={billingSummary}
              currentPlan={
                (organizations.data?.organizations as Array<{ id: string; plan: string }> | undefined)?.find(
                  (o) => o.id === selectedOrgId
                )?.plan ?? "free"
              }
              selectedOrgId={selectedOrgId}
              onRefresh={refreshBilling}
              onChangePlan={handleChangePlan}
              onProvisionCustomer={handleProvisionCustomer}
            />
          </>
        );
      case "audit-logs":
        return <AuditLogsPanel state={auditLogs} onRefresh={refreshAuditLogs} />;
      case "settings":
        return <SettingsPanel />;
      default:
        return null;
    }
  };

  return (
    <AppShell
      title="Keystone Admin"
      subtitle="Identity Platform"
      logo={logo}
      sidebarItems={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerActions={headerActions}
    >
      {renderContent()}
    </AppShell>
  );
}

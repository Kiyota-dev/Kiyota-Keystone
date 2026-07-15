import {
  Code2,
  Building2,
  Users,
  UserPlus,
  Plug,
  ScrollText,
  ArrowRight,
  Rocket,
} from "lucide-react";
import { Card } from "../ui/Card.tsx";
import { Badge } from "../ui/Badge.tsx";
import { SectionCard } from "../ui/SectionCard.tsx";

interface HomePanelProps {
  onNavigate: (tab: string) => void;
  health?: { database?: boolean; redis?: boolean; status?: string } | null;
  queueStatus?: unknown;
}

export function HomePanel({ onNavigate, health }: HomePanelProps) {
  const actions = [
    {
      id: "connect-project",
      title: "Add login to my website",
      description: "Generate a drop-in script for any site or app.",
      icon: <Code2 className="w-5 h-5 text-gold" />,
    },
    {
      id: "organizations",
      title: "Create an organization",
      description: "Add a team or project workspace.",
      icon: <Building2 className="w-5 h-5 text-gold" />,
    },
    {
      id: "users",
      title: "Invite a team member",
      description: "Send an invitation to a new user.",
      icon: <UserPlus className="w-5 h-5 text-gold" />,
    },
    {
      id: "users",
      title: "View active users",
      description: "See who has signed in recently.",
      icon: <Users className="w-5 h-5 text-gold" />,
    },
    {
      id: "identity-providers",
      title: "Enable Google sign-in",
      description: "Connect Google as a login option.",
      icon: <Plug className="w-5 h-5 text-gold" />,
    },
    {
      id: "audit-logs",
      title: "Review audit logs",
      description: "Track logins, changes, and events.",
      icon: <ScrollText className="w-5 h-5 text-gold" />,
    },
  ];

  const apiOk = health?.status === "ok" || health?.status === "setup";
  const dbOk = health?.database ?? apiOk;
  const redisOk = health?.redis ?? apiOk;

  return (
    <div className="space-y-5 animate-fade-in">
      <Card variant="glass" className="p-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold txt-head">Welcome to Keystone</h2>
              <p className="text-[12px] txt-muted">Your identity platform dashboard</p>
            </div>
          </div>
          <p className="text-[13px] txt-body max-w-2xl leading-relaxed">
            Keystone handles authentication, users, organizations, and access control for your apps.
            Pick an action below to get started.
          </p>
        </div>
      </Card>

      <SectionCard
        title="Quick actions"
        description="The most common things you'll do in Keystone."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => (
            <button
              key={action.title}
              onClick={() => onNavigate(action.id)}
              className="group text-left p-4 rounded-xl bg-surface border border-theme/20 hover:border-gold/40 hover:bg-gold/[0.03] transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center">
                  {action.icon}
                </div>
                <ArrowRight className="w-4 h-4 txt-muted group-hover:text-gold transition-colors" />
              </div>
              <h3 className="text-[13px] font-semibold txt-head">{action.title}</h3>
              <p className="text-[11px] txt-muted mt-1 leading-relaxed">{action.description}</p>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="System status"
        description="Current health of your Keystone instance."
      >
        <div className="flex flex-wrap gap-3">
          <Badge variant={apiOk ? "success" : "danger"}>API {apiOk ? "Online" : "Offline"}</Badge>
          <Badge variant={dbOk ? "success" : "danger"}>Database {dbOk ? "Connected" : "Disconnected"}</Badge>
          <Badge variant={redisOk ? "success" : "danger"}>Redis {redisOk ? "Connected" : "Disconnected"}</Badge>
        </div>
      </SectionCard>
    </div>
  );
}
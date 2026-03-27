"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Cards from "@cloudscape-design/components/cards";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Link from "@cloudscape-design/components/link";
import Alert from "@cloudscape-design/components/alert";
import Badge from "@cloudscape-design/components/badge";
import Grid from "@cloudscape-design/components/grid";
import Icon from "@cloudscape-design/components/icon";

interface StateData {
  bundleName: string;
  intent?: string;
  phase?: string;
  nodes: Record<string, { status: string }>;
}

interface GraphData {
  nodes: Array<{ id: string; type: string }>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function getStatusCounts(nodes: Record<string, { status: string }>) {
  const counts = { pending: 0, running: 0, completed: 0, failed: 0 };
  Object.values(nodes).forEach((node) => {
    const status = node.status as keyof typeof counts;
    if (status in counts) counts[status]++;
  });
  return counts;
}

interface NavCard {
  id: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: state, error: stateError } = useSWR<StateData>(
    "/api/state",
    fetcher,
    { refreshInterval: 5000 }
  );
  const { data: graph } = useSWR<GraphData>("/api/graph", fetcher);

  if (stateError) {
    return (
      <ContentLayout
        header={
          <Header variant="h1" description="Overview of your AI-Crew project">
            Dashboard
          </Header>
        }
      >
        <Alert
          type="info"
          header="No Project Found"
        >
          No AI-Crew installation detected. Run{" "}
          <code>ai-crew install --target .</code> to set up a project, or select
          a bundle from the Bundles page.
        </Alert>
      </ContentLayout>
    );
  }

  const statusCounts = state?.nodes ? getStatusCounts(state.nodes) : null;

  const navCards: NavCard[] = [
    {
      id: "inception",
      title: "Inception",
      description: "AI-DLC stage visualization",
      href: "/inception",
      badge: state?.phase || "N/A",
    },
    {
      id: "graph",
      title: "Graph Editor",
      description: "Visual DAG editor for graph.yaml",
      href: "/graph",
      badge: `${graph?.nodes?.length || 0} nodes`,
    },
    {
      id: "runs",
      title: "Runs",
      description: "Execution history and Kanban",
      href: "/runs",
      badge: "View runs",
    },
    {
      id: "bundles",
      title: "Bundles",
      description: "Browse catalog bundles",
      href: "/bundles",
      badge: "Catalog",
    },
    {
      id: "config",
      title: "Config",
      description: "Edit config.yaml settings",
      href: "/config",
      badge: "Settings",
    },
    {
      id: "preflight",
      title: "Preflight",
      description: "Pre-run checks and validation",
      href: "/preflight",
      badge: "Checks",
    },
  ];

  return (
    <ContentLayout
      header={
        <Header variant="h1" description="Overview of your AI-Crew project">
          Dashboard
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* Status Overview */}
        {statusCounts && (
          <Container header={<Header variant="h2">Status Overview</Header>}>
            <ColumnLayout columns={4} variant="text-grid">
              <div>
                <Box variant="awsui-key-label">Pending</Box>
                <Box variant="awsui-value-large">
                  <SpaceBetween direction="horizontal" size="xs">
                    <StatusIndicator type="pending">
                      {statusCounts.pending}
                    </StatusIndicator>
                  </SpaceBetween>
                </Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Running</Box>
                <Box variant="awsui-value-large">
                  <SpaceBetween direction="horizontal" size="xs">
                    <StatusIndicator type="in-progress">
                      {statusCounts.running}
                    </StatusIndicator>
                  </SpaceBetween>
                </Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Completed</Box>
                <Box variant="awsui-value-large">
                  <SpaceBetween direction="horizontal" size="xs">
                    <StatusIndicator type="success">
                      {statusCounts.completed}
                    </StatusIndicator>
                  </SpaceBetween>
                </Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Failed</Box>
                <Box variant="awsui-value-large">
                  <SpaceBetween direction="horizontal" size="xs">
                    <StatusIndicator type="error">
                      {statusCounts.failed}
                    </StatusIndicator>
                  </SpaceBetween>
                </Box>
              </div>
            </ColumnLayout>
          </Container>
        )}

        {/* Navigation Cards */}
        <Cards
          cardDefinition={{
            header: (item) => (
              <Link
                href={item.href}
                onFollow={(e) => {
                  e.preventDefault();
                  router.push(item.href);
                }}
                fontSize="heading-m"
              >
                {item.title}
              </Link>
            ),
            sections: [
              {
                id: "description",
                content: (item) => item.description,
              },
              {
                id: "badge",
                content: (item) =>
                  item.badge ? <Badge color="blue">{item.badge}</Badge> : null,
              },
            ],
          }}
          items={navCards}
          cardsPerRow={[{ cards: 1 }, { minWidth: 500, cards: 2 }, { minWidth: 800, cards: 3 }]}
          header={<Header variant="h2">Quick Navigation</Header>}
        />

        {/* Node Status Table */}
        {state?.nodes && Object.keys(state.nodes).length > 0 && (
          <Container header={<Header variant="h2">Node Status</Header>}>
            <SpaceBetween size="s">
              {Object.entries(state.nodes).map(([id, node]) => (
                <Box
                  key={id}
                  padding="s"
                  variant="div"
                >
                  <SpaceBetween direction="horizontal" size="xs">
                    <Box fontWeight="bold">{id}</Box>
                    <StatusIndicator
                      type={
                        node.status === "completed"
                          ? "success"
                          : node.status === "running"
                            ? "in-progress"
                            : node.status === "failed"
                              ? "error"
                              : "pending"
                      }
                    >
                      {node.status}
                    </StatusIndicator>
                  </SpaceBetween>
                </Box>
              ))}
            </SpaceBetween>
          </Container>
        )}
      </SpaceBetween>
    </ContentLayout>
  );
}

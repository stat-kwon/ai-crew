"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import Cards from "@cloudscape-design/components/cards";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Badge from "@cloudscape-design/components/badge";
import Button from "@cloudscape-design/components/button";
import Alert from "@cloudscape-design/components/alert";
import Modal from "@cloudscape-design/components/modal";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Spinner from "@cloudscape-design/components/spinner";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import TokenGroup from "@cloudscape-design/components/token-group";
import TextFilter from "@cloudscape-design/components/text-filter";

interface Bundle {
  name: string;
  version: string;
  description: string;
}

interface BundleDetails {
  name: string;
  version: string;
  description: string;
  agents?: string[];
  skills?: string[];
  hooks?: string[];
  workflow?: string;
  graph?: {
    nodes: Array<{ id: string; type: string }>;
  };
}

interface BundlesResponse {
  bundles: Bundle[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function BundlesPage() {
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);

  const { data } = useSWR<BundlesResponse>("/api/bundles", fetcher);
  const { data: bundleDetails, isLoading: detailsLoading } =
    useSWR<BundleDetails>(
      selectedBundle ? `/api/bundles/${selectedBundle}` : null,
      fetcher
    );

  const bundles = data?.bundles || [];
  const filteredBundles = bundles.filter(
    (b) =>
      b.name.toLowerCase().includes(filterText.toLowerCase()) ||
      b.description.toLowerCase().includes(filterText.toLowerCase())
  );

  const handleApplyBundle = async () => {
    if (!selectedBundle) return;

    setApplying(true);
    setApplyError(null);
    setApplySuccess(false);

    try {
      const response = await fetch(`/api/bundles/${selectedBundle}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to apply bundle");
      }

      setApplySuccess(true);
      mutate("/api/graph");
      mutate("/api/config");
      mutate("/api/state");
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Failed to apply bundle");
    } finally {
      setApplying(false);
    }
  };

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Browse and select catalog bundles"
        >
          Bundles
        </Header>
      }
    >
      <SpaceBetween size="l">
        {applySuccess && (
          <Alert
            type="success"
            dismissible
            onDismiss={() => setApplySuccess(false)}
            header="Bundle Applied"
          >
            Successfully applied bundle &quot;{selectedBundle}&quot;. Check the Graph and
            Config pages.
          </Alert>
        )}

        {applyError && (
          <Alert
            type="error"
            dismissible
            onDismiss={() => setApplyError(null)}
            header="Apply Failed"
          >
            {applyError}
          </Alert>
        )}

        <Cards
          cardDefinition={{
            header: (item) => (
              <SpaceBetween direction="horizontal" size="xs">
                <Box fontWeight="bold">{item.name}</Box>
                <Badge color="blue">v{item.version}</Badge>
              </SpaceBetween>
            ),
            sections: [
              {
                id: "description",
                content: (item) => (
                  <Box color="text-body-secondary">{item.description}</Box>
                ),
              },
            ],
          }}
          items={filteredBundles}
          cardsPerRow={[
            { cards: 1 },
            { minWidth: 500, cards: 2 },
            { minWidth: 800, cards: 3 },
          ]}
          selectionType="single"
          selectedItems={
            selectedBundle
              ? filteredBundles.filter((b) => b.name === selectedBundle)
              : []
          }
          onSelectionChange={({ detail }) => {
            const selected = detail.selectedItems[0];
            setSelectedBundle(selected?.name || null);
          }}
          header={<Header counter={`(${filteredBundles.length})`}>Available Bundles</Header>}
          filter={
            <TextFilter
              filteringText={filterText}
              filteringPlaceholder="Find bundles"
              filteringAriaLabel="Filter bundles"
              onChange={({ detail }) => setFilterText(detail.filteringText)}
            />
          }
          empty={
            <Box textAlign="center" color="inherit" padding="l">
              <SpaceBetween size="m">
                <Box variant="strong">No bundles available</Box>
                <Box variant="p" color="inherit">
                  No bundles found in the catalog.
                </Box>
              </SpaceBetween>
            </Box>
          }
        />

        {/* Bundle Preview Panel */}
        {selectedBundle && (
          <Container
            header={
              <Header
                variant="h2"
                actions={
                  <Button
                    variant="primary"
                    onClick={handleApplyBundle}
                    loading={applying}
                  >
                    Apply Bundle
                  </Button>
                }
              >
                {selectedBundle}
              </Header>
            }
          >
            {detailsLoading ? (
              <Box textAlign="center" padding="l">
                <Spinner size="large" />
              </Box>
            ) : bundleDetails ? (
              <ColumnLayout columns={2} variant="text-grid">
                <SpaceBetween size="l">
                  <div>
                    <Box variant="awsui-key-label">Version</Box>
                    <Box>{bundleDetails.version}</Box>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Description</Box>
                    <Box>{bundleDetails.description}</Box>
                  </div>
                  {bundleDetails.workflow && (
                    <div>
                      <Box variant="awsui-key-label">Workflow</Box>
                      <Badge>{bundleDetails.workflow}</Badge>
                    </div>
                  )}
                </SpaceBetween>
                <SpaceBetween size="l">
                  {bundleDetails.agents && bundleDetails.agents.length > 0 && (
                    <div>
                      <Box variant="awsui-key-label">Agents</Box>
                      <TokenGroup
                        items={bundleDetails.agents.map((a) => ({
                          label: a,
                        }))}
                        readOnly
                      />
                    </div>
                  )}
                  {bundleDetails.skills && bundleDetails.skills.length > 0 && (
                    <div>
                      <Box variant="awsui-key-label">Skills</Box>
                      <TokenGroup
                        items={bundleDetails.skills.map((s) => ({
                          label: s,
                        }))}
                        readOnly
                      />
                    </div>
                  )}
                  {bundleDetails.graph?.nodes && (
                    <div>
                      <Box variant="awsui-key-label">Graph Nodes</Box>
                      <SpaceBetween direction="horizontal" size="xs">
                        {bundleDetails.graph.nodes.map((node) => (
                          <Badge
                            key={node.id}
                            color={
                              node.type === "worker"
                                ? "blue"
                                : node.type === "router"
                                  ? "grey"
                                  : "green"
                            }
                          >
                            {node.id}
                          </Badge>
                        ))}
                      </SpaceBetween>
                    </div>
                  )}
                </SpaceBetween>
              </ColumnLayout>
            ) : (
              <Box textAlign="center" color="text-status-inactive" padding="l">
                Failed to load bundle details.
              </Box>
            )}
          </Container>
        )}
      </SpaceBetween>
    </ContentLayout>
  );
}

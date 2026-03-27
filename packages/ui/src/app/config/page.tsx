"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Select, { SelectProps } from "@cloudscape-design/components/select";
import Button from "@cloudscape-design/components/button";
import Alert from "@cloudscape-design/components/alert";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Toggle from "@cloudscape-design/components/toggle";
import Box from "@cloudscape-design/components/box";
import Spinner from "@cloudscape-design/components/spinner";
import TokenGroup from "@cloudscape-design/components/token-group";

interface ConfigData {
  project?: string;
  bundle?: string;
  version?: string;
  workflow?: string;
  defaults?: {
    model?: string;
    isolation?: string;
    locale?: string;
  };
  runs?: {
    retention?: number;
    auto_archive?: boolean;
    context_depth?: number;
  };
  includes?: {
    skills?: string[];
    commands?: string[];
  };
}

const modelOptions: SelectProps.Option[] = [
  { label: "Claude Opus 4.6", value: "claude-opus-4-6" },
  { label: "Claude Sonnet 4.6", value: "claude-sonnet-4-6" },
  { label: "Claude Haiku 4.5", value: "claude-haiku-4-5-20251001" },
  { label: "Claude Sonnet 4", value: "claude-sonnet-4" },
  { label: "Claude Opus 4", value: "claude-opus-4" },
];

const isolationOptions: SelectProps.Option[] = [
  { label: "None", value: "none" },
  { label: "Worktree", value: "worktree" },
  { label: "Container", value: "container" },
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ConfigPage() {
  const { data, error, isLoading } = useSWR<ConfigData>("/api/config", fetcher);
  const [localConfig, setLocalConfig] = useState<ConfigData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newCommand, setNewCommand] = useState("");

  useEffect(() => {
    if (data && !localConfig) {
      setLocalConfig(data);
    }
  }, [data, localConfig]);

  const handleSave = async () => {
    if (!localConfig) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localConfig),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to save");
      }

      setSaveSuccess(true);
      mutate("/api/config");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: keyof ConfigData, value: string) => {
    setLocalConfig((prev) =>
      prev ? { ...prev, [key]: value } : null
    );
  };

  const updateDefaults = (key: string, value: string) => {
    setLocalConfig((prev) =>
      prev
        ? {
            ...prev,
            defaults: { ...prev.defaults, [key]: value },
          }
        : null
    );
  };

  const updateRuns = (key: string, value: number | boolean) => {
    setLocalConfig((prev) =>
      prev
        ? {
            ...prev,
            runs: { ...prev.runs, [key]: value },
          }
        : null
    );
  };

  const addSkill = () => {
    if (newSkill && localConfig) {
      const skills = localConfig.includes?.skills || [];
      if (!skills.includes(newSkill)) {
        setLocalConfig({
          ...localConfig,
          includes: {
            ...localConfig.includes,
            skills: [...skills, newSkill],
          },
        });
      }
      setNewSkill("");
    }
  };

  const addCommand = () => {
    if (newCommand && localConfig) {
      const commands = localConfig.includes?.commands || [];
      if (!commands.includes(newCommand)) {
        setLocalConfig({
          ...localConfig,
          includes: {
            ...localConfig.includes,
            commands: [...commands, newCommand],
          },
        });
      }
      setNewCommand("");
    }
  };

  if (error) {
    return (
      <ContentLayout
        header={
          <Header variant="h1" description="Edit config.yaml settings">
            Config
          </Header>
        }
      >
        <Alert type="info" header="No Config Found">
          No config.yaml found. Install a bundle to create one.
        </Alert>
      </ContentLayout>
    );
  }

  if (isLoading || !localConfig) {
    return (
      <ContentLayout
        header={
          <Header variant="h1" description="Edit config.yaml settings">
            Config
          </Header>
        }
      >
        <Box textAlign="center" padding="l">
          <Spinner size="large" />
        </Box>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Edit config.yaml settings"
          actions={
            <Button variant="primary" onClick={handleSave} loading={saving}>
              Save Config
            </Button>
          }
        >
          Config
        </Header>
      }
    >
      <SpaceBetween size="l">
        {saveSuccess && (
          <Alert
            type="success"
            dismissible
            onDismiss={() => setSaveSuccess(false)}
          >
            Configuration saved successfully.
          </Alert>
        )}

        {saveError && (
          <Alert
            type="error"
            dismissible
            onDismiss={() => setSaveError(null)}
          >
            {saveError}
          </Alert>
        )}

        <Form>
          <SpaceBetween size="l">
            {/* Project Info */}
            <Container header={<Header variant="h2">Project Info</Header>}>
              <ColumnLayout columns={3}>
                <FormField label="Project">
                  <Input
                    value={localConfig.project || ""}
                    onChange={({ detail }) => updateField("project", detail.value)}
                  />
                </FormField>
                <FormField label="Bundle">
                  <Input
                    value={localConfig.bundle || ""}
                    onChange={({ detail }) => updateField("bundle", detail.value)}
                  />
                </FormField>
                <FormField label="Version">
                  <Input
                    value={localConfig.version || ""}
                    onChange={({ detail }) => updateField("version", detail.value)}
                  />
                </FormField>
              </ColumnLayout>
            </Container>

            {/* Defaults */}
            <Container header={<Header variant="h2">Defaults</Header>}>
              <ColumnLayout columns={3}>
                <FormField label="Model">
                  <Select
                    selectedOption={
                      modelOptions.find(
                        (o) => o.value === localConfig.defaults?.model
                      ) || modelOptions[0]
                    }
                    onChange={({ detail }) =>
                      updateDefaults("model", detail.selectedOption.value || "")
                    }
                    options={modelOptions}
                  />
                </FormField>
                <FormField label="Isolation">
                  <Select
                    selectedOption={
                      isolationOptions.find(
                        (o) => o.value === localConfig.defaults?.isolation
                      ) || isolationOptions[0]
                    }
                    onChange={({ detail }) =>
                      updateDefaults("isolation", detail.selectedOption.value || "")
                    }
                    options={isolationOptions}
                  />
                </FormField>
                <FormField label="Locale">
                  <Input
                    value={localConfig.defaults?.locale || "en"}
                    onChange={({ detail }) => updateDefaults("locale", detail.value)}
                  />
                </FormField>
              </ColumnLayout>
            </Container>

            {/* Workflow */}
            <Container header={<Header variant="h2">Workflow</Header>}>
              <FormField
                label="Workflow"
                description="The workflow type to use (e.g., aidlc, ouroboros)"
              >
                <Input
                  value={localConfig.workflow || ""}
                  onChange={({ detail }) => updateField("workflow", detail.value)}
                  placeholder="e.g., aidlc"
                />
              </FormField>
            </Container>

            {/* Run Settings */}
            <Container header={<Header variant="h2">Run Settings</Header>}>
              <ColumnLayout columns={3}>
                <FormField
                  label="Retention"
                  description="Number of runs to keep"
                >
                  <Input
                    type="number"
                    value={String(localConfig.runs?.retention || 10)}
                    onChange={({ detail }) =>
                      updateRuns("retention", parseInt(detail.value) || 10)
                    }
                  />
                </FormField>
                <FormField
                  label="Context Depth"
                  description="Depth of context to maintain"
                >
                  <Input
                    type="number"
                    value={String(localConfig.runs?.context_depth || 3)}
                    onChange={({ detail }) =>
                      updateRuns("context_depth", parseInt(detail.value) || 3)
                    }
                  />
                </FormField>
                <FormField label="Auto Archive">
                  <Toggle
                    checked={localConfig.runs?.auto_archive || false}
                    onChange={({ detail }) =>
                      updateRuns("auto_archive", detail.checked)
                    }
                  >
                    Enable auto-archive
                  </Toggle>
                </FormField>
              </ColumnLayout>
            </Container>

            {/* Includes */}
            <Container header={<Header variant="h2">Includes</Header>}>
              <ColumnLayout columns={2}>
                <FormField label="Skills">
                  <SpaceBetween size="xs">
                    <SpaceBetween direction="horizontal" size="xs">
                      <Input
                        value={newSkill}
                        onChange={({ detail }) => setNewSkill(detail.value)}
                        placeholder="Add skill"
                        onKeyDown={({ detail }) => {
                          if (detail.key === "Enter") addSkill();
                        }}
                      />
                      <Button onClick={addSkill}>Add</Button>
                    </SpaceBetween>
                    {localConfig.includes?.skills &&
                      localConfig.includes.skills.length > 0 && (
                        <TokenGroup
                          items={localConfig.includes.skills.map((s) => ({
                            label: s,
                          }))}
                          onDismiss={({ detail }) => {
                            setLocalConfig({
                              ...localConfig,
                              includes: {
                                ...localConfig.includes,
                                skills: localConfig.includes?.skills?.filter(
                                  (_, i) => i !== detail.itemIndex
                                ),
                              },
                            });
                          }}
                        />
                      )}
                  </SpaceBetween>
                </FormField>
                <FormField label="Commands">
                  <SpaceBetween size="xs">
                    <SpaceBetween direction="horizontal" size="xs">
                      <Input
                        value={newCommand}
                        onChange={({ detail }) => setNewCommand(detail.value)}
                        placeholder="Add command"
                        onKeyDown={({ detail }) => {
                          if (detail.key === "Enter") addCommand();
                        }}
                      />
                      <Button onClick={addCommand}>Add</Button>
                    </SpaceBetween>
                    {localConfig.includes?.commands &&
                      localConfig.includes.commands.length > 0 && (
                        <TokenGroup
                          items={localConfig.includes.commands.map((c) => ({
                            label: c,
                          }))}
                          onDismiss={({ detail }) => {
                            setLocalConfig({
                              ...localConfig,
                              includes: {
                                ...localConfig.includes,
                                commands: localConfig.includes?.commands?.filter(
                                  (_, i) => i !== detail.itemIndex
                                ),
                              },
                            });
                          }}
                        />
                      )}
                  </SpaceBetween>
                </FormField>
              </ColumnLayout>
            </Container>
          </SpaceBetween>
        </Form>
      </SpaceBetween>
    </ContentLayout>
  );
}

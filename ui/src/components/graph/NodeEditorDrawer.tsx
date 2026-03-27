"use client";

import { useState, useEffect } from "react";
import Modal from "@cloudscape-design/components/modal";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Button from "@cloudscape-design/components/button";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Select, { SelectProps } from "@cloudscape-design/components/select";
import Multiselect, { MultiselectProps } from "@cloudscape-design/components/multiselect";
import TokenGroup from "@cloudscape-design/components/token-group";
import Textarea from "@cloudscape-design/components/textarea";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Badge from "@cloudscape-design/components/badge";
import Header from "@cloudscape-design/components/header";

interface GraphNode {
  id: string;
  type: "worker" | "router" | "aggregator";
  agent: string;
  skills?: string[];
  hooks?: string[];
  model?: string;
  depends_on: string[];
  tasks?: string[];
  config?: {
    isolation?: string;
    retry?: number;
  };
  wait?: "all" | "any";
}

interface NodeEditorDrawerProps {
  node: GraphNode | null;
  allNodes: GraphNode[];
  onClose: () => void;
  onUpdate?: (node: GraphNode) => void;
  onDelete?: () => void;
  onAdd?: (node: GraphNode) => void;
}

const typeOptions: SelectProps.Option[] = [
  { label: "Worker", value: "worker" },
  { label: "Router", value: "router" },
  { label: "Aggregator", value: "aggregator" },
];

const modelOptions: SelectProps.Option[] = [
  { label: "Claude Opus 4.6", value: "claude-opus-4-6" },
  { label: "Claude Sonnet 4.6", value: "claude-sonnet-4-6" },
  { label: "Claude Haiku 4.5", value: "claude-haiku-4-5-20251001" },
];

const isolationOptions: SelectProps.Option[] = [
  { label: "None", value: "" },
  { label: "Worktree", value: "worktree" },
  { label: "Container", value: "container" },
];

const waitOptions: SelectProps.Option[] = [
  { label: "All", value: "all" },
  { label: "Any", value: "any" },
];

export function NodeEditorDrawer({
  node,
  allNodes,
  onClose,
  onUpdate,
  onDelete,
  onAdd,
}: NodeEditorDrawerProps) {
  const isNew = node === null;

  const [formData, setFormData] = useState<GraphNode>({
    id: node?.id || "",
    type: node?.type || "worker",
    agent: node?.agent || "",
    skills: node?.skills || [],
    hooks: node?.hooks || [],
    model: node?.model || "",
    depends_on: node?.depends_on || [],
    tasks: node?.tasks || [],
    config: node?.config || {},
    wait: node?.wait,
  });

  const [newSkill, setNewSkill] = useState("");
  const [newHook, setNewHook] = useState("");
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    if (node) {
      setFormData({
        id: node.id,
        type: node.type,
        agent: node.agent,
        skills: node.skills || [],
        hooks: node.hooks || [],
        model: node.model || "",
        depends_on: node.depends_on,
        tasks: node.tasks || [],
        config: node.config || {},
        wait: node.wait,
      });
    }
  }, [node]);

  const dependencyOptions: MultiselectProps.Option[] = allNodes
    .filter((n) => n.id !== formData.id)
    .map((n) => ({ label: n.id, value: n.id }));

  const handleSave = () => {
    if (isNew && onAdd) {
      onAdd(formData);
    } else if (onUpdate) {
      onUpdate(formData);
    }
  };

  const addSkill = () => {
    if (newSkill && !formData.skills?.includes(newSkill)) {
      setFormData({
        ...formData,
        skills: [...(formData.skills || []), newSkill],
      });
      setNewSkill("");
    }
  };

  const addHook = () => {
    if (newHook && !formData.hooks?.includes(newHook)) {
      setFormData({
        ...formData,
        hooks: [...(formData.hooks || []), newHook],
      });
      setNewHook("");
    }
  };

  const addTask = () => {
    if (newTask) {
      setFormData({
        ...formData,
        tasks: [...(formData.tasks || []), newTask],
      });
      setNewTask("");
    }
  };

  return (
    <Modal
      visible
      onDismiss={onClose}
      size="medium"
      header={
        <Header variant="h2">
          {isNew ? "Add New Node" : `Edit Node: ${node?.id}`}
        </Header>
      }
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            {!isNew && onDelete && (
              <Button variant="normal" onClick={onDelete}>
                Delete
              </Button>
            )}
            <Button variant="link" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {isNew ? "Add" : "Save"}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="l">
        <ColumnLayout columns={2}>
          <FormField label="Node ID">
            <Input
              value={formData.id}
              onChange={({ detail }) =>
                setFormData({ ...formData, id: detail.value })
              }
              disabled={!isNew}
              placeholder="e.g., planner"
            />
          </FormField>

          <FormField label="Type">
            <Select
              selectedOption={
                typeOptions.find((o) => o.value === formData.type) || null
              }
              onChange={({ detail }) =>
                setFormData({
                  ...formData,
                  type: detail.selectedOption.value as GraphNode["type"],
                })
              }
              options={typeOptions}
            />
          </FormField>
        </ColumnLayout>

        <FormField label="Agent">
          <Input
            value={formData.agent}
            onChange={({ detail }) =>
              setFormData({ ...formData, agent: detail.value })
            }
            placeholder="e.g., planner-agent"
          />
        </FormField>

        <FormField label="Model (optional)">
          <Select
            selectedOption={
              modelOptions.find((o) => o.value === formData.model) || null
            }
            onChange={({ detail }) =>
              setFormData({
                ...formData,
                model: detail.selectedOption?.value || "",
              })
            }
            options={modelOptions}
            placeholder="Select model"
          />
        </FormField>

        <FormField label="Dependencies">
          <Multiselect
            selectedOptions={formData.depends_on.map((d) => ({
              label: d,
              value: d,
            }))}
            onChange={({ detail }) =>
              setFormData({
                ...formData,
                depends_on: detail.selectedOptions.map((o) => o.value || ""),
              })
            }
            options={dependencyOptions}
            placeholder="Select dependencies"
          />
        </FormField>

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
            {formData.skills && formData.skills.length > 0 && (
              <TokenGroup
                items={formData.skills.map((s) => ({ label: s }))}
                onDismiss={({ detail }) => {
                  setFormData({
                    ...formData,
                    skills: formData.skills?.filter(
                      (_, i) => i !== detail.itemIndex
                    ),
                  });
                }}
              />
            )}
          </SpaceBetween>
        </FormField>

        <FormField label="Hooks">
          <SpaceBetween size="xs">
            <SpaceBetween direction="horizontal" size="xs">
              <Input
                value={newHook}
                onChange={({ detail }) => setNewHook(detail.value)}
                placeholder="Add hook"
                onKeyDown={({ detail }) => {
                  if (detail.key === "Enter") addHook();
                }}
              />
              <Button onClick={addHook}>Add</Button>
            </SpaceBetween>
            {formData.hooks && formData.hooks.length > 0 && (
              <TokenGroup
                items={formData.hooks.map((h) => ({ label: h }))}
                onDismiss={({ detail }) => {
                  setFormData({
                    ...formData,
                    hooks: formData.hooks?.filter(
                      (_, i) => i !== detail.itemIndex
                    ),
                  });
                }}
              />
            )}
          </SpaceBetween>
        </FormField>

        <FormField label="Tasks">
          <SpaceBetween size="xs">
            <SpaceBetween direction="horizontal" size="xs">
              <Input
                value={newTask}
                onChange={({ detail }) => setNewTask(detail.value)}
                placeholder="Add task"
                onKeyDown={({ detail }) => {
                  if (detail.key === "Enter") addTask();
                }}
              />
              <Button onClick={addTask}>Add</Button>
            </SpaceBetween>
            {formData.tasks && formData.tasks.length > 0 && (
              <TokenGroup
                items={formData.tasks.map((t) => ({ label: t }))}
                onDismiss={({ detail }) => {
                  setFormData({
                    ...formData,
                    tasks: formData.tasks?.filter(
                      (_, i) => i !== detail.itemIndex
                    ),
                  });
                }}
              />
            )}
          </SpaceBetween>
        </FormField>

        <ColumnLayout columns={2}>
          <FormField label="Isolation">
            <Select
              selectedOption={
                isolationOptions.find(
                  (o) => o.value === (formData.config?.isolation || "")
                ) || isolationOptions[0]
              }
              onChange={({ detail }) =>
                setFormData({
                  ...formData,
                  config: {
                    ...formData.config,
                    isolation: detail.selectedOption.value || undefined,
                  },
                })
              }
              options={isolationOptions}
            />
          </FormField>

          <FormField label="Retry">
            <Input
              type="number"
              value={String(formData.config?.retry || "")}
              onChange={({ detail }) =>
                setFormData({
                  ...formData,
                  config: {
                    ...formData.config,
                    retry: detail.value ? parseInt(detail.value) : undefined,
                  },
                })
              }
              placeholder="0"
            />
          </FormField>
        </ColumnLayout>

        {formData.type === "aggregator" && (
          <FormField label="Wait Mode">
            <Select
              selectedOption={
                waitOptions.find((o) => o.value === formData.wait) ||
                waitOptions[0]
              }
              onChange={({ detail }) =>
                setFormData({
                  ...formData,
                  wait: detail.selectedOption.value as "all" | "any",
                })
              }
              options={waitOptions}
            />
          </FormField>
        )}
      </SpaceBetween>
    </Modal>
  );
}

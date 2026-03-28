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
  { label: "작업자", value: "worker" },
  { label: "분배자", value: "router" },
  { label: "취합자", value: "aggregator" },
];

const modelOptions: SelectProps.Option[] = [
  { label: "Claude Opus 4.6", value: "claude-opus-4-6" },
  { label: "Claude Sonnet 4.6", value: "claude-sonnet-4-6" },
  { label: "Claude Haiku 4.5", value: "claude-haiku-4-5-20251001" },
];

const isolationOptions: SelectProps.Option[] = [
  { label: "없음", value: "" },
  { label: "Worktree", value: "worktree" },
  { label: "컨테이너", value: "container" },
];

const waitOptions: SelectProps.Option[] = [
  { label: "전체 대기", value: "all" },
  { label: "부분 대기", value: "any" },
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
          {isNew ? "새 노드 추가" : `노드 편집: ${node?.id}`}
        </Header>
      }
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            {!isNew && onDelete && (
              <Button variant="normal" onClick={onDelete}>
                삭제
              </Button>
            )}
            <Button variant="link" onClick={onClose}>
              취소
            </Button>
            <Button variant="primary" onClick={handleSave}>
              {isNew ? "추가" : "저장"}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="l">
        <ColumnLayout columns={2}>
          <FormField label="노드 ID">
            <Input
              value={formData.id}
              onChange={({ detail }) =>
                setFormData({ ...formData, id: detail.value })
              }
              disabled={!isNew}
              placeholder="e.g., planner"
            />
          </FormField>

          <FormField label="타입">
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

        <FormField label="에이전트">
          <Input
            value={formData.agent}
            onChange={({ detail }) =>
              setFormData({ ...formData, agent: detail.value })
            }
            placeholder="e.g., planner-agent"
          />
        </FormField>

        <FormField label="모델 (선택사항)">
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
            placeholder="모델 선택"
          />
        </FormField>

        <FormField label="의존성">
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
            placeholder="의존성 선택"
          />
        </FormField>

        <FormField label="스킬">
          <SpaceBetween size="xs">
            <SpaceBetween direction="horizontal" size="xs">
              <Input
                value={newSkill}
                onChange={({ detail }) => setNewSkill(detail.value)}
                placeholder="스킬 추가"
                onKeyDown={({ detail }) => {
                  if (detail.key === "Enter") addSkill();
                }}
              />
              <Button onClick={addSkill}>추가</Button>
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

        <FormField label="훅">
          <SpaceBetween size="xs">
            <SpaceBetween direction="horizontal" size="xs">
              <Input
                value={newHook}
                onChange={({ detail }) => setNewHook(detail.value)}
                placeholder="훅 추가"
                onKeyDown={({ detail }) => {
                  if (detail.key === "Enter") addHook();
                }}
              />
              <Button onClick={addHook}>추가</Button>
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

        <FormField label="작업">
          <SpaceBetween size="xs">
            <SpaceBetween direction="horizontal" size="xs">
              <Input
                value={newTask}
                onChange={({ detail }) => setNewTask(detail.value)}
                placeholder="작업 추가"
                onKeyDown={({ detail }) => {
                  if (detail.key === "Enter") addTask();
                }}
              />
              <Button onClick={addTask}>추가</Button>
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
          <FormField label="격리">
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

          <FormField label="재시도">
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
          <FormField label="대기 방식">
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

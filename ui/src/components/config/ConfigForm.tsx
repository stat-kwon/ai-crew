"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface ConfigFormProps {
  config: ConfigData;
  onSave: (config: ConfigData) => Promise<void>;
}

const models = [
  "claude-sonnet-4",
  "claude-opus-4",
  "claude-haiku-4",
];

const isolationModes = ["none", "worktree"];

export function ConfigForm({ config, onSave }: ConfigFormProps) {
  const [localConfig, setLocalConfig] = useState<ConfigData>(config);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localConfig);
    } finally {
      setSaving(false);
    }
  };

  const updateDefaults = (key: string, value: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      defaults: {
        ...prev.defaults,
        [key]: value,
      },
    }));
  };

  const updateField = (key: keyof ConfigData, value: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Input
                id="project"
                value={localConfig.project || ""}
                onChange={(e) => updateField("project", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bundle">Bundle</Label>
              <Input
                id="bundle"
                value={localConfig.bundle || ""}
                onChange={(e) => updateField("bundle", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={localConfig.version || ""}
                onChange={(e) => updateField("version", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Model</Label>
              <Select
                value={localConfig.defaults?.model || "claude-sonnet-4"}
                onValueChange={(value) => updateDefaults("model", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Isolation</Label>
              <Select
                value={localConfig.defaults?.isolation || "none"}
                onValueChange={(value) => updateDefaults("isolation", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isolationModes.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="locale">Locale</Label>
              <Input
                id="locale"
                value={localConfig.defaults?.locale || "en"}
                onChange={(e) => updateDefaults("locale", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="workflow">Workflow</Label>
            <Input
              id="workflow"
              value={localConfig.workflow || ""}
              onChange={(e) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  workflow: e.target.value,
                }))
              }
              placeholder="e.g., aidlc, ouroboros"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Config"}
        </Button>
      </div>
    </div>
  );
}

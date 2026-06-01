// @ts-nocheck
import { ActionIcon, Badge, Button, Checkbox, Divider, Group, Menu, ScrollArea, Text, Tooltip } from "@mantine/core";
import {
  Columns,
  Dices,
  Download,
  Filter,
  PanelRightOpen,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";

type Props = {
  onRefresh: () => void;
  onInsert: () => void;
  onDelete: () => void;
  onToggleFilter: () => void;
  filterActive: boolean;
  hasSelection: boolean;
  pendingChanges?: number;
  onReviewChanges?: () => void;
  onDiscardChanges?: () => void;
  columns?: string[];
  hiddenColumns?: Set<string>;
  onToggleColumn?: (col: string) => void;
  onExport?: () => void;
  onImportCSV?: () => void;
  onGenerateData?: () => void;
  onToggleInspector?: () => void;
  inspectorActive?: boolean;
};

const toolbarStyle: React.CSSProperties = {
  flex: "0 0 auto",
  paddingInline: 16,
  paddingBlock: 12,
  borderBottom: "1px solid var(--ambry-border)",
  backgroundColor: "var(--ambry-bg-surface)",
  boxShadow: "inset 0 -1px 0 var(--ambry-border-subtle, transparent), 0 1px 0 rgba(0, 0, 0, 0.04)",
  minHeight: 52,
};

const iconBtn = {
  size: "md" as const,
  variant: "subtle" as const,
  radius: "sm" as const,
};

const ICON = 16;

export const GridToolbar = ({
  onRefresh,
  onInsert,
  onDelete,
  onToggleFilter,
  filterActive,
  hasSelection,
  pendingChanges = 0,
  onReviewChanges,
  onDiscardChanges,
  columns,
  hiddenColumns,
  onToggleColumn,
  onExport,
  onImportCSV,
  onGenerateData,
  onToggleInspector,
  inspectorActive,
}: Props) => (
  <Group gap={6} wrap="nowrap" style={toolbarStyle}>
    <Tooltip label="Refresh">
      <ActionIcon {...iconBtn} onClick={onRefresh}>
        <RefreshCw size={ICON} />
      </ActionIcon>
    </Tooltip>

    <Divider orientation="vertical" my={6} />

    <Tooltip label="Insert row">
      <ActionIcon {...iconBtn} onClick={onInsert}>
        <Plus size={ICON} />
      </ActionIcon>
    </Tooltip>
    <Tooltip label="Delete selected">
      <ActionIcon {...iconBtn} onClick={onDelete} disabled={!hasSelection}>
        <Trash2 size={ICON} />
      </ActionIcon>
    </Tooltip>

    <Divider orientation="vertical" my={6} />

    <Tooltip label="Toggle filters">
      <ActionIcon
        {...iconBtn}
        onClick={onToggleFilter}
        variant={filterActive ? "light" : "subtle"}
        color={filterActive ? "indigo" : "gray"}
      >
        <Filter size={ICON} />
      </ActionIcon>
    </Tooltip>

    {columns && onToggleColumn && (
      <Menu position="bottom-start" shadow="lg" withinPortal>
        <Menu.Target>
          <Tooltip label="Columns">
            <ActionIcon {...iconBtn}>
              <Columns size={ICON} />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>
        <Menu.Dropdown>
          <ScrollArea.Autosize mah={300}>
            {columns.map((col) => (
              <Menu.Item
                key={col}
                onClick={(e) => {
                  e.preventDefault();
                  onToggleColumn(col);
                }}
                closeMenuOnClick={false}
              >
                <Checkbox
                  size="xs"
                  checked={!hiddenColumns?.has(col)}
                  onChange={() => onToggleColumn(col)}
                  label={
                    <Text size="xs" style={{ fontFamily: "var(--mantine-font-family-monospace)", fontSize: 11 }}>
                      {col}
                    </Text>
                  }
                />
              </Menu.Item>
            ))}
          </ScrollArea.Autosize>
        </Menu.Dropdown>
      </Menu>
    )}

    <Divider orientation="vertical" my={6} />

    {onImportCSV && (
      <Tooltip label="Import CSV">
        <ActionIcon {...iconBtn} onClick={onImportCSV}>
          <Upload size={ICON} />
        </ActionIcon>
      </Tooltip>
    )}
    {onGenerateData && (
      <Tooltip label="Generate mock data">
        <ActionIcon {...iconBtn} onClick={onGenerateData}>
          <Dices size={ICON} />
        </ActionIcon>
      </Tooltip>
    )}
    {onExport && (
      <Tooltip label="Export">
        <ActionIcon {...iconBtn} onClick={onExport}>
          <Download size={ICON} />
        </ActionIcon>
      </Tooltip>
    )}
    {onToggleInspector && (
      <Tooltip label="Inspector">
        <ActionIcon
          {...iconBtn}
          onClick={onToggleInspector}
          variant={inspectorActive ? "light" : "subtle"}
          color={inspectorActive ? "indigo" : "gray"}
        >
          <PanelRightOpen size={ICON} />
        </ActionIcon>
      </Tooltip>
    )}

    {pendingChanges > 0 && (
      <>
        <div style={{ marginInlineStart: "auto" }} />
        <Badge size="md" variant="light" color="orange" radius="sm">
          {pendingChanges} pending
        </Badge>
        <Button size="compact-sm" variant="light" leftSection={<Save size={14} />} onClick={onReviewChanges}>
          Review
        </Button>
        <Tooltip label="Discard changes">
          <ActionIcon {...iconBtn} color="red" onClick={onDiscardChanges}>
            <Undo2 size={ICON} />
          </ActionIcon>
        </Tooltip>
      </>
    )}
  </Group>
);

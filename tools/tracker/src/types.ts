export type TaskStatus = "open" | "done";
export type RelationKind = "blocks" | "blocked" | "relates" | "duplicateof" | "duplicates" | "parenttask" | "subtask";

export interface Task {
  id: number;
  title: string;
  description: string;
  done: boolean;
  project_id: number;
  labels: Label[];
}

export interface Label {
  id: number;
  title: string;
}

export interface TaskRelation {
  other_task_id: number;
  relation_kind: RelationKind;
}

export interface ForgeTask {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  projectId: number;
  isEpic: boolean;
}

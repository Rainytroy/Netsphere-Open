import { VariableEditorRef, RichTextContent } from '../variable/VariableEditorUtils';

export interface Variable {
  id: string;
  name: string;
  identifier: string;
  type: string;
  sourceId: string;
  sourceName: string;
  value: any;
}

export interface DebugInfo {
  html: string;
  rawText: string;
  plainText: string;
  timestamp: string;
}

export interface MethodResult {
  method?: string;
  params?: any;
  result?: any;
  error?: string;
  variableInfo?: Variable;
}

export interface EditorProps {
  loading: boolean;
  editorVersion: number;
  variables: Variable[];
  editorRef: React.RefObject<VariableEditorRef>;
  handleEditorChange: (value: string) => void;
  updateOutputs: () => void;
}

export interface ContentOutputProps {
  htmlOutput: string;
  rawTextOutput: string;
  plainTextOutput: string;
  jsonOutput: string;
  editorRef: React.RefObject<VariableEditorRef>;
}

export interface InfoPanelProps {
  resolving: boolean;
  resolvedContent: string;
  debugInfo: DebugInfo;
  variables: Variable[];
}

export interface MethodTestPanelProps {
  variables: Variable[];
  editorRef: React.RefObject<VariableEditorRef>;
  testInputText: string;
  updateOutputs: () => void;
  showMethodResult: (title: string, content: any) => void;
}

export interface BasicOperationProps {
  resolving: boolean;
  handleResolveVariables: () => Promise<void>;
  handleReset: () => void;
  handleTestInsertVariable: () => void;
  handleRefreshEditor: () => void;
}

export interface MethodResultModalProps {
  visible: boolean;
  title: string;
  result: any;
  onClose: () => void;
}

export interface SavedRecord {
  id: string;
  content: string;       // 原始内容
  htmlContent: string;   // HTML格式内容，包含完整的变量标记
  preview: string;
  timestamp: number;
}

export interface EditorPanelExtendedProps extends EditorProps {
  handleSaveContent: () => void;
}

export interface SavedRecordsProps {
  records: SavedRecord[];
  onLoadRecord: (id: string) => void;
  onDeleteRecord: (id: string) => void;
}

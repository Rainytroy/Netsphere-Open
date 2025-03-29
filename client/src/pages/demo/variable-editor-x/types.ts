// 变量编辑器X类型定义
import VariableThemeService from '../../../services/VariableThemeService';

// 变量数据接口
export interface VariableData {
  id: string;            // UUID部分
  field: string;         // 字段名
  sourceName: string;    // 显示名称
  sourceType: string;    // 来源类型 (npc, task, workflow等)
  value?: string;        // 变量值
  displayIdentifier?: string; // 用于显示的友好标识符，如 @sourceName.field#id
  
  // 生成的完整标识符 @gv_UUID_field
  get identifier(): string;
}

// 编辑器引用接口
export interface VariableEditorXRef {
  // 内容操作
  insertVariable: (variable: VariableData) => void;
  getContent: () => string;                  // 获取HTML内容
  getRawText: () => string;                  // 获取系统标识符格式内容
  getResolvedContent: () => Promise<string>; // 获取解析后内容
  setContent: (content: string) => void;     // 设置内容
  
  // 编辑器操作
  focusEditor: () => void;
  clearContent: () => void;
  
  // 状态查询
  getUsedVariables: () => VariableData[];
  
  // 加载状态控制
  setLoading: (loading: boolean) => void;    // 设置加载状态，显示/隐藏加载遮罩
  refreshVariables: () => Promise<void>;     // 刷新变量标签
}

// 工具栏配置
export interface ToolbarConfig {
  showInsertVariable?: boolean;
  showPreview?: boolean;
  showRefreshVariables?: boolean;
  showVersion?: boolean;
  customButtons?: React.ReactNode;
}

// 编辑器组件属性
export interface VariableEditorXProps {
  // 基础属性
  initialContent?: string;
  readOnly?: boolean;
  onChange?: (content: string) => void;
  onVariableInsert?: (variable: VariableData) => void;
  placeholder?: string;
  
  // UI配置
  toolbar?: boolean | ToolbarConfig;
  debug?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// 实现VariableData接口的类
export class VariableDataImpl implements VariableData {
  id: string;
  field: string;
  sourceName: string;
  sourceType: string;
  value?: string;
  displayIdentifier?: string;

  constructor(data: Omit<VariableData, 'identifier'>) {
    this.id = data.id;
    this.field = data.field;
    this.sourceName = data.sourceName;
    this.sourceType = data.sourceType;
    this.value = data.value;
    this.displayIdentifier = data.displayIdentifier;
  }

  get identifier(): string {
    return `@gv_${this.id}_${this.field}`;
  }
}

// 变量类型颜色映射 - 从VariableThemeService中获取，保留此常量用于向后兼容
export const TYPE_COLORS: Record<string, string> = {
  npc: VariableThemeService.getMainColor('npc'),
  task: VariableThemeService.getMainColor('task'),
  workflow: VariableThemeService.getMainColor('workflow'),
  custom: VariableThemeService.getMainColor('custom'),
  file: VariableThemeService.getMainColor('file'),
  system: VariableThemeService.getMainColor('system')
};

// 变量类型标签映射
export const TYPE_LABELS: Record<string, string> = {
  npc: 'NPC',
  task: '任务',
  workflow: '工作流',
  custom: '自定义',
  file: '文件',
  system: '系统'
};

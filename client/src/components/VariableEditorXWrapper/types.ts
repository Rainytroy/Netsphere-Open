// VariableEditorXWrapper类型定义
import { VariableData as OriginalVariableData, VariableEditorXRef as OriginalVariableEditorXRef } from '../../pages/demo/variable-editor-x/types';

// 导出原始变量数据类型，保持兼容性
export type VariableData = OriginalVariableData;

// 导出原始编辑器引用类型，保持兼容性
export type VariableEditorXRef = OriginalVariableEditorXRef;

// 工具栏配置类型，简化版
export interface ToolbarConfig {
  insertVariable?: boolean;
  preview?: boolean;
  refresh?: boolean;
}

// 封装组件属性
export interface VariableEditorXWrapperProps {
  // 基础内容属性
  initialContent?: string;
  contentFormat?: 'html' | 'rawText';
  onChange?: (html: string) => void;
  readOnly?: boolean;
  
  // UI配置
  className?: string;
  style?: React.CSSProperties;
  height?: number | string;
  placeholder?: string;
  
  // 工具栏配置 - 简化版，只保留核心功能
  // true = 显示所有按钮，false = 不显示工具栏
  // 对象类型可以精确控制显示哪些按钮
  toolbar?: boolean | ToolbarConfig;
}

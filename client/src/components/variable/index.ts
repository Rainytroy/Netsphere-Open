// 导入所有组件
import VariableEditor2 from './VariableEditor2';
import { EditorToolbar, PreviewModal, EditorContainer } from './VariableEditorComponents';

// 导出主组件作为默认导出
export { default } from './VariableEditor2';

// 从工具文件重新导出接口和类型
export type { 
  VariableEditorRef,
  VariableEditor2Props,
  PreviewData
} from './VariableEditorUtils';

// 导出子组件
export {
  EditorToolbar,
  PreviewModal,
  EditorContainer
};

// 为了兼容性，同时导出VariableEditor2
export { VariableEditor2 };

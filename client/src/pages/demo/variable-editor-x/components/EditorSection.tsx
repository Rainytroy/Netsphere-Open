import React, { useRef } from 'react';
import VariableEditorX from '../VariableEditorX';
import { VariableEditorXRef } from '../types';

interface EditorSectionProps {
  initialContent: string;
  onContentChange: (html: string) => void;
  style?: React.CSSProperties;
  editorRef: React.RefObject<VariableEditorXRef>;
}

/**
 * 编辑器区域组件
 * 包装VariableEditorX组件，提供统一的接口和样式
 */
const EditorSection: React.FC<EditorSectionProps> = ({
  initialContent,
  onContentChange,
  style,
  editorRef
}) => {
  return (
    <div style={{ marginBottom: 24 }}>
      <VariableEditorX
        ref={editorRef}
        initialContent={initialContent}
        readOnly={false}
        onChange={onContentChange}
        debug={true}
        placeholder="在此输入内容，使用@符号触发变量选择..."
        toolbar={{
          showVersion: true
        }}
        style={{
          borderRadius: '2px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          ...style
        }}
      />
    </div>
  );
};

export default EditorSection;

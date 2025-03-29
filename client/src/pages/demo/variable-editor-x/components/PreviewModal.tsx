import React from 'react';

/**
 * 预览模态窗口属性
 */
export interface PreviewModalProps {
  visible: boolean;
  content: string;
  onClose: () => void;
}

/**
 * 预览模态窗口
 * 显示变量解析后的内容预览
 * 从VariableEditorX组件中提取
 */
const PreviewModal: React.FC<PreviewModalProps> = ({
  visible,
  content,
  onClose
}) => {
  if (!visible) return null;
  
  return (
    <div 
      className="preview-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div 
        className="preview-modal"
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          width: '80%',
          maxWidth: '800px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div 
          className="preview-modal-title"
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #f0f0f0',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          变量解析预览
        </div>
        
        <div 
          className="preview-modal-content"
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
          }}
          dangerouslySetInnerHTML={{ __html: content }}
        ></div>
        
        <div 
          className="preview-modal-footer"
          style={{
            padding: '10px 16px',
            borderTop: '1px solid #f0f0f0',
            textAlign: 'right',
          }}
        >
          <button 
            onClick={onClose}
            style={{
              marginLeft: '8px',
              padding: '4px 15px',
              fontSize: '14px',
              borderRadius: '2px',
              border: '1px solid #d9d9d9',
              backgroundColor: '#fff',
              cursor: 'pointer',
            }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;

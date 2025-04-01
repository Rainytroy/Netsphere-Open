import React, { useEffect, useState } from 'react';

/**
 * 预览模态窗口属性
 */
export interface PreviewModalProps {
  visible: boolean;
  content: string;
  onClose: () => void;
}

/**
 * 预览模态窗口 - v3.0版本
 * 显示变量解析后的内容预览
 * 支持v3.0标识符格式
 */
const PreviewModal: React.FC<PreviewModalProps> = ({
  visible,
  content,
  onClose
}) => {
  // 处理后的内容状态
  const [processedContent, setProcessedContent] = useState<string>('');
  const [isEmpty, setIsEmpty] = useState<boolean>(false);
  
  // 当内容变化时处理
  useEffect(() => {
    // 检查内容是否为空
    const contentEmpty = !content || content.trim() === '';
    setIsEmpty(contentEmpty);
    
    if (contentEmpty) {
      setProcessedContent('<span style="color:#999;font-style:italic">无内容或解析结果为空</span>');
    } 
    // 检查内容是否仍包含v3.0格式标识符
    else if (content.includes('@gv_') && content.includes('-=')) {
      console.log('[v3.0 Debug] 警告: 预览内容仍包含未解析的标识符');
      // 标记未解析的标识符
      const highlightedContent = content.replace(
        /@gv_([a-zA-Z0-9]+)_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)-=/g, 
        '<span style="color:red;font-weight:bold">$&</span>'
      );
      setProcessedContent(highlightedContent);
    } else {
      // 内容正常，直接显示
      setProcessedContent(content);
    }
  }, [content]);
  
  // 如果不可见直接返回null
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>变量解析预览</span>
          {isEmpty && <span style={{color: '#ff4d4f', fontSize: '14px'}}>未找到解析内容</span>}
        </div>
        
        <div 
          className="preview-modal-content"
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            fontSize: '14px',
            lineHeight: '1.6'
          }}
          dangerouslySetInnerHTML={{ __html: processedContent }}
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

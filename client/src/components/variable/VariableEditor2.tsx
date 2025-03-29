import React, { useEffect, useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { message } from 'antd';
import { Variable } from './extensions/Variable';
import { VariableKey } from './extensions/VariableKey';
import VariableSelectorModal from './VariableSelectorModal'; 
import { clearVariableCache, updateVariableIdentifiers } from '../../utils/VariableResolver';
import { resolveVariables } from '../../utils/VariableResolverDebug';
import './VariableEditor2.css';

// 导入提取的工具函数和类型
import { 
  VariableEditorRef, 
  VariableEditor2Props,
  PreviewData,
  RichTextContent,
  parseTextToEditorContent,
  extractRawContent,
  getPlainText,
  loadGlobalVariables
} from './VariableEditorUtils';

// 导入UI组件
import {
  EditorToolbar,
  PreviewModal,
  EditorContainer
} from './VariableEditorComponents';

const VariableEditor2 = forwardRef<VariableEditorRef, VariableEditor2Props>(({
  variables = [],
  defaultValue = '<p>在此输入文本，使用@符号触发变量选择</p>',
  onChange,
  placeholder = '请输入文本，使用@符号插入变量',
  minHeight = '150px',
  className,
  currentTaskName
}, ref) => {
  // 状态管理
  const [editorVariables, setEditorVariables] = useState<any[]>([]);
  const [content, setContent] = useState<string>(defaultValue);
  const [richContent, setRichContent] = useState<RichTextContent>({
    html: defaultValue,
    rawText: getPlainText(extractRawContent(defaultValue))
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [previewVisible, setPreviewVisible] = useState<boolean>(false);
  const [previewContent, setPreviewContent] = useState<string>('{}');
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<PreviewData>({
    rawHtml: '',
    rawText: '',
    resolvedHtml: '',
    resolvedText: ''
  });
  const [isFocused, setIsFocused] = useState(false);
  
  // 新增状态用于控制遮罩层和自动更新
  const [showUpdateOverlay, setShowUpdateOverlay] = useState<boolean>(false);
  const [isUpdatingIdentifiers, setIsUpdatingIdentifiers] = useState<boolean>(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastPasteTime, setLastPasteTime] = useState<number>(0);
  
  // 配置项 - 可以注释掉下面这行来禁用自动更新功能
  const autoUpdateEnabled = true; // 启用自动更新功能
  
  // 测试变量始终启用
  const testVariablesEnabled = true;

  // 组件挂载时加载全局变量
  useEffect(() => {
    console.log('[VariableEditor2] 组件挂载，主动加载全局变量');
    // 延迟执行，避免与其他操作冲突
    const timer = setTimeout(() => {
      loadGlobalVariables(setLoading, setEditorVariables, testVariablesEnabled);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  // 组件卸载时清理超时定时器
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);
  
  // 监听外部变量变化
  useEffect(() => {
    if (variables && variables.length > 0) {
      console.log('[VariableEditor2] 接收到外部变量:', variables.length);
      setEditorVariables(prevVars => {
        // 合并现有变量和新传入的变量
        const varMap = new Map();
        
        // 添加已有的变量
        prevVars.forEach(v => varMap.set(v.id, v));
        
        // 添加新传入的变量
        variables.forEach(v => {
          if (!varMap.has(v.id)) {
            varMap.set(v.id, v);
          }
        });
        
        // 转换回数组
        return Array.from(varMap.values());
      });
    }
  }, [variables]);
  
  // 处理@键按下事件
  const handleAtKey = () => {
    console.log('[VariableEditor2] 处理@键事件，打开选择器');
    setModalVisible(true);
  };
  
  // 变量选择器事件处理
  const handleCloseModal = () => setModalVisible(false);
  const handleOpenVariableSelector = () => setModalVisible(true);
  
  // 选择变量后插入到编辑器
  const handleSelectVariable = (identifier: string) => {
    console.log('[VariableEditor2] 选择变量:', identifier);
    
    // 查找完整的变量对象
    const selectedVariable = editorVariables.find(v => v.identifier === identifier);
    
    // 如果找到了变量，插入到编辑器
    if (selectedVariable && editor) {
      // 删除输入的@字符，如果存在的话
      deleteAtCharacter();
      
      // 插入变量节点
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'variable',
          attrs: {
            identifier: selectedVariable.identifier,
            sourceName: selectedVariable.sourceName,
            type: selectedVariable.type,
          },
        })
        .run();
      
      // 更新richContent状态
      updateRichContentState();
      
      message.success(`已插入变量: ${identifier}`);
    } else {
      message.warning('未找到选择的变量');
    }
  };
  
  // 删除编辑器中光标前的@字符
  const deleteAtCharacter = () => {
    if (!editor) return;
    
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;
    
    if ($from.pos > 0) {
      const textBefore = state.doc.textBetween($from.pos - 1, $from.pos);
      if (textBefore === '@') {
        editor
          .chain()
          .focus()
          .deleteRange({ from: $from.pos - 1, to: $from.pos })
          .run();
      }
    }
  };

  // 初始化编辑器
  const editor = useEditor({
    extensions: [
      StarterKit,
      Variable,
      VariableKey.configure({
        onAtKey: handleAtKey,
      }),
    ],
    content: defaultValue,
    editable: true,
    onUpdate: ({ editor, transaction }) => {
      const html = editor.getHTML();
      setContent(html);
      
      // 更新richContent状态
      updateRichContentState();
      
      // 检测粘贴操作
      const isPaste = transaction.getMeta('paste');
      const now = Date.now();
      
      // 如果是粘贴操作，并且启用了自动更新
      if (isPaste && autoUpdateEnabled) {
        // 记录最后粘贴时间，用于防抖处理
        setLastPasteTime(now);
        
        // 设置短暂延迟，确保内容已完全更新
        setTimeout(() => {
          // 防抖检查，确保这是最新的粘贴操作
          if (now === lastPasteTime || Date.now() - lastPasteTime > 50) {
            const rawContent = extractRawContent(html);
            console.log('[VariableEditor2] 检测到粘贴操作，自动更新变量标识符');
            handleUpdatePastedContent(rawContent);
          }
        }, 100);
      }
      
      onChange?.(html);
    },
    editorProps: {
      // 添加粘贴事件处理器（作为备用，以防transaction检测不可靠）
      handlePaste: (view, event) => {
        // 如果剪贴板中有文本数据，且自动更新功能启用
        if (event.clipboardData && autoUpdateEnabled) {
          const clipboardText = event.clipboardData.getData('text/plain');
          if (clipboardText && clipboardText.includes('@')) {
            console.log('[VariableEditor2] 粘贴事件处理器: 检测到可能包含变量的文本');
            
            // 标记为粘贴事件，以便在onUpdate中处理
            // 不在这里直接处理，避免与TipTap的默认行为冲突
            setTimeout(() => {
              const currentContent = editor?.getHTML();
              if (currentContent) {
                const rawContent = extractRawContent(currentContent);
                handleUpdatePastedContent(rawContent);
              }
            }, 200);
          }
        }
        // 让TipTap处理默认的粘贴行为
        return false;
      }
    }
  });
  
  // 专门处理粘贴内容的函数，增强可靠性
  const handleUpdatePastedContent = async (content: string) => {
    if (!editor || !content || !autoUpdateEnabled) return;
    
    console.log('[VariableEditor2] 处理粘贴内容:', content);
    try {
      showUpdatingOverlay();
      
      // 预处理步骤 - 清理HTML标签和处理连续变量
      let processedContent = content;
      
      // 1. 首先移除嵌入的HTML标签，特别是span和相关属性
      // 这有助于防止嵌套变量问题
      const htmlTagPattern = /<[^>]+>/g;
      if (htmlTagPattern.test(processedContent)) {
        // 检测到HTML标签，执行清理
        console.log('[VariableEditor2] 检测到HTML标签，执行预处理清理');
        
        // 创建临时DOM并提取纯文本
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = processedContent;
        processedContent = tempDiv.textContent || tempDiv.innerText || '';
        
        console.log('[VariableEditor2] 清理HTML后的内容:', processedContent);
      }
      
      // 2. 然后处理变量之间的分隔 - 确保变量之间有空格
      const variablePattern = /(@[a-zA-Z0-9_\u4e00-\u9fa5]+\.[a-zA-Z0-9_]+(?:#[a-f0-9]{6})?)/g;
      processedContent = processedContent.replace(variablePattern, '$1 ');
      
      // 检查是否包含变量标识符
      const hasVariables = /@[a-zA-Z0-9_\u4e00-\u9fa5]+\.[a-zA-Z0-9_]+(?:#[a-f0-9]{6})?/.test(processedContent);
      
      if (hasVariables) {
        console.log('[VariableEditor2] 粘贴内容包含变量标识符，进行处理');
        // 使用更可靠的更新方法
        const updatedContent = await updateVariableIdentifiers(processedContent);
        
        // 只有当内容有变化时才更新
        if (updatedContent !== processedContent) {
          console.log('[VariableEditor2] 变量标识符已更新');
          
          // 解析为HTML格式
          const parsedContent = parseTextToEditorContent(updatedContent);
          
          // 更新编辑器内容
          editor.commands.setContent(parsedContent);
          setContent(parsedContent);
          updateRichContentState();
          
          // 发布更新事件
          const event = new CustomEvent('variable-identifiers-updated', {
            detail: {
              originalText: processedContent,
              updatedText: updatedContent
            },
            bubbles: true
          });
          document.dispatchEvent(event);
        } else {
          console.log('[VariableEditor2] 变量标识符无需更新，使用处理后的内容');
          
          // 即使标识符没变化，仍然用预处理后的内容更新编辑器
          // 这确保了连续变量和HTML标签的清理生效
          const parsedContent = parseTextToEditorContent(updatedContent);
          editor.commands.setContent(parsedContent);
          setContent(parsedContent);
          updateRichContentState();
        }
      }
    } catch (error) {
      console.error('[VariableEditor2] 处理粘贴内容出错:', error);
    } finally {
      hideUpdatingOverlay();
    }
  };
  
  // 更新richContent状态
  const updateRichContentState = () => {
    if (!editor) return;
    
    const html = editor.getHTML();
    const rawHtml = extractRawContent(html);
    const plainText = getPlainText(rawHtml);
    
    setRichContent({
      html,
      rawText: plainText,
      plainText: getPlainText(html)
    });
  };

  // 获取原始内容的辅助函数
  const getRawContent = () => {
    if (!editor) return '';
    
    const editorContent = editor.getHTML();
    const rawHtml = extractRawContent(editorContent);
    const plainText = getPlainText(rawHtml);
    
    return plainText;
  };
  
  // 获取富文本内容
  const getRichContentData = (): RichTextContent => {
    return richContent;
  };
  
  // 更新富文本内容
  const updateRichContentData = (newContent: RichTextContent) => {
    if (!editor) return;
    
    // 设置编辑器内容
    editor.commands.setContent(newContent.html);
    
    // 更新状态
    setContent(newContent.html);
    setRichContent(newContent);
  };
  
  /**
   * 显示更新遮罩层的辅助函数
   */
  const showUpdatingOverlay = () => {
    setShowUpdateOverlay(true);
    setIsUpdatingIdentifiers(true);
  };
  
  /**
   * 隐藏更新遮罩层的辅助函数
   */
  const hideUpdatingOverlay = () => {
    setShowUpdateOverlay(false);
    setIsUpdatingIdentifiers(false);
  };
  
  // 处理识别文本中变量的功能，并更新变量标识符
  const handleRecognizeVariables = async () => {
    if (!editor) return;
    
    try {
      // 获取当前编辑器的HTML内容
      const currentContent = editor.getHTML();
      
      // 提取原始文本
      const rawContent = extractRawContent(currentContent);
      console.log('[VariableEditor2] 变量识别 - 原始文本:', rawContent);
      
      // 设置加载状态
      message.loading('正在处理变量标识符...', 1);
      
      // 显示遮罩层
      showUpdatingOverlay();
      
      // 首先更新变量标识符，确保使用最新命名
      const updatedContent = await updateVariableIdentifiers(rawContent);
      console.log('[VariableEditor2] 变量标识符更新后:', updatedContent);
      
      // 解析更新后的文本并转换为HTML
      const parsedContent = parseTextToEditorContent(updatedContent);
      console.log('[VariableEditor2] 变量识别 - 解析后HTML:', parsedContent);
      
      // 使用两步更新强制刷新DOM - 先清空内容
      editor.commands.clearContent();
      
      // 使用setTimeout延迟设置内容以确保DOM完全刷新
      setTimeout(() => {
        // 设置解析后的内容
        editor.commands.setContent(parsedContent);
        setContent(parsedContent);
        
        // 更新richContent状态
        updateRichContentState();
        
        // 隐藏遮罩层
        hideUpdatingOverlay();
        
        // 显示成功消息
        message.success('成功识别并格式化变量');
        
        // 重新聚焦编辑器
        editor.commands.focus();
        
        // 发布变量标识符更新事件，通知其他组件
        if (rawContent !== updatedContent) {
          const event = new CustomEvent('variable-identifiers-updated', {
            detail: {
              originalText: rawContent,
              updatedText: updatedContent
            },
            bubbles: true
          });
          document.dispatchEvent(event);
        }
      }, 100);
    } catch (error) {
      console.error('[VariableEditor2] 识别变量失败:', error);
      message.error('识别变量失败');
      hideUpdatingOverlay();
    }
  };
  
  // 处理更新变量标识符功能
  const handleUpdateIdentifiers = async () => {
    if (!editor) return;
    
    try {
      // 获取当前内容
      const currentContent = editor.getHTML();
      
      // 提取原始文本
      const rawContent = extractRawContent(currentContent);
      
      // 显示遮罩层
      showUpdatingOverlay();
      
      // 更新变量标识符
      const updatedContent = await updateVariableIdentifiers(rawContent);
      
      // 检查内容是否有变化
      if (updatedContent === rawContent) {
        message.info('所有变量标识符已是最新状态');
        hideUpdatingOverlay();
        return;
      }
      
      // 解析更新后的文本并转换为HTML
      const parsedContent = parseTextToEditorContent(updatedContent);
      
      // 设置新内容
      editor.commands.setContent(parsedContent);
      setContent(parsedContent);
      
      // 更新richContent状态
      updateRichContentState();
      
      // 发布变量标识符更新事件
      const event = new CustomEvent('variable-identifiers-updated', {
        detail: {
          originalText: rawContent,
          updatedText: updatedContent
        },
        bubbles: true
      });
      document.dispatchEvent(event);
      
      // 隐藏遮罩层
      hideUpdatingOverlay();
      
      // 显示成功消息
      message.success('变量标识符已更新');
      
      // 重新聚焦编辑器
      editor.commands.focus();
    } catch (error) {
      console.error('[VariableEditor2] 更新变量标识符失败:', error);
      message.error('更新变量标识符失败');
      hideUpdatingOverlay();
    }
  };
  
  /**
   * 自动更新变量标识符
   * 该函数会在内容加载或更新时被调用
   */
  const autoUpdateIdentifiers = async (content: string) => {
    // 如果自动更新被禁用，直接返回
    if (!autoUpdateEnabled) return content;
    
    // 如果已经在更新中，则跳过
    if (isUpdatingIdentifiers) return content;
    
    // 清除之前的定时器
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // 设置新的定时器，延迟执行以避免频繁更新
    updateTimeoutRef.current = setTimeout(async () => {
      try {
        // 显示遮罩层
        showUpdatingOverlay();
        
        // 更新变量标识符
        const updatedContent = await updateVariableIdentifiers(content);
        
        // 检查内容是否有变化
        if (updatedContent === content) {
          // 没有变化，隐藏遮罩层并返回
          hideUpdatingOverlay();
          return;
        }
        
        // 解析更新后的文本并转换为HTML
        const parsedContent = parseTextToEditorContent(updatedContent);
        
        // 确保编辑器仍然存在
        if (!editor) {
          hideUpdatingOverlay();
          return;
        }
        
        // 设置新内容
        editor.commands.setContent(parsedContent);
        setContent(parsedContent);
        
        // 更新richContent状态
        const rawHtml = extractRawContent(parsedContent);
        const plainText = getPlainText(rawHtml);
        
        setRichContent({
          html: parsedContent,
          rawText: plainText,
          plainText: getPlainText(parsedContent)
        });
        
        // 发布变量标识符更新事件
        const event = new CustomEvent('variable-identifiers-updated', {
          detail: {
            originalText: content,
            updatedText: updatedContent
          },
          bubbles: true
        });
        document.dispatchEvent(event);
        
        // 隐藏遮罩层
        hideUpdatingOverlay();
      } catch (error) {
        console.error('[VariableEditor2] 自动更新变量标识符失败:', error);
        hideUpdatingOverlay();
      }
    }, 300); // 300ms延迟，可以根据需要调整
    
    return content;
  };
  
  // 预览变量解析
  const handleShowPreview = async () => {
    try {
      setPreviewLoading(true);
      if (editor) {
        // 获取带变量标识符的原始内容
        const rawTextContent = getRawContent();
        console.log('[VariableEditor2] 预览解析 - 原始文本:', rawTextContent);
        
        // 清除变量缓存，确保获取最新数据
        clearVariableCache();
        
        // 解析原始内容
        const resolvedTextContent = await resolveVariables(rawTextContent, true);
        console.log('[VariableEditor2] 预览解析 - 解析后文本:', resolvedTextContent);
        
        // 设置预览数据
        const newPreviewData = {
          rawHtml: editor.getHTML(),
          rawText: rawTextContent,
          resolvedHtml: `<p>${resolvedTextContent}</p>`,
          resolvedText: resolvedTextContent
        };
        
        setPreviewData(newPreviewData);
        
        // 保留JSON字符串，但确保它是有效的（用于向后兼容）
        try {
          setPreviewContent(JSON.stringify(newPreviewData));
        } catch (e) {
          console.error('[VariableEditor2] JSON.stringify失败:', e);
          setPreviewContent('{}');
        }
        
        setPreviewVisible(true);
      }
    } catch (error) {
      console.error('[VariableEditor2] 预览解析值失败:', error);
      message.error('预览解析值失败');
    } finally {
      setPreviewLoading(false);
    }
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    // 插入变量
    insertVariable: (variable: any) => {
      if (editor) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'variable',
            attrs: {
              identifier: variable.identifier,
              sourceName: variable.sourceName,
              type: variable.type,
            },
          })
          .run();
        
        // 更新richContent状态
        updateRichContentState();
      }
    },
    
    // 更新内容
    updateContent: async (newContent: string) => {
      if (editor) {
        // 如果启用了自动更新，先尝试更新变量标识符
        if (autoUpdateEnabled) {
          // 不在这里直接await，让它异步执行，避免阻塞UI
          autoUpdateIdentifiers(extractRawContent(newContent));
        }
        
        editor.commands.setContent(newContent);
        setContent(newContent);
        
        // 更新richContent状态
        const rawHtml = extractRawContent(newContent);
        const plainText = getPlainText(rawHtml);
        
        setRichContent({
          html: newContent,
          rawText: plainText,
          plainText: getPlainText(newContent)
        });
      }
    },
    
    // 聚焦编辑器
    focusEditor: () => {
      if (editor) {
        editor.commands.focus();
      }
    },
    
    // 解析和渲染外部文本
    parseExternalContent: async (text: string) => {
      if (editor && text) {
        console.log('[VariableEditor2] 解析外部文本:', text);
        
        // 如果启用了自动更新，先尝试更新变量标识符
        let processedText = text;
        if (autoUpdateEnabled) {
          // 显示遮罩层
          showUpdatingOverlay();
          
          try {
            // 更新变量标识符
            processedText = await updateVariableIdentifiers(text);
          } catch (error) {
            console.error('[VariableEditor2] 自动更新变量标识符失败:', error);
            // 出错时仍然使用原始文本
            processedText = text;
          } finally {
            // 无论成功与否，最后都要隐藏遮罩层
            hideUpdatingOverlay();
          }
        }
        
        const parsedContent = parseTextToEditorContent(processedText);
        editor.commands.setContent(parsedContent);
        setContent(parsedContent);
        
        // 更新richContent状态
        const rawHtml = extractRawContent(parsedContent);
        const plainText = getPlainText(rawHtml);
        
        setRichContent({
          html: parsedContent,
          rawText: text,  // 保存原始文本作为rawText
          plainText: plainText
        });
        
        // 如果文本有更新，发布更新事件
        if (processedText !== text) {
          const event = new CustomEvent('variable-identifiers-updated', {
            detail: {
              originalText: text,
              updatedText: processedText
            },
            bubbles: true
          });
          document.dispatchEvent(event);
        }
      }
    },
    
    // 获取原始格式内容
    getRawContent,
    
    // 获取解析格式内容
    getResolvedContent: async () => {
      if (!editor) return '';
      try {
        const rawText = getRawContent();
        console.log('[VariableEditor2] 开始解析变量内容:', rawText);
        clearVariableCache();
        const resolvedText = await resolveVariables(rawText, true);
        console.log('[VariableEditor2] 变量解析结果:', resolvedText);
        return resolvedText;
      } catch (error) {
        console.error('[VariableEditor2] 解析变量失败:', error);
        return getRawContent();
      }
    },
    
    // 新增方法 - 富文本内容
    getRichContent: getRichContentData,
    updateRichContent: updateRichContentData,
    
    // 新增方法 - 识别变量
    recognizeVariables: handleRecognizeVariables
  }));

  // 焦点处理函数
  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);
  
  return (
    <>
      {/* 编辑器容器 */}
      <EditorContainer
        className={className}
        minHeight={minHeight}
        isFocused={isFocused}
        onClick={() => editor?.commands.focus()}
        showUpdateOverlay={showUpdateOverlay}
      >
        <EditorContent 
          editor={editor} 
          placeholder={placeholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{
            margin: '4px 0',
            outline: 'none',
          }}
        />
      </EditorContainer>
      
      {/* 底部工具栏 */}
      <EditorToolbar
        onOpenVariableSelector={handleOpenVariableSelector}
        onShowPreview={handleShowPreview}
        onRecognizeVariables={handleRecognizeVariables}
        onUpdateIdentifiers={handleUpdateIdentifiers}
      />
      
      {/* 变量选择器模态窗口 */}
      <VariableSelectorModal
        visible={modalVisible}
        onCancel={handleCloseModal}
        onSelect={handleSelectVariable}
        currentTaskName={currentTaskName}
      />

      {/* 解析值预览模态窗口 */}
      <PreviewModal
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        loading={previewLoading}
        previewData={previewData}
      />
    </>
  );
});

export default VariableEditor2;

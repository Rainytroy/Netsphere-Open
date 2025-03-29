import * as React from 'react';
import { useState, useCallback, useEffect, forwardRef, useImperativeHandle, useRef, createRef } from 'react';
import { createEditor, Descendant, Element as SlateElement, Node, Range, Transforms, Text, Editor, BaseEditor, Point } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import { Form, Menu, Tag, message } from 'antd';
import { VariableView } from './VariableList';
import { updateVariableIdentifiers } from '../../utils/VariableResolver';

// 定义自定义元素类型
type CustomElement = { 
  type: 'paragraph' | 'variable'; 
  children: CustomText[];
  identifier?: string;
  sourceName?: string; 
};
type CustomText = { text: string };

// 声明TypeScript类型
declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

// 自定义编辑器行为
const withVariables = (editor: Editor) => {
  const { isInline, isVoid, deleteBackward } = editor;
  
  // 让变量节点成为内联元素
  editor.isInline = (element: any) => {
    return element.type === 'variable' ? true : isInline(element);
  };
  
  // 变量节点不可编辑内部文本
  editor.isVoid = (element: any) => {
    return element.type === 'variable' ? true : isVoid(element);
  };
  
  // 自定义退格键行为，确保只有在紧邻变量后才整体删除变量
  editor.deleteBackward = (unit: any) => {
    const { selection } = editor;
    
    if (selection && Range.isCollapsed(selection)) {
      // 获取当前光标位置
      const point = selection.anchor;
      
      // 检查光标是否在文本开头 - 如果是开头则无法查看前一个节点
      if (point.offset === 0) {
        // 获取当前节点和路径
        const [currentNode, currentPath] = Editor.node(editor, point);
        
        // 获取前一个节点
        const [prevNode, prevPath] = Editor.previous(editor, { at: currentPath }) || [null, null];
        
        // 如果前一个节点是变量，则删除它
        if (prevNode && prevPath && SlateElement.isElement(prevNode) && prevNode.type === 'variable') {
          Transforms.removeNodes(editor, { at: prevPath });
          return;
        }
      } else {
        // 光标不在文本开头，执行正常的删除行为
        // 不需要特殊处理变量删除
      }
    }
    
    // 默认行为
    deleteBackward(unit);
  };
  
  return editor;
};

// 序列化编辑器内容为纯文本，确保保留变量标识符
const serializeToText = (nodes: Node[]): string => {
  let result = '';
  
  // 遍历节点
  for (const node of nodes) {
    if (SlateElement.isElement(node) && node.type === 'paragraph') {
      // 处理段落节点
      for (const child of node.children) {
        if (SlateElement.isElement(child) && child.type === 'variable') {
          // 变量节点，使用其标识符
          result += child.identifier || '';
        } else if (Text.isText(child)) {
          // 文本节点，直接添加文本
          result += child.text;
        }
      }
    }
  }
  
  return result;
};

// 从文本反序列化为编辑器节点
const deserializeFromText = (text: string): CustomElement[] => {
  if (!text) {
    // 确保空内容情况下至少有一个文本节点，且文本不为空
    return [{ type: 'paragraph', children: [{ text: ' ' }] }];
  }
  
  // 处理文本的工作函数 - 仅内部使用
  const processText = (inputText: string): CustomElement[] => {
    const regex = /@([a-zA-Z0-9_\u4e00-\u9fa5]+)\.([a-zA-Z0-9_]+)(?:#([a-zA-Z0-9]+))?/g;
    
    let lastIndex = 0;
    const children: any[] = [];
    
    let match;
    while ((match = regex.exec(inputText)) !== null) {
      // 添加变量之前的文本
      if (match.index > lastIndex) {
        children.push({
          text: inputText.slice(lastIndex, match.index)
        });
      }
      
      // 添加变量节点
      children.push({
        type: 'variable',
        identifier: match[0],
        sourceName: match[1],
        children: [{ text: ' ' }] // 使用空格而非空字符串
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // 添加最后一段文本
    if (lastIndex < inputText.length) {
      children.push({
        text: inputText.slice(lastIndex)
      });
    }
    
    // 确保children数组非空，且至少包含一个有效文本节点
    if (children.length === 0) {
      children.push({ text: ' ' });
    }
    
    return [{ type: 'paragraph', children }];
  };
  
  // 处理原始文本
  const result = processText(text);
  
  // 异步更新标识符（不阻塞正常渲染）
  setTimeout(async () => {
    try {
      // 尝试更新标识符
      const updatedText = await updateVariableIdentifiers(text);
      
      // 如果文本发生了变化，通知外部组件
      if (updatedText !== text) {
        // 通过自定义事件通知
        const event = new CustomEvent('variable-identifiers-updated', {
          detail: { 
            originalText: text,
            updatedText: updatedText
          },
          bubbles: true
        });
        document.dispatchEvent(event);
        
        console.log('变量标识符已更新:', { from: text, to: updatedText });
      }
    } catch (error) {
      console.error("更新变量标识符时出错:", error);
    }
  }, 0);
  
  return result;
};

// 获取变量类型颜色
const getTypeColor = (type: string): string => {
  switch (type) {
    case 'npc':
      return '#1890FF'; // 蓝色
    case 'task':
      return '#52C41A'; // 绿色
    case 'custom':
      return '#FA8C16'; // 橙色
    case 'file':
      return '#13C2C2'; // 青色
    case 'workflow':
      return '#722ED1'; // 紫色
    case 'ai':
      return '#722ED1'; // 保留AI服务的紫色以兼容现有数据
    default:
      return '#D9D9D9'; // 默认灰色
  }
};

// 格式化变量类型标签
const formatTypeLabel = (type: string): string => {
  switch (type) {
    case 'npc':
      return 'NPC';
    case 'task':
      return '任务';
    case 'custom':
      return '自定义';
    case 'file':
      return '文件';
    case 'workflow':
      return '工作流';
    case 'ai':
      return 'AI服务';
    default:
      return type;
  }
};

interface VariableEditorProps {
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  variables: VariableView[];
  currentTaskName?: string;
}

export interface VariableEditorRef {
  insertVariable: (variable: VariableView) => void;
  updateContent: (content: string) => void;
}

const VariableEditor = forwardRef<VariableEditorRef, VariableEditorProps>(({
  defaultValue = '',
  onChange,
  placeholder,
  minHeight = '150px',
  className,
  variables,
  currentTaskName
}, ref) => {
  // 创建编辑器实例
  const [editor] = useState(() => withVariables(withReact(createEditor())));
  
  // 编辑器内容状态 - 确保初始状态始终有效
  const [value, setValue] = useState<CustomElement[]>(() => {
    try {
      const initialNodes = deserializeFromText(defaultValue);
      // 额外检查：确保初始节点非空且有效
      if (initialNodes.length === 0 || 
          !initialNodes[0].children || 
          initialNodes[0].children.length === 0) {
        console.warn("提供了无效的初始值，使用默认安全值");
        return [{ type: 'paragraph', children: [{ text: ' ' }] }];
      }
      return initialNodes;
    } catch (error) {
      console.error("解析初始值出错，使用默认安全值:", error);
      return [{ type: 'paragraph', children: [{ text: ' ' }] }];
    }
  });
  
  // 变量搜索状态
  const [searchText, setSearchText] = useState('');
  const [showVariableSuggestions, setShowVariableSuggestions] = useState(false);
  const [variableSuggestions, setVariableSuggestions] = useState<VariableView[]>([]);
  // 添加光标位置状态
  const [cursorPosition, setCursorPosition] = useState<{ top: number, left: number } | null>(null);
  
  // 添加编辑器DOM引用
  const editorRef = useRef<HTMLDivElement | null>(null);
  
  // 菜单容器引用
  const menuRef = useRef<HTMLDivElement | null>(null);
  
  // 当前选中项的DOM元素ID
  const getMenuItemId = (index: number) => `variable-menu-item-${index}`;
  
  // 当编辑器内容变化时通知父组件
  useEffect(() => {
    if (onChange) {
      const serialized = serializeToText(value);
      onChange(serialized);
    }
  }, [value, onChange]);
  
  // 更新变量建议列表
  const updateVariableSuggestions = (search: string) => {
    // 从全局变量中筛选，排除当前任务变量
    const filtered = variables.filter(v => {
      // 排除当前任务的变量
      if (currentTaskName && v.sourceName === currentTaskName) return false;
      
      // 根据搜索文本筛选
      if (!search) return true;
      return v.identifier.toLowerCase().includes(search.toLowerCase()) ||
             v.sourceName.toLowerCase().includes(search.toLowerCase());
    });
    
    setVariableSuggestions(filtered);
    return filtered.length > 0;
  };
  
  // 确保编辑器聚焦并准备好光标位置
  const focusEditor = () => {
    try {
      ReactEditor.focus(editor);
      // 如果当前没有选择，则创建一个新的选择点
      if (!editor.selection) {
        try {
          // 找到正文中的最后一个文本节点
          const lastPath = Editor.end(editor, []);
          Transforms.select(editor, lastPath);
        } catch (pathError) {
          console.warn("设置光标位置失败，尝试备用方法:", pathError);
        }
      }
    } catch (error) {
      console.error("编辑器聚焦失败，尝试备用方法:", error);
      
      // 备用聚焦方法：使用DOM API
      try {
        // 尝试获取编辑器DOM节点并使用DOM API聚焦
        const editorDOM = editorRef.current?.querySelector('[contenteditable=true]');
        if (editorDOM) {
          (editorDOM as HTMLElement).focus();
          console.log("使用DOM API备用方法成功聚焦编辑器");
        }
      } catch (domError) {
        console.error("所有聚焦方法均失败:", domError);
      }
    }
  };
  
  // 计算并更新光标位置
  const updateCursorPosition = () => {
    // 获取DOM选择对象
    const domSelection = window.getSelection();
    if (domSelection && domSelection.rangeCount > 0) {
      const range = domSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect) {
        // 获取编辑器的DOM节点
        const editorElement = document.querySelector('[data-slate-editor=true]');
        if (editorElement) {
          const editorRect = editorElement.getBoundingClientRect();
          
          // 获取编辑器容器元素
          const containerElement = editorElement.closest('[role="textbox"]') || editorElement.parentElement;
          const containerRect = containerElement ? containerElement.getBoundingClientRect() : editorRect;
          
          // 计算相对于编辑器容器的位置
          const relativeTop = rect.top - containerRect.top;
          const relativeLeft = rect.left - containerRect.left;
          
          // 计算编辑器内部滚动
          const editorScrollTop = editorElement.scrollTop || 0;
          const editorScrollLeft = editorElement.scrollLeft || 0;
          
          // 添加小的垂直偏移，使菜单刚好出现在光标下方
          const verticalOffset = 5;
          
          // 设置菜单位置，使其紧贴光标位置
          setCursorPosition({
            top: relativeTop + rect.height + verticalOffset - editorScrollTop,
            left: relativeLeft - editorScrollLeft
          });
          
          return true;
        } else {
          // 回退方案：直接使用视口坐标，不考虑容器
          setCursorPosition({
            top: rect.top + rect.height + 5,
            left: rect.left
          });
          return true;
        }
      }
    }
    
    // 如果无法获取当前光标位置，尝试使用编辑器的默认位置
    const editorElement = editorRef.current;
    if (editorElement) {
      const rect = editorElement.getBoundingClientRect();
      // 设置菜单位置在编辑器的顶部中间
      setCursorPosition({
        top: 30, // 编辑器顶部一小段距离
        left: rect.width / 2 - 125, // 居中菜单（菜单宽度的一半）
      });
      return true;
    }
    
    return false;
  };
  
  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    insertVariable: (variable: VariableView) => {
      insertVariable(variable);
    },
    updateContent: (content: string) => {
      // 设置新值到React状态
      const newNodes = deserializeFromText(content);
      setValue(newNodes);
      
      // 关键改动：直接操作Slate编辑器的内部状态
      try {
        // 确保编辑器有效
        if (!editor || !editor.children) {
          console.warn("编辑器实例无效，无法强制更新内容");
          return;
        }
        
        // 在一个操作中执行所有更改，防止不必要的规范化
        Editor.withoutNormalizing(editor, () => {
          // 保存当前选择状态，以便稍后恢复
          const savedSelection = editor.selection;
          
          // 移除所有现有节点
          Transforms.removeNodes(editor, { at: [], match: () => true });
          
          // 插入新内容
          Transforms.insertNodes(editor, newNodes);
          
          // 尝试聚焦编辑器（用try-catch包装，防止出错）
          try {
            ReactEditor.focus(editor);
          } catch (err) {
            console.warn("聚焦编辑器失败，但内容已更新:", err);
          }
        });
        
        console.log("已强制更新编辑器内容");
      } catch (error) {
        console.error("强制更新编辑器内容时出错:", error);
      }
    },
    focusEditor: () => {
      // 实现聚焦编辑器的方法
      try {
        console.log("强制聚焦编辑器");
        
        // 确保编辑器存在
        if (!editor) {
          console.warn("编辑器实例无效，无法聚焦");
          return;
        }
        
        // 使用ReactEditor提供的focus方法聚焦编辑器
        ReactEditor.focus(editor);
        
        // 如果当前没有选择，则创建一个新的选择点（将光标放在末尾）
        if (!editor.selection) {
          // 找到正文中的最后一个位置
          try {
            const lastPath = Editor.end(editor, []);
            Transforms.select(editor, lastPath);
          } catch (error) {
            console.error("设置编辑器光标位置失败:", error);
          }
        }
      } catch (error) {
        console.error("聚焦编辑器失败:", error);
      }
    }
  }));

  // 监听defaultValue变化
  useEffect(() => {
    if (defaultValue) {
      setValue(deserializeFromText(defaultValue));
    }
  }, [defaultValue]);

  // 插入变量标签
  const insertVariable = (variable: VariableView) => {
    // 检查是否为当前任务的变量
    if (currentTaskName && variable.sourceName === currentTaskName) {
      message.warning('不能引用当前任务的变量，这会导致循环引用问题！');
      return;
    }
    
    // 确保编辑器聚焦
    focusEditor();
    
      // 创建变量节点
      const variableNode: CustomElement = {
        type: 'variable',
        identifier: variable.identifier,
        sourceName: variable.sourceName,
        children: [{ text: ' ' }] // 使用空格而非空字符串
      };
    
    try {
      // 首先检查并删除当前光标位置前的@字符
      // 这处理了通过onBeforeInput或手动输入@触发的情况
      const { selection } = editor;
      if (selection && Range.isCollapsed(selection)) {
        const [start] = Range.edges(selection);
        
        // 获取光标前一个字符的位置
        const prevCharPoint = Editor.before(editor, start, { unit: 'character' });
        if (prevCharPoint) {
          // 创建一个范围，仅包含前一个字符
          const prevCharRange = Editor.range(editor, prevCharPoint, start);
          // 获取前一个字符
          const prevChar = Editor.string(editor, prevCharRange);
          
          // 如果前一个字符是@，则删除它
          if (prevChar === '@') {
            Transforms.delete(editor, { at: prevCharRange });
          }
        }
      }
      
      // 删除@及后面的搜索文本（用于搜索场景）
      if (searchText) {
        if (selection && Range.isCollapsed(selection)) {
          const [start] = Range.edges(selection);
          const wordBefore = Editor.before(editor, start, { unit: 'word' });
          const before = wordBefore && Editor.before(editor, wordBefore);
          const beforeRange = before && Editor.range(editor, before, start);
          
          if (beforeRange && Editor.string(editor, beforeRange).startsWith('@')) {
            Transforms.delete(editor, { at: beforeRange });
          }
        }
      }
    } catch (error) {
      console.error("处理@字符删除时出错:", error);
      // 出错时继续执行，不中断变量插入流程
    }
    
    // 保存当前选择状态以便稍后恢复
    const savedSelection = editor.selection ? { ...editor.selection } : null;
    
    // 插入变量节点
    Transforms.insertNodes(editor, variableNode);
    
    // 移动光标到变量节点后的位置
    try {
      const path = savedSelection ? savedSelection.anchor.path : [0, 0];
      const offset = savedSelection ? savedSelection.anchor.offset + 1 : 0;
      
      // 创建变量节点后的位置点
      const point = { path, offset };
      
      // 延迟执行以确保DOM已更新
      setTimeout(() => {
        try {
          // 聚焦编辑器
          ReactEditor.focus(editor);
          
          // 选择变量节点后的位置
          Transforms.select(editor, point);
          
          // 插入空格
          Transforms.insertText(editor, ' ');
        } catch (error) {
          console.error("插入变量后设置光标位置失败:", error);
        }
      }, 10);
    } catch (error) {
      console.error("处理变量节点光标位置失败:", error);
      // 回退：尝试常规的移动操作
      Transforms.move(editor, { distance: 1 });
      Transforms.insertText(editor, ' ');
    }
  };
  
  // 手动显示变量菜单，不依赖于文本检查
  const showVariableMenu = () => {
    // 确保编辑器聚焦
    focusEditor();
    
    // 更新变量列表前重置搜索状态
    setSearchText('');
    
    // 更新建议变量列表
    const hasVariables = updateVariableSuggestions('');
    
    // 获取并设置光标位置
    const positionFound = updateCursorPosition();
    
    // 如果有变量且找到位置，才显示菜单
    if (hasVariables && positionFound) {
      setShowVariableSuggestions(true);
    }
  };
  
  // 处理输入事件，用于捕获首个@符号
  const handleBeforeInput = (event: React.FormEvent<HTMLDivElement>) => {
    const inputEvent = event as unknown as InputEvent;
    
    // 检查是否输入了@符号
    if (inputEvent.data === '@') {
      // 立即显示菜单（不需要阻止默认行为，我们希望@字符被添加到编辑器中）
      setTimeout(showVariableMenu, 0);
    }
  };

  // 处理编辑器onChange事件
  const handleEditorChange = (newValue: CustomElement[]) => {
    setValue(newValue);
    
    // 检查是否在输入@后的文字
    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
      const [start] = Range.edges(selection);
      
      try {
        // 获取当前光标前的文本范围
        const before = Editor.before(editor, start, { unit: 'character' });
        if (before) {
          const range = Editor.range(editor, before, start);
          const text = Editor.string(editor, range);
          
          // 检查最后一个字符是否是@
          if (text === '@') {
            showVariableMenu();
            return;
          }
        }
        
        // 尝试获取更大范围的文本
        const textNode = Node.get(editor, start.path);
        const nodeText = Text.isText(textNode) ? textNode.text : '';
        
        // 如果文本中包含@，则进一步处理
        if (nodeText.includes('@')) {
          const wordBefore = Editor.before(editor, start, { unit: 'word' });
          const before = wordBefore && Editor.before(editor, wordBefore);
          const beforeRange = before && Editor.range(editor, before, start);
          const beforeText = beforeRange && Editor.string(editor, beforeRange);
          
          // 如果是@开头，更新搜索文本和变量建议
          if (beforeText && beforeText.includes('@')) {
            const atIndex = beforeText.lastIndexOf('@');
            const search = beforeText.slice(atIndex + 1);
            setSearchText(search);
            updateVariableSuggestions(search);
            updateCursorPosition(); // 更新光标位置
            setShowVariableSuggestions(true); // 确保菜单显示
            return;
          }
        }
      } catch (error) {
        console.error("处理编辑器更改时出错:", error);
      }
    }
    
    // 不在@搜索状态，隐藏建议
    setShowVariableSuggestions(false);
  };
  
  // 添加选中变量状态
  const [selectedVariableIndex, setSelectedVariableIndex] = useState(0);
  
  // 每次显示建议菜单时重置选中索引
  useEffect(() => {
    if (showVariableSuggestions) {
      setSelectedVariableIndex(0);
    }
  }, [showVariableSuggestions, searchText]);
  
  // 当选中的菜单项改变时，确保它在可视区域内
  useEffect(() => {
    if (showVariableSuggestions && menuRef.current) {
      const menuItem = document.getElementById(getMenuItemId(selectedVariableIndex));
      if (menuItem) {
        // 使用scrollIntoView确保当前选中项可见
        menuItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedVariableIndex, showVariableSuggestions]);
  
  // 处理键盘事件
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // 如果正在显示变量建议
    if (showVariableSuggestions && variableSuggestions.length > 0) {
      // 处理选择变量的交互
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        // 实现下移选择，循环到第一个
        setSelectedVariableIndex(prevIndex => 
          prevIndex >= variableSuggestions.length - 1 ? 0 : prevIndex + 1
        );
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        // 实现上移选择，循环到最后一个
        setSelectedVariableIndex(prevIndex => 
          prevIndex <= 0 ? variableSuggestions.length - 1 : prevIndex - 1
        );
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        // 插入当前选中的变量
        insertVariable(variableSuggestions[selectedVariableIndex]);
        setShowVariableSuggestions(false);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setShowVariableSuggestions(false);
      }
    } else if (event.key === '@') {
      // 用户输入@，直接调用显示菜单函数
      // 注意: 我们不阻止默认行为，因为我们希望@字符被添加到编辑器中
      setTimeout(showVariableMenu, 0);
    }
  };
  
  // 自定义元素渲染
  const renderElement = useCallback((props: any) => {
    switch (props.element.type) {
      case 'variable':
        return (
          <span
            {...props.attributes}
            style={{
              backgroundColor: '#F0F7FF',
              border: '1px solid #D0E8FF',
              borderRadius: '4px',
              padding: '2px 8px',
              margin: '0 2px',
              color: '#0F56B3',
              fontFamily: 'inherit', // 使用全局字体
              fontSize: '13px',
              cursor: 'default',
              display: 'inline-flex', // 改为inline-flex，更好地容纳子元素
              alignItems: 'center', // 垂直居中
              userSelect: 'all', // 确保整体选择
              position: 'relative', // 相对定位用于绝对定位子元素
              pointerEvents: 'auto' // 确保事件处理正确
            }}
            data-identifier={props.element.identifier}
            data-slate-variable="true" // 添加标记以便事件处理
            contentEditable={false} // 强调该元素不可编辑
            draggable={false} // 禁止拖拽
          >
            {(() => {
              try {
                // 安全地拆分标识符为主体和ID部分
                const identifier = props.element.identifier || '';
                const parts = identifier.split('#');
                const mainPart = parts[0] || '';
                const idPart = parts.length > 1 ? `#${parts[1]}` : '';
                
                return (
                  <>
                    <span className="variable-main-part">{mainPart}</span>
                    {idPart && <span className="variable-id-part" style={{ opacity: 0.3 }}>{idPart}</span>}
                  </>
                );
              } catch (error) {
                console.error("渲染变量标签时出错:", error);
                return <span>Variable</span>; // 提供备用显示
              }
            })()}
            {props.children}
          </span>
        );
      default:
        return <div {...props.attributes}>{props.children}</div>;
    }
  }, []);
  
  // 变量建议下拉菜单
  const renderVariableSuggestions = () => {
    if (!showVariableSuggestions || variableSuggestions.length === 0) {
      return null;
    }
    
    return (
      <div
        ref={menuRef}
        className="variable-suggestion-menu"
        style={{
          position: 'absolute',
          zIndex: 1000, // 提高z-index确保在其他内容之上
          backgroundColor: '#fff',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          boxShadow: '0 3px 6px -4px rgba(0,0,0,0.12), 0 6px 16px 0 rgba(0,0,0,0.08)',
          maxHeight: '300px',
          overflow: 'auto',
          width: '250px',
          animation: 'fadeIn 0.2s', // 添加淡入动画
          transform: 'translateY(0)',
          // 使用光标位置定位菜单
          ...(cursorPosition ? {
            top: `${cursorPosition.top}px`,
            left: `${cursorPosition.left}px`,
          } : {})
        }}
      >
        <Menu>
          {variableSuggestions.map((variable, index) => (
            <Menu.Item 
              key={variable.id}
              id={getMenuItemId(index)}
              onClick={() => {
                insertVariable(variable);
                setShowVariableSuggestions(false);
              }}
              style={{ 
                padding: '4px 8px',  // 减小菜单项的内边距，使行与行更紧凑
                backgroundColor: index === selectedVariableIndex 
                  ? '#f0f7ff' // 高亮选中项
                  : 'transparent',
                transition: 'background-color 0.2s'
              }} 
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 'normal' }}>
                  {(() => {
                    // 拆分标识符为主体和ID部分
                    const parts = variable.identifier.split('#');
                    const mainPart = parts[0];
                    const idPart = parts.length > 1 ? `#${parts[1]}` : '';
                    
                    return (
                      <>
                        {mainPart}
                        <span style={{ opacity: 0.3 }}>{idPart}</span>
                      </>
                    );
                  })()}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#666' }}>{variable.sourceName}</span>
                  <Tag 
                    style={{ 
                      fontSize: '10px',
                      margin: 0,
                      backgroundColor: '#FFFFFF',
                      color: getTypeColor(variable.type),
                      border: `1px solid ${getTypeColor(variable.type)}`
                    }}
                  >
                    {formatTypeLabel(variable.type)}
                  </Tag>
                </div>
              </div>
            </Menu.Item>
          ))}
        </Menu>
      </div>
    );
  };
  
  // 跟踪焦点状态
  const [isFocused, setIsFocused] = useState<boolean>(false);
  
  // 处理焦点事件
  const handleFocus = () => {
    setIsFocused(true);
    // 触发聚焦时，通知父组件此编辑器被聚焦
    // 可以通过DOM事件发送信号
    const customEvent = new CustomEvent('editor-focused', {
      bubbles: true,
      detail: { editorId: ref }
    });
    document.dispatchEvent(customEvent);
  };
  
  // 处理失焦事件
  const handleBlur = () => {
    setIsFocused(false);
  };
  
  return (
    <div 
      ref={editorRef}
      className={className} 
      style={{ 
        position: 'relative', 
        border: isFocused ? '1px solid #1890ff' : '1px solid #d9d9d9', 
        borderRadius: '4px', 
        padding: '4px 11px',
        transition: 'all 0.3s',
        boxShadow: isFocused ? '0 0 0 2px rgba(24, 144, 255, 0.2)' : 'none'
      }}
    >
      <Slate
        editor={editor}
        initialValue={value}
        onChange={(newValue: Descendant[]) => handleEditorChange(newValue as CustomElement[])}
      >
        <Editable
          renderElement={renderElement}
          onKeyDown={handleKeyDown}
          onBeforeInput={handleBeforeInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          style={{ 
            minHeight,
            outline: 'none' // 去除默认的聚焦边框
          }}
        />
      </Slate>
      {renderVariableSuggestions()}
    </div>
  );
});

export default VariableEditor;

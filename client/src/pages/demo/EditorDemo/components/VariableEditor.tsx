import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { Button, Card, Space, message } from 'antd';
import { Variable } from '../extensions/Variable';
import { VariableSuggestion } from '../extensions/VariableSuggestion';
import VariableSuggestionList, { VariableItem } from './VariableSuggestionList';
import './VariableSuggestionList.css';
import { variableService, VariableType } from '../../../../services/variableService';

interface VariableEditorProps {
  initialContent?: string;
  readOnly?: boolean;
  onChange?: (content: string) => void;
}

// 转换API变量到VariableItem格式
const convertToVariableItem = (apiVar: any): VariableItem => {
  return {
    id: apiVar.id,
    identifier: apiVar.identifier,
    sourceName: apiVar.source?.name || '系统变量',
    type: apiVar.type,
    value: apiVar.value,
  };
};

const VariableEditor: React.FC<VariableEditorProps> = ({
  initialContent = '<p>在此输入文本，使用@符号触发变量选择</p>',
  readOnly = false,
  onChange,
}) => {
  const [variables, setVariables] = useState<VariableItem[]>([]);
  const [content, setContent] = useState<string>(initialContent);
  const [loading, setLoading] = useState<boolean>(false);
  const suggestionsRef = useRef<any>(null);
  
  // 从API获取变量
  useEffect(() => {
    const fetchVariables = async () => {
      try {
        setLoading(true);
        const response = await variableService.getVariables();
        if (response && response.data && Array.isArray(response.data)) {
          const apiVariables = response.data.map(convertToVariableItem);
          setVariables(apiVariables);
        } else {
          console.warn('获取到的变量数据不是有效数组:', response);
          // 设置一些默认变量用于测试
          setVariables([
            {
              id: '1',
              identifier: 'npc.name',
              sourceName: '主角',
              type: 'npc',
              value: '张三',
            },
            {
              id: '2',
              identifier: 'task.title',
              sourceName: '任务1',
              type: 'task',
              value: '探索森林',
            },
            {
              id: '3',
              identifier: 'custom.weather',
              sourceName: '自定义变量',
              type: 'custom',
              value: '晴天',
            }
          ]);
        }
      } catch (error) {
        console.error('获取变量失败:', error);
        message.error('无法加载变量列表');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVariables();
  }, []);

  // 变量建议处理逻辑
  const variableSuggestion = {
    items: ({ query }: { query: string }) => {
      // 过滤变量列表
      return variables.filter((item) =>
        item.identifier.toLowerCase().includes(query.toLowerCase())
      );
    },
    render: () => {
      let component: any;
      let popup: any;

      return {
        onStart: (props: any) => {
          component = new VariableSuggestionsRenderer({
            ...props,
            onSelectItem: (item: VariableItem) => {
              props.command(item);
            },
          });

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });

          suggestionsRef.current = { component, popup };
        },
        onUpdate(props: any) {
          component.updateProps({
            ...props,
            onSelectItem: (item: VariableItem) => {
              props.command(item);
            },
          });

          popup[0].setProps({
            getReferenceClientRect: props.clientRect,
          });
        },
        onKeyDown(props: any) {
          if (props.event.key === 'Escape') {
            popup[0].hide();
            return true;
          }

          return component.ref?.onKeyDown(props) || false;
        },
        onExit() {
          popup[0].destroy();
          component.element.remove();
        },
      };
    },
  };

  // 初始化编辑器
  const editor = useEditor({
    extensions: [
      StarterKit,
      Variable,
      VariableSuggestion.configure({
        suggestion: variableSuggestion,
      }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setContent(html);
      onChange?.(html);
    },
  });

  // 插入变量的辅助方法
  const insertVariable = (variable: VariableItem) => {
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
    }
  };

  // 添加变量示例按钮处理函数
  const handleAddSampleVariable = () => {
    if (editor) {
      const variable = variables[Math.floor(Math.random() * variables.length)];
      insertVariable(variable);
    }
  };

  // 获取HTML按钮处理函数
  const handleGetHTML = () => {
    if (editor) {
      console.log('HTML 内容:', editor.getHTML());
      alert('HTML 内容已打印到控制台');
    }
  };

  // 获取JSON按钮处理函数
  const handleGetJSON = () => {
    if (editor) {
      console.log('JSON 内容:', editor.getJSON());
      alert('JSON 内容已打印到控制台');
    }
  };

  // 清空编辑器按钮处理函数
  const handleClear = () => {
    if (editor) {
      editor.commands.clearContent();
    }
  };

  return (
    <Card title="变量富文本编辑器" style={{ width: '100%' }}>
      <div className="editor-container">
        <EditorContent editor={editor} className="editor-content" />
        
        {!readOnly && (
          <div className="editor-toolbar">
            <Space>
              <Button onClick={handleAddSampleVariable}>插入随机变量</Button>
              <Button onClick={handleGetHTML}>获取HTML</Button>
              <Button onClick={handleGetJSON}>获取JSON</Button>
              <Button onClick={handleClear}>清空</Button>
            </Space>
          </div>
        )}
      </div>
      
      <style>
        {`
          .editor-container {
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            overflow: hidden;
          }
          .editor-content {
            padding: 10px;
            min-height: 200px;
          }
          .editor-toolbar {
            padding: 8px;
            border-top: 1px solid #d9d9d9;
            background-color: #fafafa;
          }
        `}
      </style>
    </Card>
  );
};

// 变量建议渲染器辅助类
class VariableSuggestionsRenderer {
  element: HTMLElement;
  ref: React.RefObject<any> | null = null;

  constructor(props: any) {
    this.element = document.createElement('div');
    this.element.className = 'suggestions-wrapper';
    this.updateProps(props);
  }

  updateProps(props: any) {
    const root = React.createElement(VariableSuggestionList, {
      ...props,
      items: props.items,
      command: (item: VariableItem) => {
        props.onSelectItem(item);
      },
      ref: (ref: React.RefObject<any>) => {
        this.ref = ref;
      },
    });

    // @ts-ignore
    require('react-dom').render(root, this.element);
  }
}

export default VariableEditor;

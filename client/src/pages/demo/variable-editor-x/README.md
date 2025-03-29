# 变量编辑器X（VariableEditorX）v1.1 重构文档

## 重构目标

1. 解决HTML渲染问题：修复变量标签没有正确渲染的问题
2. 提高代码可维护性：将大型组件拆分为职责明确的小组件
3. 降低组件复杂度：减少单个文件的代码量，提高可读性
4. 优化数据流：简化数据流向，减少循环依赖

## 架构改进

重构后的代码采用了模块化设计，将功能拆分为以下几个主要组件：

### 核心组件

- **VariableEditorX.tsx**: 主入口组件，负责组合各个子组件和提供公共API
- **EditorCore.tsx**: 编辑器核心组件，负责基础的TipTap编辑器功能

### 管理器 (Managers)

- **VariableNodeManager.ts**: 管理变量节点的创建、同步和修复
- **ContentFormatManager.ts**: 处理不同格式(HTML、JSON、rawText)之间的转换
- **StateManager.ts**: 管理编辑器状态和事件

### 辅助组件

- **PreviewModal.tsx**: 显示变量解析后的内容预览
- **EditorToolbar.tsx**: 编辑器工具栏
- **DebugPanel.tsx**: 调试面板
- **VariableSelectorModal.tsx**: 变量选择模态窗口

### 扩展 (Extensions)

- **Variable.ts**: 变量节点扩展，重构了HTML渲染逻辑以解决渲染问题
- **VariableSuggestion.ts**: 变量建议扩展

## 关键改进

### 1. HTML渲染修复

在`Variable.ts`中，完全重写了`renderHTML`方法，确保变量标签能够正确渲染：

- 确保所有必要的数据属性都被正确设置
- 提供明确的样式属性
- 增强了从JSON加载时的属性保留逻辑

### 2. 变量节点管理

引入了`VariableNodeManager`类，专门处理变量节点的同步和修复：

- 增加了修复次数限制和冷却时间，防止无限循环修复
- 改进了单标签修复逻辑，确保DOM属性和样式正确应用
- 完善了标签数量不匹配时的处理逻辑

### 3. 内容格式转换

创建了`ContentFormatManager`类，专门处理不同格式之间的转换：

- HTML ⇔ JSON ⇔ 纯文本之间的相互转换
- 自动检测内容类型
- 保留变量标识符

### 4. 状态管理

引入了`StateManager`类，负责管理编辑器状态：

- 管理编辑器状态和事件
- 提供回调机制
- 与变量事件服务集成，响应变量变更

## 使用指南

### 基本使用

```tsx
import React, { useRef } from 'react';
import { VariableEditorX, VariableEditorXRef } from './path/to/variable-editor-x';

const MyComponent = () => {
  const editorRef = useRef<VariableEditorXRef>(null);
  
  // 获取内容
  const handleGetContent = () => {
    const html = editorRef.current?.getContent();
    console.log('HTML内容:', html);
  };
  
  return (
    <div>
      <VariableEditorX
        ref={editorRef}
        initialContent="<p>初始内容</p>"
        onChange={(content) => console.log('内容变更:', content)}
        onVariableInsert={(variable) => console.log('插入变量:', variable)}
        toolbar={true}
        debug={false}
      />
      <button onClick={handleGetContent}>获取内容</button>
    </div>
  );
};

export default MyComponent;
```

### 高级配置

```tsx
<VariableEditorX
  initialContent="<p>高级配置示例</p>"
  readOnly={false}
  placeholder="在此输入文本，使用@符号触发变量选择"
  toolbar={{
    showInsertVariable: true,
    showPreview: true,
    showVersion: false,
    customButtons: <button>自定义按钮</button>
  }}
  debug={true}
  className="custom-editor"
  style={{ height: '300px' }}
/>
```

### API参考

#### 属性

| 属性 | 类型 | 描述 |
|------|------|------|
| initialContent | string | 初始内容，支持HTML、JSON或纯文本 |
| readOnly | boolean | 是否只读模式 |
| onChange | (content: string) => void | 内容变更回调 |
| onVariableInsert | (variable: VariableData) => void | 变量插入回调 |
| placeholder | string | 占位文本 |
| toolbar | boolean \| ToolbarConfig | 工具栏配置 |
| debug | boolean | 是否显示调试面板 |
| className | string | 自定义CSS类名 |
| style | React.CSSProperties | 内联样式 |

#### 方法 (通过ref访问)

| 方法 | 返回类型 | 描述 |
|------|------|------|
| insertVariable | void | 插入变量 |
| getContent | string | 获取HTML内容 |
| getRawText | string | 获取原始文本 |
| getResolvedContent | Promise<string> | 获取解析后内容 |
| focusEditor | void | 聚焦编辑器 |
| clearContent | void | 清空内容 |
| getUsedVariables | VariableData[] | 获取使用的变量 |

## 后续优化方向

1. **性能优化**：进一步优化变量节点的同步逻辑，减少不必要的DOM操作
2. **测试覆盖**：增加单元测试和集成测试
3. **拓展API**：提供更多定制选项和回调函数
4. **主题支持**：增强主题定制能力
5. **辅助工具**：提供更多调试和开发工具

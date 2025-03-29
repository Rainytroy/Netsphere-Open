# 变量编辑器VariableEditorX功能设计

**版本**: 1.0.0  
**创建日期**: 2025年3月23日  
**文档状态**: 设计阶段  

## 1. 内容格式设计

VariableEditorX需要处理三种不同的内容格式，各自有不同的用途和特点。这种多格式设计能够在保持引用稳定性的同时，提供良好的用户体验。

### 1.1 HTML格式

HTML格式用于编辑器内部展示，包含变量标签的完整样式和属性。

**特点**：
- 包含变量标签的视觉表现形式
- 保存变量的所有属性（ID、字段、类型等）
- 支持富文本编辑功能

**示例**：
```html
<p>我是<span data-variable="" data-id="f9c17d21-a0a0-476f-973e-433e08f7be38" data-field="actlv" data-identifier="@gv_f9c17d21-a0a0-476f-973e-433e08f7be38_actlv" data-type="npc" class="variable-tag variable-type-npc" contenteditable="false">@云透.actlv#f9c1</span>，我想知道<span data-variable="" data-id="1742290165880" data-field="value" data-identifier="@gv_1742290165880_value" data-type="custom" class="variable-tag variable-type-custom" contenteditable="false">@测试用.value#5880</span></p>
```

**用途**：
- 编辑器内部展示和编辑
- 用户交互界面显示
- 临时保存状态

### 1.2 系统标识符格式（rawtext）

系统标识符格式（rawtext）是一种纯文本格式，只包含系统标识符，没有HTML标签和样式信息。

**特点**：
- 基于UUID的标识符格式（`@gv_UUID_field`）
- 不受变量源名称变更影响
- 体积更小，更适合存储和传输

**示例**：
```
我是@gv_f9c17d21-a0a0-476f-973e-433e08f7be38_actlv，我想知道@gv_1742290165880_value
```

**用途**：
- 数据存储和传输
- 系统间通信
- 长期持久化存储

### 1.3 解析格式

解析格式是将变量标识符替换为实际值的文本格式，用于最终呈现给用户。

**特点**：
- 纯文本格式，没有标记或标识符
- 变量引用被替换为实际值
- 最终用户可读的格式

**示例**：
```
我是有趣的事情就可以驱动我，我想知道我是谁
```

**用途**：
- 最终内容展示
- 文本预览
- 内容发布

### 1.4 格式转换

在不同格式之间进行转换是编辑器的关键功能：

#### 1.4.1 HTML格式 → rawtext格式
```typescript
// 基本实现思路
function htmlToRawText(html: string): string {
  // 创建临时DOM元素解析HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // 查找所有变量标签
  const variableTags = tempDiv.querySelectorAll('span[data-variable]');
  
  // 替换为系统标识符
  variableTags.forEach(tag => {
    const identifier = tag.getAttribute('data-identifier');
    if (identifier) {
      const textNode = document.createTextNode(identifier);
      tag.parentNode?.replaceChild(textNode, tag);
    }
  });
  
  return tempDiv.textContent || '';
}
```

#### 1.4.2 rawtext格式 → HTML格式
```typescript
// 基本实现思路
async function rawTextToHtml(text: string): Promise<string> {
  // 匹配系统标识符
  const regex = /@gv_[a-zA-Z0-9-]+_[a-zA-Z0-9_]+/g;
  let result = text;
  
  // 获取匹配的系统标识符
  const matches = text.match(regex) || [];
  
  for (const match of matches) {
    // 查找变量信息
    const variable = await getVariableByIdentifier(match);
    
    if (variable) {
      // 构建变量标签HTML
      const tagHtml = `<span data-variable="" data-id="${variable.id}" data-field="${variable.field}" data-identifier="${match}" data-type="${variable.sourceType}" class="variable-tag variable-type-${variable.sourceType}" contenteditable="false">${variable.displayIdentifier}</span>`;
      
      // 替换文本中的标识符
      result = result.replace(match, tagHtml);
    }
  }
  
  return result;
}
```

#### 1.4.3 rawtext格式 → 解析格式
```typescript
// 基本实现思路
async function rawTextToResolvedText(text: string): Promise<string> {
  // 匹配系统标识符
  const regex = /@gv_[a-zA-Z0-9-]+_[a-zA-Z0-9_]+/g;
  let result = text;
  
  // 获取匹配的系统标识符
  const matches = text.match(regex) || [];
  
  for (const match of matches) {
    // 查找变量值
    const variable = await getVariableByIdentifier(match);
    
    if (variable && variable.value) {
      // 替换为变量值
      result = result.replace(match, variable.value);
    } else {
      // 变量不存在或无值时的处理
      result = result.replace(match, `[未找到: ${match}]`);
    }
  }
  
  return result;
}
```

### 1.5 存储策略

基于对三种格式的分析，我们确定使用系统标识符格式（rawtext）作为存储和传输的标准格式，原因如下：

1. **稳定性**：系统标识符基于UUID，不受变量源名称变更影响
2. **紧凑性**：相比HTML格式，体积更小，更适合存储和传输
3. **时效性**：解析格式随变量值变化而变化，不适合持久化存储
4. **灵活性**：可以根据需要随时生成HTML格式或解析格式

## 2. 核心功能设计

### 2.1 编辑器基础功能

#### 2.1.1 文本编辑

基于TipTap编辑器框架实现基础的文本编辑功能：

- 文本输入与删除
- 复制和粘贴
- 光标定位
- 文本选择
- 基本格式化（段落、列表等）

为保持简洁，不包含复杂的富文本功能如表格、图片等。

#### 2.1.2 只读模式

支持只读模式，适用于内容展示场景：

- 禁用编辑功能
- 保持变量标签的样式和交互（如悬停提示）
- 允许内容选择和复制

#### 2.1.3 占位符

当编辑器为空时显示占位文本：

- 默认占位文本："在此输入文本，使用@符号触发变量选择"
- 支持自定义占位文本
- 编辑器聚焦或有内容时自动隐藏

### 2.2 变量选择与插入

#### 2.2.1 触发方式

提供两种触发变量选择的方式：

1. **@符号触发**
   - 用户输入@字符时自动触发
   - 使用TipTap的Suggestion扩展实现
   - 支持过滤与搜索

2. **工具栏按钮触发**
   - 点击"插入变量"按钮触发
   - 在当前光标位置显示变量选择器
   - 适用于触屏设备或不便输入@符号的场景

#### 2.2.2 变量选择界面

变量选择界面设计：

- 紧贴光标位置显示
- 支持滚动浏览变量列表
- 支持按变量名称或来源搜索
- 显示变量的类型、来源和字段信息
- 鼠标或键盘导航选择

变量条目显示格式为：

```
@sourceName.field#id（标签样式）
变量来源            变量类型
```

每个变量条目使用对应类型的颜色，与变量标签保持一致。

#### 2.2.3 变量标签实现

变量插入后在编辑器中以标签形式显示：

- 使用自定义Node扩展实现
- 标签内显示友好的标识符格式（`@sourceName.field#shortId`）
- 根据变量类型使用不同颜色
- 设置为atomic节点，作为整体处理
- 标签内容不可编辑，但可整体删除

标签样式设计：

```css
.variable-tag {
  display: inline-flex;
  align-items: center;
  padding: 0 4px;
  margin: 0 1px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  color: white;
  cursor: default;
  user-select: none;
}

.variable-type-npc { background-color: #1890FF; }
.variable-type-task { background-color: #389E0D; }
.variable-type-workflow { background-color: #722ED1; }
.variable-type-custom { background-color: #FA8C16; }
.variable-type-file { background-color: #13C2C2; }
.variable-type-system { background-color: #595959; }
```

标签悬停提示显示变量的详细信息：

- 完整系统标识符
- 变量来源
- 变量类型
- 字段名称
- 变量值（如果可用）

### 2.3 工具栏功能

#### 2.3.1 变量插入按钮

"输入@或点击插入变量"按钮：

- 点击后在光标位置显示变量选择器
- 显示提示文本，指导用户使用
- 适当的视觉反馈（如悬停效果）

#### 2.3.2 显示解析值按钮

"显示解析值"按钮：

- 点击后显示模态窗口
- 窗口中显示文本的解析格式（变量被替换为实际值）
- 提供复制按钮和关闭按钮

#### 2.3.3 版本号显示

在工具栏右侧显示版本号：

- 格式为"VariableEditorX 1.0"
- 使用小号字体，不干扰主要功能
- 帮助识别编辑器版本

### 2.4 内容处理

#### 2.4.1 内容初始化

编辑器支持多种格式的初始内容：

- HTML格式：直接使用
- rawtext格式：自动转换为HTML格式
- 空内容：显示占位符

#### 2.4.2 粘贴处理

增强粘贴功能，支持识别和转换变量标识符：

- 纯文本粘贴：检测并转换系统标识符为变量标签
- HTML内容粘贴：保留原始格式，处理其中的变量标签
- 混合内容：先解析HTML结构，再处理其中的文本节点

粘贴处理流程：

1. 拦截粘贴事件
2. 解析粘贴内容
3. 检测是否包含系统标识符
4. 转换标识符为变量标签
5. 插入处理后的内容

#### 2.4.3 导出功能

支持多种格式的内容导出：

- HTML格式：完整的编辑器内容，包含变量标签
- rawtext格式：只包含系统标识符的纯文本
- 解析格式：变量被替换为实际值的纯文本

### 2.5 状态管理

#### 2.5.1 内部状态

编辑器内部状态管理：

- 使用React状态管理编辑器配置
- 使用TipTap内部状态管理编辑器内容
- 使用自定义Hook管理变量数据

关键状态包括：

- 编辑器内容
- 是否聚焦
- 是否只读
- 变量选择状态
- 加载状态

#### 2.5.2 外部API

通过ref暴露编辑器API，包括：

- `insertVariable(variable)`: 插入变量
- `getContent()`: 获取HTML内容
- `getRawText()`: 获取系统标识符格式内容
- `getResolvedContent()`: 获取解析后内容
- `focusEditor()`: 聚焦编辑器
- `clearContent()`: 清空内容
- `getUsedVariables()`: 获取使用的变量

#### 2.5.3 事件回调

支持外部事件回调：

- `onChange(content)`: 内容变更事件
- `onVariableInsert(variable)`: 变量插入事件
- `onFocus()`: 聚焦事件
- `onBlur()`: 失焦事件

## 3. 测试面板设计

### 3.1 格式显示

提供四种格式显示功能，便于测试和调试：

#### 3.1.1 HTML格式显示

显示编辑器的HTML原始内容：

- 包含完整的HTML标签
- 使用代码格式显示
- 提供复制按钮

#### 3.1.2 JSON格式显示

显示编辑器的JSON结构：

- TipTap节点的完整JSON表示
- 使用代码格式显示，支持语法高亮
- 便于调试节点结构

#### 3.1.3 rawText格式显示

显示系统标识符格式的内容：

- 只包含文本和系统标识符
- 没有HTML标签和样式信息
- 用于验证导出结果

#### 3.1.4 解析格式显示

显示变量解析后的内容：

- 变量被替换为实际值
- 纯文本格式
- 用于验证最终呈现效果

### 3.2 调试功能

#### 3.2.1 变量列表

显示编辑器中使用的变量列表：

- 变量标识符
- 变量类型和来源
- 变量字段和值

#### 3.2.2 编辑器状态

显示编辑器的状态信息：

- 是否聚焦
- 光标位置
- 选择范围
- 是否只读

#### 3.2.3 日志输出

提供详细的操作日志：

- 变量插入事件
- 内容变更事件
- 格式转换操作
- 错误信息

### 3.3 存储功能

#### 3.3.1 本地存储

使用本地存储实现内容的保存和加载：

- 保存为rawtext格式
- 使用localStorage或indexedDB存储
- 支持多个预设内容

#### 3.3.2 操作按钮

提供以下操作按钮：

- **保存**：将当前内容保存到本地存储
- **加载**：从本地存储加载内容
- **重置**：清空编辑器内容
- **示例**：加载预设的示例内容

## 4. 用户交互设计

### 4.1 编辑体验

优化编辑体验，提供流畅的交互：

- 变量标签作为整体处理，不可编辑内部
- 光标可以定位到变量标签前后
- 支持通过键盘删除变量标签
- 变量标签不会影响文本对齐

### 4.2 视觉反馈

提供适当的视觉反馈：

- 编辑器聚焦时边框高亮
- 变量标签悬停时显示提示
- 按钮交互反馈（悬停、点击效果）
- 加载状态指示器

### 4.3 键盘支持

增强键盘支持，提高操作效率：

- 输入@触发变量选择
- 使用方向键导航变量列表
- 回车键选择变量
- Esc键关闭变量选择器

### 4.4 错误处理

优化错误处理，提高用户体验：

- 变量不存在时显示友好提示
- API错误时提供重试机制
- 限制变量选择器高度，避免遮挡内容
- 提供清晰的错误信息

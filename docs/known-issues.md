# Netsphere 已知问题记录

本文档记录Netsphere项目中已知的问题，按优先级分类并追踪修复状态。

## 问题跟踪格式

每个问题记录包含以下信息:
- **ID**: 问题唯一标识符
- **报告日期**: 问题首次报告的日期
- **状态**: 新建/进行中/已修复/已验证/关闭
- **严重程度**: 阻断/严重/一般/轻微
- **优先级**: 高/中/低
- **影响模块**: 问题影响的功能模块
- **问题描述**: 详细说明问题的现象
- **复现步骤**: 如何重现这个问题
- **根本原因**: 导致问题的技术原因分析
- **修复方案**: 推荐的解决方法
- **相关文件**: 需要修改的文件列表

---

## 工作流模块问题

### ISSUE-006: 点击添加卡片无法显示在画布中

- **报告日期**: 2025-03-14
- **状态**: 新建
- **严重程度**: 严重
- **优先级**: 高
- **影响模块**: 工作流模块 / 工作流编辑器

**问题描述**:  
在工作流编辑器中，通过点击左侧卡片选择器中的卡片，无法将其添加到画布中。尽管点击操作会触发成功消息提示，但画布上并未显示新添加的节点。相比之下，通过拖拽方式可能能够成功添加卡片到画布。

**复现步骤**:
1. 进入工作流编辑页面
2. 点击左侧"卡片选择器"中的任意卡片
3. 观察到消息提示"已添加xxx到画布中心"
4. 但画布上没有实际显示添加的节点

**根本原因**:  
可能的原因包括：
1. WorkflowEditor.tsx中的handleCardSelect函数依赖数组可能导致闭包问题，使用的是旧的nodes引用
2. WorkflowEditor和FlowCanvas之间的数据流存在问题，React状态更新是异步的，回调可能在状态实际更新前就被调用
3. setNodes和handleNodesChange之间可能存在时序或通信问题

**修复方案**:
需要调整handleCardSelect函数的实现:
1. 确保依赖数组正确捕获所有必要依赖
2. 考虑使用函数式更新来避免闭包问题：setNodes(prev => [...prev, newNode])
3. 确保FlowCanvas组件能够接收到更新后的节点

**相关文件**:
- `client/src/components/workflow/WorkflowEditor.tsx`
- `client/src/components/workflow/FlowCanvas.tsx`

### ISSUE-007: 工作流保存功能不能正确保存画布内容

- **报告日期**: 2025-03-14
- **状态**: 新建
- **严重程度**: 严重
- **优先级**: 高
- **影响模块**: 工作流模块 / 数据保存

**问题描述**:  
在工作流编辑器中，即使修改了后端接口支持metadata参数，工作流的节点和连接信息仍然无法正确保存。保存后再次打开工作流，画布为空，之前编辑的内容丢失。

**复现步骤**:
1. 进入工作流编辑页面
2. 添加一些卡片到画布（通过拖拽方式）
3. 点击"保存"按钮
4. 退出编辑页面，再次打开同一工作流
5. 观察到画布为空，之前添加的卡片不见了

**根本原因**:  
虽然前端在保存时包含了metadata字段，并尝试将节点和边数据序列化为JSON字符串，但可能存在以下问题：
1. WorkflowEditor中的加载逻辑不完整，无法从保存的metadata中恢复节点和边数据
2. 序列化或反序列化过程中可能存在格式不匹配的问题
3. 数据存储和加载路径可能存在中断

**修复方案**:
1. 完善WorkflowEditor中的加载逻辑，确保能从workflow.metadata中提取和恢复节点和边数据
2. 确保保存和加载时使用一致的序列化/反序列化格式
3. 添加调试日志，验证数据流的各个环节

**相关文件**:
- `client/src/components/workflow/WorkflowEditor.tsx`
- `client/src/pages/workflow/WorkflowEditPage.tsx`

### ISSUE-008: 前端服务TypeScript类型警告

- **报告日期**: 2025-03-14
- **状态**: 新建
- **严重程度**: 轻微
- **优先级**: 低
- **影响模块**: 工作流模块 / 类型系统

**问题描述**:  
workflowService.ts文件中多个方法存在TypeScript类型警告：`Type 'unknown' is not assignable to type '[具体类型]'`。这些警告不影响实际功能，但降低了代码质量和类型安全性。

**复现步骤**:
1. 查看TypeScript编译器输出或IDE警告
2. 观察到多个关于workflowService.ts文件的类型警告

**根本原因**:  
Axios的响应对象中的data属性默认被TypeScript视为unknown类型，但workflowService中的各方法声明了具体的返回类型（如Workflow、WorkflowNode[]等）。直接返回response.data时没有进行类型断言，导致类型不兼容错误。

**修复方案**:
有几种解决方案：
1. 为每个响应单独添加类型断言: `return response.data as Workflow;`
2. 使用泛型参数为Axios请求指定返回类型: `const response = await axios.get<Workflow>(...);`
3. 创建一个包装函数处理所有请求，统一进行类型转换

**相关文件**:
- `client/src/services/workflowService.ts`

### ISSUE-009: 变量标识符更新与删除问题

- **报告日期**: 2025-03-15
- **状态**: 新建
- **严重程度**: 一般
- **优先级**: 中
- **影响模块**: 变量系统 / 编辑器组件

**问题描述**:  
当变量名称被修改或变量被删除时，已经在编辑器中使用的变量标识符不会自动更新。例如，如果自定义变量的名称从"名称A"修改为"名称B"，编辑器中已写入的标识符仍然是`@名称A.value`，可能导致无法正确解析变量。同样，如果引用的变量被删除，标识符仍然存在但无法解析。

**复现步骤**:
1. 创建一个自定义变量，名称为"名称A"
2. 在工作任务或工作流编辑器中引用该变量（`@名称A.value`）
3. 返回变量列表，将变量名称修改为"名称B"或删除该变量
4. 回到编辑器，观察到原引用仍显示为`@名称A.value`且没有视觉提示表明变量已更改或已不存在

**根本原因**:  
当前系统没有实现变量标识符的更新机制，变量引用是作为纯文本存储的，没有与变量数据库记录建立动态关联。当变量名称变更或变量被删除时，没有机制通知编辑器组件更新显示。

**修复方案**:
已创建详细的设计方案文档，包含完整的实现计划：[变量标识符更新设计方案](../docs/variable-identifier-update-design.md)

根据设计方案，已删除的变量标识符将以特殊样式显示（红色边框、浅红色背景、文本添加删除线），并在解析过程中被跳过不进行处理。

**相关文件**:
- `client/src/services/variableService.ts`
- `client/src/components/variable/VariableSelector.tsx`
- `client/src/components/workTask/VariableEditor.tsx`
- `client/src/utils/VariableResolver.ts`

## UI交互问题

### ISSUE-001: NPC卡片区域点击响应不一致

- **报告日期**: 2025-03-08
- **状态**: 已部分修复
- **严重程度**: 轻微
- **优先级**: 中
- **影响模块**: NPC模块 / UI组件

**问题描述**:  
NPC卡片组件中点击删除按钮时，会同时触发卡片点击事件导致进入详情页面。经过初步修复后，问题仍部分存在：卡片的头像区域点击无效，只有中间文本区域可点击进入详情。

**复现步骤**:
1. 进入NPC列表页面
2. 尝试点击NPC卡片的头像区域
3. 观察到点击没有反应
4. 点击卡片中间的文本区域，可以进入详情页

**根本原因**:  
之前修复删除按钮问题时，将整个卡片的点击事件移除，改为只在内部div上添加点击事件，但头像区域在Card组件的cover属性中定义，不在这个div内部，因此不能响应点击事件。

**修复方案**:
1. 将头像区域（Card的cover部分）也包装在可点击div中，或
2. 修改当前设计，回到使用Card组件原生点击事件，同时正确处理删除按钮的事件冒泡

**相关文件**:
- `client/src/components/npc/NpcCard.tsx`

---

### ISSUE-002: 头像上传后刷新页面消失

- **报告日期**: 2025-03-08
- **状态**: 新建
- **严重程度**: 一般
- **优先级**: 低
- **影响模块**: NPC模块 / 文件上传

**问题描述**:  
上传NPC头像后，在当前会话中可以正常显示，但刷新页面后头像会消失。这是因为头像实际上没有被保存到服务器，也没有持久化到数据库中。

**复现步骤**:
1. 创建或编辑一个NPC
2. 上传头像图片
3. 保存NPC信息
4. 在列表中可以看到头像正常显示
5. 刷新页面
6. 观察到头像消失

**根本原因**:  
`AvatarUploader`组件中的`customRequest`方法使用了`URL.createObjectURL()`创建临时对象URL来引用本地文件，这种URL仅在当前浏览器会话中有效。同时，实际的图片文件也没有上传到服务器存储，数据库中存储的是临时对象URL而非持久化的文件路径。

```typescript
// 在AvatarUploader.tsx中
const customRequest = async (options: any) => {
  // ...
  // 创建一个临时URL以便预览
  const objectUrl = URL.createObjectURL(file);
  setImageUrl(objectUrl);
  // ...
  onChange(objectUrl);
}
```

**修复方案**:
1. 在服务器端实现真正的文件上传端点
   - 使用multer等中间件处理文件上传
   - 将文件保存到服务器的特定目录
   - 返回永久性的文件URL或路径
2. 修改`AvatarUploader`组件
   - 将文件实际上传到服务器
   - 接收并使用服务器返回的永久URL
3. 更新数据库模型和控制器
   - 确保存储的是永久URL而非临时对象URL

**相关文件**:
- `client/src/components/npc/AvatarUploader.tsx`
- `server/src/controllers/NpcController.ts`
- `server/src/routes/npc.ts`

---

### ISSUE-003: 变量编辑器插入变量后光标消失

- **报告日期**: 2025-03-10
- **状态**: 已修复
- **严重程度**: 轻微
- **优先级**: 低
- **影响模块**: 工作任务模块 / 变量编辑器

**问题描述**:  
在变量编辑器中选择并插入变量标识符后，编辑器失去焦点，光标不会停留在插入的变量后面。用户需要再次点击编辑器才能恢复光标并继续编辑。

**复现步骤**:
1. 在工作任务编辑页面使用变量编辑器
2. 输入@符号触发变量菜单
3. 通过键盘方向键或鼠标点击选择一个变量
4. 观察到变量成功插入，但编辑器失去焦点，光标消失
5. 需要再次点击编辑器才能继续输入

**根本原因**:  
Slate编辑器在插入自定义节点（变量标签）后，光标位置处理逻辑不完善。当前尝试使用`ReactEditor.focus`和`Transforms.select`设置光标位置，但由于DOM更新和React状态更新时机的不同步，导致焦点设置失败。

**修复方案**:
已实施的解决方案：
1. 增加了聚焦操作的延迟时间，确保DOM完全更新后再设置光标位置
2. 在变量插入后添加了空格，便于光标定位
3. 优化了事件处理逻辑，确保焦点回到编辑器

**相关文件**:
- `client/src/components/workTask/VariableEditor.tsx`

---

### ISSUE-004: 变量编辑器内容更新后UI未同步显示

- **报告日期**: 2025-03-10
- **状态**: 已修复
- **严重程度**: 一般
- **优先级**: 高
- **影响模块**: 工作任务模块 / 变量编辑器

**问题描述**:  
在工作任务表单中，选择NPC后，提示词模板会自动生成并设置到表单值中，但编辑器UI不会实时更新显示这些内容。同样，在编辑工作任务时切换NPC，模板内容虽然在内部更新，但UI不会反映这些更改。

**复现步骤**:
1. 创建新工作任务
2. 选择一个NPC
3. 观察提示词模板输入框显示为空白，但实际上模板已生成
4. 提交任务后再编辑，可以看到模板内容正常显示
5. 尝试切换到不同NPC，观察提示词模板未更新

**根本原因**:  
Slate编辑器的状态管理问题。当使用`setValue()`方法更新内部状态时，React会正确更新状态，但Slate编辑器的DOM表示并未同步更新。这是因为Slate编辑器使用其自己的内部状态管理系统来控制DOM渲染，而这个系统与React的状态更新不完全同步。

**修复方案**:
已实施的解决方案：
1. 修改了`updateContent`方法，添加了直接操作Slate编辑器DOM的逻辑：
   ```typescript
   updateContent: (content: string) => {
     // 设置新值到React状态
     const newNodes = deserializeFromText(content);
     setValue(newNodes);
     
     // 直接操作Slate编辑器的内部状态
     try {
       // 清空当前编辑器内容并插入新内容
       const nodeCount = editor.children.length;
       if (nodeCount > 0) {
         for (let i = nodeCount - 1; i >= 0; i--) {
           Transforms.delete(editor, { at: [i] });
         }
       }
       Transforms.insertNodes(editor, newNodes);
       ReactEditor.focus(editor);
     } catch (error) {
       console.error("强制更新编辑器内容时出错:", error);
     }
   }
   ```
2. 这种方法绕过了React的常规渲染流程，直接更新编辑器的DOM表示，确保UI显示与内部状态同步

**相关文件**:
- `client/src/components/workTask/VariableEditor.tsx`

---

### ISSUE-005: 工作任务输出测试按钮在创建时被错误禁用

- **报告日期**: 2025-03-10
- **状态**: 已修复
- **严重程度**: 一般
- **优先级**: 中
- **影响模块**: 工作任务模块 / 表单控件

**问题描述**:  
在创建新工作任务时，即使已选择NPC和AI服务并在输入框中输入内容，"输出测试"按钮仍然保持禁用状态。只有在保存任务后再进入编辑页面，按钮才能正常启用。

**复现步骤**:
1. 进入创建工作任务页面
2. 选择NPC和AI服务
3. 在输入框中添加内容
4. 观察"输出测试"按钮仍然处于禁用状态
5. 保存任务后再编辑，按钮可正常使用

**根本原因**:  
按钮的禁用条件使用了`form.getFieldValue('input')`来检查输入是否存在，但由于使用自定义编辑器组件，表单值的更新与编辑器实际内容不同步。特别是在新建任务时，表单对象无法正确获取编辑器中输入的内容，导致按钮始终被禁用。

```jsx
// 按钮禁用条件
disabled={!form.getFieldValue('npcId') || !form.getFieldValue('aiServiceId') || !form.getFieldValue('input')}
```

**修复方案**:
已实施的解决方案：
1. 简化按钮的禁用条件，只检查必要的NPC和AI服务是否已选择：
   ```jsx
   disabled={!form.getFieldValue('npcId') || !form.getFieldValue('aiServiceId')}
   ```
2. 在`handleTestExecute`函数内部保留输入检查，确保必要字段存在时才执行测试

**相关文件**:
- `client/src/components/workTask/WorkTaskForm.tsx`

# 工作任务管理模块概念设计与界面规范

**版本号**: v1.4.0  
**创建时间**: 2025年3月9日 05:58  
**更新时间**: 2025年3月10日 17:45  
**文档状态**: 已修订  

> 注意：本文档是《工作任务管理模块》完整规范的第一部分，专注于概念设计和界面规范。
> 技术实现细节请参见姊妹文档：[工作任务模块技术实现规范](work-task-module-technical-spec.md)
> API接口详细设计请参见：[工作任务模块API接口规范](work-task-module-api-spec.md)

## 目录
1. [模块概述与目标](#模块概述与目标)
2. [工作任务状态管理](#工作任务状态管理)
3. [界面结构分析](#界面结构分析)
4. [前端组件规范](#前端组件规范)
5. [变量引用与标签UI规范](#变量引用与标签ui规范)
6. [Prompt组合规则](#prompt组合规则)
7. [与其他模块的集成点](#与其他模块的集成点)
8. [用户体验最佳实践](#用户体验最佳实践)
9. [已知问题与解决方案](#已知问题与解决方案)

## 模块概述与目标

工作任务管理模块是Netsphere系统的核心功能，用于创建和管理能够调用AI服务执行特定任务的工作单元。每个工作任务包含输入内容、处理规则和输出结果，通过与NPC模块和AI服务模块的集成，为用户提供强大的AI辅助工作能力。

### 核心目标：

1. **提供直观的任务创建界面**：允许用户轻松创建新工作任务，指定输入内容和处理规则
2. **支持全局变量引用**：在输入中无缝集成全局变量，提高内容复用性
3. **NPC与AI服务关联**：允许选择特定NPC和AI服务来处理任务
4. **自动生成全局变量**：将任务的输入和输出自动注册为全局变量，供其他任务引用
5. **便捷的任务管理**：提供清晰的任务列表视图，支持任务的查看、编辑和删除
6. **可编程执行能力**：提供基础的触发和执行接口，便于未来工作流模块集成

### 功能亮点：

- **智能文本编辑器**：支持全局变量的标签式插入与显示
- **实时测试能力**：允许用户在保存前测试任务的输出结果
- **防止循环引用**：智能识别和防止变量的循环引用问题
- **可视化任务管理**：直观展示任务列表和任务细节
- **事件发布机制**：提供输入/输出变更事件发布功能，支持后续扩展

## 工作任务状态管理

工作任务有三种核心状态，通过卡片上的灰色圆点（状态指示器）直观地显示：

### 1. 任务状态定义

| 状态 | 颜色指示 | 描述 |
|-----|---------|------|
| **草稿 (DRAFT)** | 灰色 (#D9D9D9) | 初始创建或编辑阶段，尚未正式启用的任务 |
| **已激活 (ACTIVE)** | 绿色 (#52C41A) | 已经正式可用，可以被系统调用执行的任务 |
| **已归档 (ARCHIVED)** | 深灰色 (#8C8C8C) | 不再活跃使用，但保留历史记录的任务 |

### 2. 状态指示器设计

状态指示器（灰色圆点）是位于工作任务卡片上的视觉元素，用于直观展示任务的当前生命周期阶段：

- **位置**：卡片右上角或任务名称旁
- **尺寸**：8px 直径圆点
- **状态切换**：通过下拉菜单或状态切换按钮改变
- **工具提示**：鼠标悬停时显示当前状态的文字说明

### 3. 状态与功能关联

各状态与系统功能的关联如下：

- **草稿 (DRAFT)**：
  - 可以自由编辑所有任务属性
  - 可以进行输出测试
  - 不会被其他模块调用执行
  - 适合用于任务设计和调试阶段
  - 任务的输入和输出不会自动注册为全局变量

- **已激活 (ACTIVE)**：
  - 任务正式可用
  - 任务的输入和输出已注册到全局变量系统
  - 可以被工作流模块引用和调用
  - 可以手动触发执行或通过API调用执行
  - 部分重要属性可能受到限制编辑

- **已归档 (ARCHIVED)**：
  - 任务不会被系统调用执行
  - 不可编辑，只能查看
  - 任务的变量仍然存在，但标记为只读状态
  - 可通过查看历史记录了解过去执行情况
  - 可重新激活为ACTIVE状态（如有需要）

### 4. 状态转换流程

工作任务状态转换遵循以下规则：

1. 新建任务默认为**草稿**状态
2. 草稿可以转换为**已激活**状态（需验证必要字段）
3. 已激活可以转换为**已归档**状态（不再使用但保留记录）
4. 已归档可以转换为**已激活**状态（重新启用）
5. 状态变更会触发相应的事件，供其他模块监听

## 界面结构分析

工作任务管理模块包含两个主要页面：任务创建/编辑页面和任务列表页面。

### 1. 任务创建/编辑页面

分为左侧的工作任务创建区和右侧的全局变量列表区。

#### 左侧工作任务创建区

按垂直流程分为四个主要部分：

1. **名称区域**：
   - 文本输入框，用于设置工作任务名称
   - 名称将用作全局变量的来源名称，但不是prompt的一部分

2. **输入/INPUT区域**：
   - 多行文本编辑器，支持插入全局变量标签
   - 变量标签以特殊UI样式（tag形式）显示
   - 文本内容将成为提交给AI服务的prompt的一部分
   - 用户可通过两种方式插入变量：
     - 输入@后自动提示并转换为变量标签
     - 从右侧变量列表中选择插入

3. **规则/PROCESS区域**：
   - 使用浅灰色背景(#F5F5F5)卡片包裹整个区域，形成视觉分组
   - 关联NPC选择：下拉列表，选择要使用的NPC
   - NPC提示词控制：可折叠面板，展开后可编辑提示词模板
   - AI服务选择：下拉列表，选择要使用的AI服务
   - 三部分共享统一的浅灰色背景，形成完整的处理规则区域

4. **输出/OUTPUT区域**：
   - 输出预览框：显示AI服务返回的结果
   - 输出测试按钮：点击后发送请求并获取AI响应
   - 完成后自动更新输出预览区
   - 执行状态显示：显示任务最后执行时间和执行状态

5. **底部操作区**：
   - 保存按钮：保存当前工作任务
   - 执行按钮：手动触发工作任务执行

#### 右侧全局变量列表区

- 使用浅灰色背景(#F5F5F5)卡片包裹整个区域
- 可用变量类型筛选器
- 变量列表，双行展示：
  - 第一行显示变量来源名称
  - 第二行显示变量标识符(左对齐)和变量类型标签(右对齐)
- 变量标识符使用深蓝色(#1A1F2C)背景和白色文字，与左侧导航栏颜色一致
- 字体使用系统标准字体，与UI规范保持一致

### 2. 工作任务列表页面

- 顶部标签导航：在"创建工作任务"和"工作任务列表"之间切换
- 使用卡片布局展示所有工作任务
- 每个卡片显示：
  - 工作任务名称
  - 输入内容摘要
  - 关联的NPC和AI服务
  - 输出内容摘要
  - 最后执行时间和执行状态
- 每个卡片提供操作按钮：
  - 查看详情
  - 编辑
  - 执行
  - 删除

## 前端组件规范

### 1. 布局与样式规范

- **色彩规范**
  - 遵循全局色彩规范：
    - 主色调：深蓝色（#1A1F2C，用于导航背景和变量标识符背景）
    - 辅助色：浅灰色（#F5F5F5，用于页面背景和卡片背景）
  - 工作任务特有颜色：
    - 任务卡片背景：白色
    - 任务卡片边框：#F0F0F0
    - 变量标签（输入区）背景：#F0F7FF
    - 变量标签边框：#D0E8FF
    - 变量标签文字：#0F56B3
    - 执行状态颜色：
      - 空闲(IDLE)：灰色 #D9D9D9
      - 执行中(RUNNING)：蓝色 #1890FF
      - 完成(COMPLETED)：绿色 #52C41A
      - 失败(FAILED)：红色 #FF4D4F

- **排版规范**
  - 任务名称：16px, 粗体
  - 区域标题（如"输入"、"规则"、"输出"）：14px, 粗体
  - 表单标签：14px, 常规
  - 变量标签：14px, 等宽字体
  - 输入和输出文本：14px, 常规
  - 执行状态文本：12px, 常规

- **间距规范**
  - 组件内边距：16px
  - 区域间垂直间距：24px
  - 表单项间距：16px
  - 卡片间距：24px（使用flex布局的gap属性）

- **响应式规范**
  - 使用flex布局，自动调整布局
  - 在小屏幕设备上，左右区域改为上下排列
  - 输入和输出文本区域的最小高度：150px

### 2. 变量标签UI规范

工作任务模块中变量标签有两种类型：输入区的变量标签和变量列表中的变量标识符。

#### 输入区变量标签

- **样式**
  - 背景色：#F0F7FF
  - 边框：1px solid #D0E8FF
  - 圆角：4px
  - 内边距：2px 6px
  - 文字颜色：#0F56B3
  - 字体：等宽字体，便于区分

- **交互**
  - 鼠标悬停时背景色加深
  - 点击时显示删除按钮
  - 可拖拽移动
  - 可以被整体复制和删除

#### 变量列表中的变量标识符

- **样式**
  - 背景色：#1A1F2C（与左侧导航栏颜色一致）
  - 文字颜色：白色
  - 内边距：2px 6px
  - 圆角：4px
  - 字体：系统标准字体（"PingFang SC", "Microsoft YaHei", sans-serif）
  - 字号：13px
  - 显示方式：inline-block，宽度按文本内容自适应而非撑满整行

- **布局**
  - 第一行：变量来源名称（加粗显示）
  - 第二行：左侧为变量标识符，右侧为变量类型标签

### 3. 输入区富文本编辑器规范

工作任务的输入区需要一个特殊的富文本编辑器，支持变量标签的插入和显示：

- **基本功能**
  - 纯文本编辑
  - 变量标签的插入和显示
  - 支持复制、粘贴、撤销和重做

- **变量插入方式**
  - 方式1：输入@后显示变量自动补全下拉框
  - 方式2：从右侧变量列表点击插入
  - 插入时自动转换为变量标签UI

- **键盘支持**
  - Tab键：在@后自动补全时选择变量
  - Delete/Backspace键：删除整个变量标签
  - 方向键：可以在变量标签间移动光标

### 4. 各组件尺寸规范

- **工作任务创建页面**
  - 左侧创建区宽度：65%
  - 右侧变量列表宽度：35%
  - 输入文本区高度：最小150px
  - 输出文本区高度：最小150px
  - NPC和AI服务选择器宽度：100%
  - 规则区域内边距：16px
  - 规则区域整体边距：浅灰色背景卡片内边距16px，边框1px solid #e8e8e8，圆角4px

- **工作任务列表页面**
  - 卡片宽度：300px
  - 卡片最小高度：200px
  - 卡片内边距：16px
  - 操作按钮尺寸：32px x 32px

## 变量引用与标签UI规范

工作任务模块要支持在输入内容中引用全局变量，并提供直观的变量标签UI：

### 1. 变量引用格式

- **标准格式**：`@来源名称.字段名`
- **示例**：`@云透.知识背景`、`@翻译任务.output`
- **解析规则**：
  - 以@开头，后跟来源名称和字段名
  - 来源名称可以包含中文、字母、数字和下划线
  - 字段名只能包含字母、数字和下划线

### 2. 变量解析流程

变量解析由后端服务处理，具体流程如下：
1. 提取文本中的所有变量引用
2. 查询每个变量的实际值
3. 替换文本中的变量引用为实际值
4. 对于嵌套变量，递归解析（最大深度为5）

### 3. 循环引用防护

为防止循环引用导致的无限循环，系统会：
- 在保存任务前检查是否存在循环引用
- 禁止任务引用自己的变量
- 如有循环引用，显示错误提示并阻止保存

## Prompt组合规则

工作任务模块中，最终提交给AI服务的Prompt是由多个部分组合而成的：

### 1. 基本组合规则

```
最终Prompt = 输入内容(INPUT) + NPC提示词
```

其中：
- **输入内容(INPUT)**：用户在输入区填写的内容，所有变量引用已解析为实际值
- **NPC提示词**：基于选择的NPC生成的提示词模板，可以自定义

### 2. NPC提示词默认模板

默认的NPC提示词模板为：
```
你是@NPC名称.姓名，现在你具备的知识背景是：@NPC名称.知识背景，根据你的行动原则：@NPC名称.行动原则，请你给出以上输入的反馈。
```

这个模板中的NPC名称会自动替换为实际选择的NPC名称，并解析其中的变量引用。

### 3. 自定义NPC提示词模板

用户可以通过NPC设置按钮自定义NPC提示词模板：
- 可以修改默认模板的文本
- 可以使用与INPUT区域相同的方式插入变量
- 可以重置为默认模板

### 4. Prompt解析和执行流程

1. 用户输入INPUT内容，选择NPC和AI服务
2. 用户点击"输出测试"按钮
3. 系统执行以下步骤：
   - 解析INPUT中的所有变量引用
   - 解析NPC提示词模板中的所有变量引用
   - 组合完整的Prompt
   - 调用选定的AI服务，传入完整Prompt
   - 接收AI服务返回的结果，显示在输出区域
4. 用户点击"保存"按钮，系统执行以下步骤：
   - 检查是否存在循环引用
   - 保存工作任务数据
   - 更新或创建相关的全局变量

## 与其他模块的集成点

工作任务管理模块主要与以下模块集成：

### 1. NPC模块集成

- **引用NPC属性**：可在提示词模板中引用NPC的知识背景和行动原则
- **NPC选择器**：从现有NPC列表中选择用于执行任务的NPC

### 2. AI服务模块集成

- **服务选择**：从配置的AI服务中选择用于执行任务的服务
- **参数配置**：默认使用AI服务的标准参数，未来可能支持自定义

### 3. 全局变量模块集成

- **变量提供**：工作任务作为变量源，提供input和output变量
- **变量引用**：可在输入内容中引用其他来源的变量
- **变量同步**：当工作任务更新时，自动更新相关变量

### 4. 工作流模块集成

- **事件机制**：提供输入/输出变更事件，支持工作流模块监听和触发
- **执行接口**：提供标准化的执行入口，允许工作流模块调用
- **状态追踪**：维护任务执行状态，供工作流模块查询

## 用户体验最佳实践

在实际开发过程中，我们发现了一些工作任务模块的用户体验问题，并总结出以下最佳实践：

### 变量选择器优化

1. **菜单位置跟随光标**：
   - 变量选择菜单应出现在光标位置附近，而非固定位置
   - 实现方法：在@触发后获取光标位置，并设置菜单的绝对位置
   ```jsx
   // 获取并设置光标位置
   const updateCursorPosition = () => {
     const domSelection = window.getSelection();
     if (domSelection && domSelection.rangeCount > 0) {
       const range = domSelection.getRangeAt(0);
       const rect = range.getBoundingClientRect();
       setCursorPosition({
         top: rect.bottom + 5, // 在光标下方5px处显示
         left: rect.left
       });
     }
   };
   
   // 菜单位置跟随光标
   <div style={{
     position: 'absolute',
     zIndex: 1000,
     ...(cursorPosition ? {
       top: `${cursorPosition.top}px`,
       left: `${cursorPosition.left}px`
     } : {})
   }}>
     {/* 变量下拉菜单内容 */}
   </div>
   ```

2. **变量搜索体验改进**：
   - 支持按来源名称和字段名搜索
   - 对匹配的文本高亮显示
   - 在搜索结果为空时显示友好提示

3. **变量插入反馈**：
   - 插入变量后添加空格，便于继续输入
   - 使用动画效果突出显示新插入的变量标签
   - 保持编辑器焦点，避免用户需要再次点击编辑器

### 表单控件设计优化

1. **禁用条件优化**：
   - "输出测试"按钮仅在NPC和AI服务未选择时禁用，不依赖于输入内容检查
   - 在执行函数内部保留必要的数据验证

2. **加载状态与反馈**：
   - 添加任务执行时的加载指示器
   - 执行结束后自动滚动到输出区域
   - 使用颜色和图标直观显示执行状态

3. **错误处理优化**：
   - 提供具体的错误信息，而非通用错误
   - 在UI中直接显示可解决方案
   - 对常见错误（如变量未找到）提供修复建议

### 布局响应式设计

1. **移动设备适配**：
   - 在小屏幕设备上，将左右布局改为上下布局
   - 确保按钮和输入区域有足够大的触控面积
   - 优化变量标签在小屏幕上的显示

2. **分屏模式优化**：
   - 左侧创建区最小宽度设置为400px
   - 右侧变量列表可折叠，节省空间
   - 使用flex布局自动调整比例

## 已知问题与解决方案

在开发过程中，我们遇到并解决了以下问题：

### 变量编辑器问题

1. **变量编辑器插入变量后光标消失**
   - **状态**: 已修复
   - **解决方案**: 
     1. 增加聚焦操作延迟，确保DOM完全更新后再设置光标位置
     2. 在变量插入后添加空格，便于光标定位
     3. 使用`setTimeout`延迟执行`ReactEditor.focus`操作

2. **变量编辑器内容更新后UI未同步显示**
   - **状态**: 已修复
   - **解决方案**:
     1. 修改`updateContent`方法，添加直接操作Slate编辑器DOM的逻辑
     2. 实现强制刷新机制，先清空编辑器内容再插入新内容

### UI交互问题

1. **工作任务输出测试按钮在创建时被错误禁用**
   - **状态**: 已修复
   - **解决方案**:
     1. 简化按钮禁用条件，只检查必要的NPC和AI服务选择
     2. 在执行函数内部保留输入验证，确保必要字段存在

2. **UI样式一致性问题**
   - **状态**: 已修复
   - **解决方案**:
     1. 统一使用浅灰色(#F5F5F5)作为分组容器背景色
     2. 变量标识符使用深蓝色(#1A1F2C)背景和白色文字
     3. 统一变量列表布局，采用两行显示方式

### 推荐UI改进

1. **添加任务组织功能**:
   - 实现任务分组功能，通过标签或文件夹组织工作任务
   - 添加任务搜索功能，支持按名称、内容和标签搜索

2. **执行历史与结果比较**:
   - 记录每次执行的历史和结果
   - 提供结果对比功能，便于调整参数

> 技术实现详情请参阅[工作任务模块技术实现规范](work-task-module-technical-spec.md)  
> API接口详情请参阅[工作任务模块API接口规范](work-task-module-api-spec.md)

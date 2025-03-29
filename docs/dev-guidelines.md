# Netsphere项目开发守则

## 项目文档索引

以下是Netsphere项目的所有文档的索引，方便开发者快速查找所需信息：

### 项目概述与需求文档

| 文档路径 | 描述 |
|---------|------|
| [README.md](/README.md) | 项目简介、技术栈和基本架构说明 |
| [docs/Netsphere_PRD.md](/docs/Netsphere_PRD.md) | 项目产品需求文档，描述整体功能与核心概念 |
| [docs/Netsphere_API服务_PRD.md](/docs/Netsphere_API服务_PRD.md) | AI服务集成相关需求说明 |
| [docs/Netsphere_工作任务_PRD.md](/docs/Netsphere_工作任务_PRD.md) | 工作任务模块的产品需求说明 |
| [docs/Netsphere_全局变量和工作任务的prompt组合规则_PRD.md](/docs/Netsphere_全局变量和工作任务的prompt组合规则_PRD.md) | 变量和prompt组合机制说明 |

### 模块设计规范文档

| 文档路径 | 描述 |
|---------|------|
| [docs/npc-module-design-spec.md](/docs/npc-module-design-spec.md) | NPC模块的设计规范与实现细节 |
| [docs/ai-service-module-design-spec.md](/docs/ai-service-module-design-spec.md) | AI服务模块的设计规范与接口定义 |
| [docs/global-variable-module-design-spec.md](/docs/global-variable-module-design-spec.md) | 全局变量系统的设计规范 |
| [docs/work-task-module-design-spec.md](/docs/work-task-module-design-spec.md) | 工作任务模块的设计规范 |
| [docs/work-task-module-concept-design.md](/docs/work-task-module-concept-design.md) | 工作任务模块的概念设计 |
| [docs/workflow-module-concept-design.md](/docs/workflow-module-concept-design.md) | 工作流模块的概念设计 |
| [docs/workflow-module-design-summary.md](/docs/workflow-module-design-summary.md) | 工作流模块设计总结 |

### 技术规范与API文档

| 文档路径 | 描述 |
|---------|------|
| [docs/work-task-module-technical-spec.md](/docs/work-task-module-technical-spec.md) | 工作任务模块的技术规范 |
| [docs/work-task-module-api-spec.md](/docs/work-task-module-api-spec.md) | 工作任务模块的API接口定义 |
| [docs/workflow-module-technical-spec.md](/docs/workflow-module-technical-spec.md) | 工作流模块的技术规范 |
| [docs/workflow-module-api-spec.md](/docs/workflow-module-api-spec.md) | 工作流模块的API接口定义 |
| [docs/dev-guidelines.md](/docs/dev-guidelines.md) | 项目开发守则与代码规范（本文档） |

### 实现指南与问题记录

| 文档路径 | 描述 |
|---------|------|
| [docs/variable-editor-implementation-guide.md](/docs/variable-editor-implementation-guide.md) | 变量编辑器的实现指南 |
| [docs/workflow-module-implementation-plan.md](/docs/workflow-module-implementation-plan.md) | 工作流模块实现计划 |
| [docs/known-issues.md](/docs/known-issues.md) | 已知问题与解决方案记录 |
| [version.json](/version.json) | 项目版本信息与更新说明 |
| [log.md](/log.md) | 开发日志与问题记录 |

## 文档信息

**版本号**: v2.5.0  
**创建时间**: 2025年3月7日 11:30  
**更新时间**: 2025年3月14日 14:30  
**文档状态**: 已修订  

### 更新记录
- **v2.5.0** (2025年3月14日 14:30): 添加工作流模块最佳实践，包括React Flow组件状态管理和数据序列化
- **v2.4.0** (2025年3月14日 00:05): 详细说明命令行工具工作目录问题解决方案，更新卡片Flex布局规范
- **v2.3.0** (2025年3月13日 15:34): 添加页面布局规范，统一各模块页面结构与样式
- **v2.2.0** (2025年3月10日 13:24): 添加变量显示重复问题的解决方案与最佳实践
- **v2.1.0** (2025年3月9日 19:15): 添加UI色彩规范统一定义，新增模块发开过程问题处理记录
- **v2.0.0** (2025年3月9日 05:48): 精简文档结构，补充Git工作流详细规范
- **v1.8.0** (2025年3月9日 05:41): 添加Git操作推荐方法，解决目录切换问题
- **v1.7.0** (2025年3月9日 04:47): 添加API响应处理和类型安全最佳实践
- **v1.6.0** (2025年3月8日 11:06): 添加全局变量标识符格式规范和变量源提供者编写指南

## 目录
1. [开发环境和命令行问题](#开发环境和命令行问题)
2. [代码规范](#代码规范)
3. [UI规范](#ui规范)
4. [Git工作流](#git工作流)
5. [模块开发指南](#模块开发指南)
6. [问题排查与最佳实践](#问题排查与最佳实践)
7. [开发过程问题记录](#开发过程问题记录)
8. [工作流模块最佳实践](#工作流模块最佳实践)

## 开发环境和命令行问题

### Windows PowerShell命令问题

在Windows PowerShell中，无法使用`&&`符号连接多个命令。请使用以下方法替代：

1. **使用分号`;`连接命令**：
   ```powershell
   cd D:\Netsphere\server; npm install
   ```

2. **使用CMD兼容模式**：
   ```powershell
   cmd /c "cd D:\Netsphere\server && npm install"
   ```

### 工作目录问题解决方案

由于每个命令在独立会话中执行，先执行`cd`再执行其他命令不能达到预期效果，请使用以下方法：

1. **指定完整路径**（推荐）：
   ```powershell
   npm --prefix D:\Netsphere\server install
   ```

2. **使用git的-C参数指定仓库路径**（推荐）：
   ```powershell
   git -C D:\Netsphere add .
   git -C D:\Netsphere commit -m "提交信息"
   ```
   
3. **在单一命令中结合多个操作**：
   ```powershell
   powershell -Command "Set-Location D:\Netsphere; git status"
   ```

### 工具返回桌面目录问题

在使用某些自动化工具（如AI辅助工具）执行命令时，经常会遇到即使使用了`cd`命令切换目录，工具仍然返回到默认的桌面目录(C:/Users/xxx/Desktop)的问题。这是因为这些工具的命令执行环境通常为每个命令都创建一个新的会话，而不保持工作目录状态。

**解决方案**：

1. **始终在命令中包含完整路径**：
   ```
   git -C "D:\Netsphere" checkout -b feature/new-branch
   git -C "D:\Netsphere" add "D:\Netsphere\client\src\pages\file.tsx"
   ```

2. **使用单一复合命令**，不要依赖目录持久性：
   ```
   powershell -Command "Set-Location D:\Netsphere; git checkout -b feature/new-branch; git add client\src\pages\file.tsx"
   ```

3. **创建批处理文件**执行复杂命令序列（适用于需要多步操作的情况）：
   ```batch
   @echo off
   cd /d D:\Netsphere
   git checkout -b feature/new-branch
   git add client\src\pages\file.tsx
   git commit -m "Add new file"
   ```

**注意事项**：
- 对于Git操作，优先使用`git -C`参数而非依赖工作目录切换
- 对于npm操作，优先使用`npm --prefix`而非依赖工作目录切换
- 始终假设每个命令都在默认目录执行，不要依赖之前命令的工作目录变更

## 代码规范

### 代码结构与组织

- **后端**：遵循模型(Models)、控制器(Controllers)、路由(Routes)分离
- **前端**：按照组件(Components)、页面(Pages)、服务(Services)、工具(Utils)分类

### 命名规范

- **类名和接口名**：PascalCase（如`NpcController`）
- **变量和函数名**：camelCase（如`getUsers`）
- **常量**：UPPER_SNAKE_CASE（如`API_BASE_URL`）
- **文件名**：React组件使用PascalCase，其他文件使用camelCase

### TypeScript最佳实践

- 为所有API响应和请求定义清晰的接口
- 使用`AppDataSource.getRepository(Entity)`而非`getRepository(Entity)`
- 优先使用显式类型声明，提高代码可读性
- 使用泛型增强代码复用性

### API设计

- 使用RESTful设计原则（资源名词、HTTP方法对应操作）
- 统一错误响应格式（状态码、错误消息和详情）
- 使用try-catch包装异步操作确保错误被捕获

### 组件设计

- 分离展示型组件和容器型组件
- 使用受控组件处理表单输入
- 使用React Hooks管理状态和副作用

## UI规范

### 标准色彩定义

项目中使用的标准色彩定义如下：

- **主色调**：深蓝色（#1A1F2C，用于导航背景和变量标识符背景）
- **辅助色**：浅灰色（#F5F5F5，用于页面背景和卡片背景）
- **强调色**：蓝色（#1890FF，用于按钮悬停等）
- **警告色**：红色（#FF4D4F，用于删除按钮和警告提示）
- **成功色**：绿色（#52C41A，用于保存成功提示）

### 各模块特有色彩

- **全局变量模块**：
  - 变量类型色：
    - NPC类型：紫色（#722ED1）
    - 工作任务类型：绿色（#52C41A）
    - 自定义类型：蓝色（#1890FF）
    - 文件类型：灰色（#6C757D）

- **工作任务模块**：
  - 变量标签（输入区）背景：#F0F7FF
  - 变量标签边框：#D0E8FF
  - 变量标签文字：#0F56B3
  - 执行状态颜色：
    - 空闲(IDLE)：灰色 #D9D9D9
    - 执行中(RUNNING)：蓝色 #1890FF
    - 完成(COMPLETED)：绿色 #52C41A
    - 失败(FAILED)：红色 #FF4D4F

### 组件样式规范

- **卡片组件**：
  - 白色背景
  - 浅灰色边框 #E8E8E8
  - 圆角 4px
  - 内边距 16px
  
- **分组容器**：
  - 浅灰色背景 #F5F5F5
  - 边框 1px solid #E8E8E8
  - 圆角 4px
  - 内边距 16px
  - 区块间间距 16px

- **变量标识符**：
  - 深蓝色背景 #1A1F2C
  - 白色文字
  - 内边距 2px 6px
  - 圆角 4px
  - 使用系统标准字体

### 页面布局规范

系统各页面布局应保持统一，遵循以下规范：

#### 列表页面

列表页面应采用以下结构：

```jsx
<div className="module-list-page">
  <div style={{ marginBottom: 24 }}>
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>模块名称</Typography.Title>
          <Typography.Text type="secondary">创建和管理系统中的模块对象</Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
          style={{ backgroundColor: '#1A1F2C' }}
        >
          创建按钮文字
        </Button>
      </div>
      <Divider style={{ margin: '12px 0' }} />
    </Space>
  </div>
  
  <Card>
    {/* 列表内容 */}
  </Card>
</div>
```

- **标题区域**：
  - 主标题使用Typography.Title level={4}，保持简洁（例如"NPC管理"、"全局变量"、"工作任务"、"AI服务"）
  - 副标题使用Typography.Text type="secondary"，描述模块功能（例如"创建和管理系统中的NPC角色"）
  - 创建按钮放置在标题区域右侧，使用深蓝色背景(#1A1F2C)
  - 使用Space和Divider组件创建统一的间距和分隔线

**重要说明**：
- **不要添加外层padding**：页面容器本身不应设置padding，保持与其他模块一致
- **保持标题样式统一**：所有模块的标题和副标题应使用相同的样式和结构

#### 创建页面

创建页面应采用以下结构：

```jsx
<div className="module-create-page">
  <div style={{ marginBottom: 24 }}>
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <ArrowLeftOutlined 
          onClick={goBack} 
          style={{ marginRight: 16, fontSize: 16, cursor: 'pointer' }}
        />
        <Typography.Title level={4} style={{ margin: 0 }}>创建[对象]</Typography.Title>
      </div>
      <Divider style={{ margin: '12px 0' }} />
    </Space>
  </div>
  
  <Card>
    {/* 表单内容 */}
  </Card>
</div>
```

- **返回导航**：
  - 使用ArrowLeftOutlined图标作为返回按钮
  - 为图标添加onClick处理函数，通常命名为goBack
  - 设置合适的鼠标悬停样式(cursor: 'pointer')
  - 标题使用"创建XXX"形式，如"创建NPC"、"创建全局变量"

#### 编辑页面

编辑页面应采用以下结构：

```jsx
<div className="module-edit-page">
  <div style={{ marginBottom: 24 }}>
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <ArrowLeftOutlined 
          onClick={goBack} 
          style={{ marginRight: 16, fontSize: 16, cursor: 'pointer' }}
        />
        <Typography.Title level={4} style={{ margin: 0 }}>
          {entity ? `编辑[对象]: ${entity.name}` : '编辑[对象]'}
        </Typography.Title>
      </div>
      <Divider style={{ margin: '12px 0' }} />
    </Space>
  </div>
  
  <Card>
    {/* 表单内容，通常包含initialValues */}
  </Card>
</div>
```

- **编辑页标题**：
  - 使用"编辑XXX: 对象名称"的格式
  - 对象名称应动态获取，如`编辑NPC: 云透`、`编辑全局变量: @云透.知识背景`
  - 当对象数据加载中或未找到时应有合适的处理

#### 卡片列表布局规范

卡片列表（如NPC列表、工作流列表）应使用Flex布局而非Row/Col栅格系统，以确保布局一致性和间距统一：

```jsx
<Card>
  <div style={{ 
    display: 'flex', 
    flexWrap: 'wrap', 
    gap: '24px',    // 统一使用24px的间距！
    alignItems: 'flex-start'
  }}>
    {items.map(item => (
      <div key={item.id}>
        <ItemCard item={item} />
      </div>
    ))}
  </div>
</Card>
```

**关键规范**：
- 使用flex布局替代Row/Col栅格系统
- 卡片间距统一使用24px（通过gap属性设置）
- 卡片组件本身不要设置marginBottom等外边距，以免与容器gap属性冲突
- 卡片应有统一的尺寸，通常为固定宽度（如280px）

这种布局方式比Ant Design的Row/Col栅格系统更简洁、更可控，能够确保不同模块的卡片列表保持视觉一致性。

#### 通用元素

所有页面应遵循以下通用规范：

- **间距**：
  - 页面顶部标题区块与内容区块间距为24px
  - 内容卡片的内边距为16px
  - Divider分隔线上下边距均为12px
  - 卡片列表间距统一为24px
  
- **状态处理**：
  - 加载状态使用居中的Spin组件，并附带提示文字
  - 错误状态使用Alert组件，提供返回列表等操作选项
  - 成功提示使用message.success，顶部居中显示

- **交互行为**：
  - 所有页面应实现返回函数，如goBack
  - 表单提交应显示加载状态
  - 表单提交成功后应自动导航回列表页

## Git工作流

### 工作目录与Git命令

在执行Git命令时，请注意工作目录问题。有两种方法可解决：

1. **使用git -C参数指定仓库路径**（推荐）：
   ```bash
   # 无需切换当前工作目录
   git -C D:\Netsphere add .
   git -C D:\Netsphere commit -m "描述性提交信息"
   git -C D:\Netsphere tag v1.0.0
   ```

2. **切换到正确的目录**：
   ```bash
   # 必须保证在D:\Netsphere目录下
   cd D:\Netsphere
   git add .
   git commit -m "描述性提交信息"
   ```

### 分支管理策略

- **main/master分支**：始终保持可部署状态，不直接提交
- **develop分支**：主开发分支，集成所有功能分支
- **feature分支**：基于develop创建，命名格式为`feature/功能名称`
- **release分支**：从develop分支创建，用于准备发布，命名格式为`release/版本号`
- **bugfix分支**：用于修复bug，命名格式为`bugfix/问题描述`
- **rollback分支**：用于标记可回滚的版本点，命名格式为`rollback/功能-版本号`

### 提交信息规范

提交信息应遵循以下格式：
```
[type]: 简短描述（不超过50字符）

详细说明（可选，建议不超过72字符每行）
```

**type类型**：
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码风格调整（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具变动

### 版本管理

- 使用语义化版本号：`主版本号.次版本号.修订号`
  - 主版本号：不兼容的API修改
  - 次版本号：向下兼容的功能性新增
  - 修订号：向下兼容的问题修正

- 版本标记流程：
  ```bash
  # 创建版本标签
  git -C D:\Netsphere tag v0.1.0
  
  # 推送标签到远程
  git -C D:\Netsphere push origin v0.1.0
  ```

- 版本发布文档：
  - 在创建新版本时更新version.json
  - 记录主要变更点
  - 提供恢复到此版本的说明

### 版本回滚与恢复

当需要标记可回滚的版本点时，使用以下方法：

1. **创建特性分支并提交修改**：
   ```bash
   git -C D:\Netsphere checkout -b feature/ui-improvements
   git -C D:\Netsphere add changed-files
   git -C D:\Netsphere commit -m "feat: 完成UI改进"
   ```

2. **创建版本标签**：
   ```bash
   git -C D:\Netsphere tag -a v0.2.0 -m "UI改进版本"
   ```

3. **创建回滚分支**：
   ```bash
   git -C D:\Netsphere checkout -b rollback/ui-v0.2.0
   ```

回滚分支将保持在指定版本的状态，当需要回滚时，只需切换到该分支即可：
```bash
git -C D:\Netsphere checkout rollback/ui-v0.2.0
```

## 模块开发指南

### 全局变量标识符规范

变量标识符必须遵循`@{sourceName}.{field}`格式：

```
@云透.知识背景
@林小梦.行为原则
@结构化需求.input
```

**命名规则**：
- 来源名称：仅允许中文、英文字母、数字和下划线
- 字段名称：各模块有特定规范（如NPC模块使用`knowledge_background`）

**最佳实践**：使用`IdentifierFormatterService`生成标识符，不要手动拼接：

```typescript
// ✅ 推荐方式
const identifier = identifierFormatterService.formatIdentifier(
  'npc', npc.name, 'knowledge_background'
);

// ❌ 不推荐
const identifier = `@${npc.name}.knowledge_background`;
```

### API响应处理

定义统一的API响应接口，确保类型安全：

```typescript
// 定义API响应接口
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

// 使用泛型指定具体类型
const response = await apiClient.get<ApiResponse<User>>('/api/users/123');
```

## 问题排查与最佳实践

### 数据库连接问题

- 统一使用AppDataSource.getRepository()方法
- 确保数据库初始化在服务器启动时完成

### UI组件优化

- 为表格列设置合适的宽度，预留足够操作空间
- 为自定义选项值扩展类型定义，处理所有可能类型
- 添加"全部"选项作为明确选择，避免初始空状态

### 模块集成与数据流

- 追踪数据完整路径：提供者→注册→服务→控制器→前端
- 使用发布-订阅模式处理模块间通信
- 添加日志跟踪关键数据流转节点

### 变量系统最佳实践

#### 变量同步与存储

- **问题**：动态生成的变量（如NPC和工作任务变量）如果只存在于内存中而未正确保存到数据库，会导致变量解析失败
- **解决方案**：
  ```typescript
  // 在变量源提供者中实现同步方法
  public async syncVariablesToDatabase(): Promise<void> {
    try {
      // 获取所有变量
      const variables = await this.getVariables();
      
      // 查找已存在的变量
      const identifiers = variables.map(v => v.identifier);
      const existingVariables = await this.variableRepo.find({
        where: { identifier: In(identifiers) }
      });
      
      // 创建映射以快速查找
      const existingVariableMap = new Map<string, Variable>();
      for (const variable of existingVariables) {
        existingVariableMap.set(variable.identifier, variable);
      }
      
      // 更新或创建变量
      const variablesToSave = [];
      for (const variable of variables) {
        const existingVariable = existingVariableMap.get(variable.identifier);
        if (existingVariable) {
          existingVariable.value = variable.value;
          variablesToSave.push(existingVariable);
        } else {
          variablesToSave.push(variable);
        }
      }
      
      // 保存到数据库
      await this.variableRepo.save(variablesToSave);
    } catch (error) {
      console.error('同步变量失败:', error);
    }
  }
  ```
- **最佳实践**：
  - 在变量源提供者中实现`syncVariablesToDatabase`方法
  - 在服务器启动时触发初始同步，确保数据库中有最新的变量记录
  - 使用`subscribeToChanges`方法监听变量变更，自动触发同步

#### 变量标识符规范化

- **问题**：不同模块使用不同字段名格式（如中文vs英文）会导致生成重复变量和解析失败
- **解决方案**：
  ```typescript
  // 在提供者类中定义统一的字段映射
  private static readonly FIELD_MAPPING: Record<string, string> = {
    'input': 'input',     // 保持英文一致
    'output': 'output',   // 保持英文一致
    '输入': 'input',      // 中文映射到英文
    '输出': 'output'      // 中文映射到英文
  };
  
  // 使用映射生成标准化的字段名
  const normalizedField = field in FIELD_MAPPING ? FIELD_MAPPING[field] : field;
  ```
- **最佳实践**：
  - 所有变量源必须使用一致的字段名标准（优先使用英文字段名）
  - 创建字段名映射常量，确保统一解析

## 工作流模块最佳实践

### 工作流编辑器常见问题及解决方案

#### 点击添加卡片到画布中心问题

**问题描述**：
在工作流编辑器中，通过点击左侧卡片选择器中的卡片，无法将其添加到画布中。尽管点击操作会触发成功消息提示，但画布上并未显示新添加的节点。

**根本原因**：
React Hook的闭包问题。`handleCardSelect`函数使用状态更新时，由于闭包捕获了旧的状态引用，导致`setNodes([...nodes, newNode])`使用的是旧的nodes数组，状态更新不正确。

**最佳实践**：
```typescript
// ✅ 推荐方式 - 使用函数式更新获取最新状态
setNodes(prevNodes => {
  const updatedNodes = [...prevNodes, newNode];
  console.log('[WorkflowEditor] 更新后节点列表:', updatedNodes);
  return updatedNodes;
});

// ❌ 避免使用 - 可能导致闭包问题
setNodes([...nodes, newNode]);
```

#### 工作流保存后再打开显示问题

**问题描述**：
保存工作流后再次打开编辑，画布为空，之前添加的卡片和连接不显示。

**根本原因**：
序列化和反序列化问题。工作流的节点和连接数据在保存到数据库时作为metadata字段的一部分进行了JSON序列化，但在加载时未正确解析这些数据。

**最佳实践**：
```typescript
// 保存时正确序列化节点和连接数据
const data: CreateWorkflowParams = {
  name,
  description,
  isActive,
  metadata: {
    nodes: JSON.stringify(cleanedNodes),
    edges: JSON.stringify(edges),
    version: workflow?.metadata?.version || 1,
    updatedAt: new Date().toISOString()
  }
};

// 加载时正确解析序列化数据
if (workflow && workflow.metadata) {
  try {
    // 确保使用正确的类型解析
    const nodesString = typeof workflow.metadata.nodes === 'string' 
      ? workflow.metadata.nodes 
      : JSON.stringify(workflow.metadata.nodes);
    
    const edgesString = typeof workflow.metadata.edges === 'string'
      ? workflow.metadata.edges
      : JSON.stringify(workflow.metadata.edges);
    
    const loadedNodes = JSON.parse(nodesString);
    const loadedEdges = JSON.parse(edgesString);
    
    setNodes(loadedNodes);
    setEdges(loadedEdges);
  } catch (error) {
    console.error('解析工作流数据失败:', error);
  }
}
```

#### 复制工作流问题

**问题描述**：
复制工作流后，新工作流打开时画布为空，未包含原工作流的节点和连接。

**根本原因**：
工作流复制API只复制了工作流基本信息，但未正确复制metadata中保存的节点和连接数据，或者复制过程中数据格式发生了变化。

**最佳实践**：
```typescript
// 服务端实现工作流复制
async copyWorkflow(id: string): Promise<Workflow> {
  const original = await this.workflowRepository.findOne({
    where: { id },
  });
  
  if (!original) {
    throw new NotFoundException(`工作流ID ${id} 不存在`);
  }
  
  // 创建新工作流对象
  const newWorkflow = this.workflowRepository.create({
    name: `${original.name} - 副本`,
    description: original.description,
    isActive: false, // 默认设为非激活状态
    metadata: original.metadata, // 直接复制元数据对象
  });
  
  // 保存新工作流
  const savedWorkflow = await this.workflowRepository.save(newWorkflow);
  
  // 复制节点
  const nodes = await this.nodeRepository.find({
    where: { workflowId: id },
  });
  
  const nodeIdMap = new Map<string, string>(); // 用于映射旧ID到新ID
  
  // 为每个节点创建副本
  for (const node of nodes) {
    const newNodeId = uuidv4();
    nodeIdMap.set(node.id, newNodeId);
    
    const newNode = this.nodeRepository.create({
      ...node,
      id: newNodeId,
      workflowId: savedWorkflow.id,
    });
    
    await this.nodeRepository.save(newNode);
  }
  
  // 复制连接，并更新节点ID引用
  const connections = await this.connectionRepository.find({
    where: { workflowId: id },
  });
  
  for (const connection of connections) {
    const newConnection = this.connectionRepository.create({
      ...connection,
      id: uuidv4(),
      workflowId: savedWorkflow.id,
      sourceNodeId: nodeIdMap.get(connection.sourceNodeId) || connection.sourceNodeId,
      targetNodeId: nodeIdMap.get(connection.targetNodeId) || connection.targetNodeId,
    });
    
    await this.connectionRepository.save(newConnection);
  }
  
  return savedWorkflow;
}
```

### React Flow最佳实践

- **状态管理**：始终使用函数式更新处理状态，尤其是节点和边的更新
- **数据清理**：存储节点数据前移除可能导致循环引用的属性（如handlers和references）
- **调试策略**：使用带时间戳的详细日志跟踪不同阶段的数据变化
- **ID管理**：确保节点和边的ID唯一，复制操作时生成新ID
- **依赖项管理**：正确设置useCallback和useEffect的依赖数组，避免闭包陷阱

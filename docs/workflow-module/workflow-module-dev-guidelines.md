# 工作流模块开发守则

## 文档信息

**版本号**: v1.0.1  
**创建时间**: 2025年3月15日 00:25  
**更新时间**: 2025年3月15日 01:46  
**文档状态**: 已更新  

### 更新记录
- **v1.0.1** (2025年3月15日 01:46): 添加变量操作相关组件使用指南
- **v1.0.0** (2025年3月15日 00:25): 从主开发守则中分离出工作流模块专用开发守则

## 工作流模块最佳实践

### 工作流编辑器常见问题及解决方案

#### 工作流卡片样式统一问题

**问题描述**：
工作任务卡样式与系统中其他卡片不统一，颜色和效果不一致。

**根本原因**：
各类型卡片的样式分散定义，没有共享统一的标准。工作任务卡的主色是黑色(#000000)，而左侧导航栏使用的是深蓝色(#001529)。

**最佳解决方案**：
```tsx
// 在CustomNodes.tsx中统一设置工作任务卡样式
export const WorkTaskNode = ({ data }: NodeProps) => {
  const style: React.CSSProperties = {
    ...baseNodeStyle,
    background: '#ffffff', // 白色背景
    borderColor: '#001529', // 使用左侧导航的深蓝色边框
    color: '#001529', // 使用左侧导航的深蓝色文字
    position: 'relative',
  };
  
  return (
    <div 
      style={style}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 8px 2px rgba(0, 21, 41, 0.5)';
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* 组件具体实现... */}
    </div>
  );
};
```

此外，在`FlowCanvas.tsx`中也需要确保MiniMap中的节点颜色与实际节点颜色一致：

```tsx
<MiniMap 
  nodeColor={(node) => {
    switch(node.type) {
      case 'start': return '#059405';
      case 'assign': return '#1890ff';
      case 'loop': return '#fa8c16';
      case 'display': return '#722ed1';
      case 'worktask': return '#001529'; // 使用左侧导航的深蓝色
      default: return '#6ede87';
    }
  }}
/>
```

#### 工作任务卡节点计数问题

**问题描述**：
工作流编辑器中，所有工作任务卡片虽然来源不同，但在计数统计时被视为同一类型，导致Badge显示计数错误。

**根本原因**：
在创建节点时，所有工作任务卡都使用通用的"worktask"作为类型标识，而在统计使用次数时仅依据type属性进行计数：

```typescript
// 创建节点时将所有工作任务统一设置为"worktask"类型
type: card.type === CardType.TASK ? 'worktask' : card.id,

// 计数时仅检查节点类型，忽略了工作任务卡的实际ID
const nodeTypeId = node.type || (node.data && node.data.id) || 'default';
counts[nodeTypeId] = (counts[nodeTypeId] || 0) + 1;
```

**最佳解决方案**：
保留节点类型一致性（为了正确渲染），但在计数时优先使用taskId：

```typescript
// 创建节点时保持使用统一的"worktask"类型，但同时保存原始ID
const newNode = {
  id: `${card.id}-${Date.now()}`,
  type: card.type === CardType.TASK ? 'worktask' : card.id,
  // ...
  data: { 
    // ...
    taskId: card.type === CardType.TASK ? card.id : undefined
  }
};

// 统计时优先使用taskId而非type
const nodeTypeId = (node.data && node.data.taskId) || 
                   node.type || 
                   (node.data && node.data.id) || 
                   'default';
counts[nodeTypeId] = (counts[nodeTypeId] || 0) + 1;
```

此解决方案在不破坏现有渲染逻辑的情况下，纠正了计数统计，确保不同工作任务卡正确显示其使用次数。

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

### 通用组件使用指南

工作流模块开发中有一些可复用的通用组件，正确使用这些组件可以提高开发效率和保持UI一致性。

#### 变量操作相关组件

Netsphere系统中有两类主要的变量操作组件，它们各有不同的适用场景：

##### 1. VariableSelector（变量选择器）

**位置**：`client/src/components/variable/VariableSelector.tsx`

**使用场景**：
- 当需要用户选择单个变量标识符时
- 适用于赋值卡的赋值规则配置
- 适用于循环卡的变量路径选择
- 适用于其他需要精确选择一个变量的场景

**主要特点**：
- 基于Antd的Select组件，专注于单一变量选择
- 自动添加@前缀，简化用户操作
- 显示变量类型标记和来源信息
- 支持搜索和过滤功能
- 自动处理标签渲染

**使用示例**：
```tsx
<Form.Item
  name="variablePath"
  rules={[
    { required: true, message: '请选择变量' },
    { validator: (_, value) => validateVariableReference(value) }
  ]}
>
  <VariableSelector
    placeholder="选择变量，例如: @workflow.start"
    value={variablePath}
    onChange={(value: string) => handleVariablePathChange(value)}
    // 可选参数：排除特定来源的变量
    excludeSourceName={currentTaskName}
    // 可选参数：仅显示特定类型的变量
    filterTypes={[VariableType.WORKFLOW, VariableType.TASK]}
  />
</Form.Item>
```

##### 2. VariableEditor（变量编辑器）

**位置**：`client/src/components/workTask/VariableEditor.tsx`

**使用场景**：
- 当需要编辑包含多个变量引用和普通文本的富文本内容时
- 适用于工作任务的提示词编辑
- 适用于需要自由组合文本和变量引用的场景

**主要特点**：
- 基于Slate编辑器，支持富文本编辑
- 支持@触发变量选择菜单
- 在文本中将变量显示为特殊标签
- 支持键盘导航和快捷操作
- 提供完整的编辑体验

**使用示例**：
```tsx
<Form.Item
  name="promptTemplate"
  label="提示词模板"
>
  <VariableEditor
    variables={variables}
    placeholder="编辑提示词，使用@触发变量选择"
    onChange={(value) => setPromptTemplate(value)}
    minHeight="150px"
    // 可选：当前任务名称，用于排除循环引用
    currentTaskName={taskName}
  />
</Form.Item>
```

##### 选择指南

- 使用**VariableSelector**当您需要用户选择单个变量标识符，例如在赋值规则中
- 使用**VariableEditor**当您需要用户编辑包含变量和普通文本混合的内容，例如提示词模板

#### 其他通用组件

##### VariableTag（变量标签）

**位置**：`client/src/components/workTask/VariableTag.tsx`

**使用场景**：
- 当需要在UI中显示变量标识符时
- 通常由VariableSelector和VariableEditor内部使用
- 也可用于只读显示变量

**主要特点**：
- 统一的变量标签样式
- 支持错误状态显示
- 支持删除功能
- 可配置为只读模式

**使用示例**：
```tsx
<VariableTag
  identifier="workflow.start"
  error={isError}
  errorMessage="变量不存在"
  onDelete={handleDelete}
  readOnly={false}
/>
```

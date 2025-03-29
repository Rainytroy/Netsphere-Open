# 全局变量管理模块UI规范与技术开发设计
**版本号**: v1.3.0  
**创建时间**: 2025年3月8日 00:52  
**更新时间**: 2025年3月9日 05:29  
**文档状态**: 已修订  

## 目录
1. [界面结构分析](#界面结构分析)
2. [UI规范设计](#ui规范设计)
3. [变量标识符规范](#变量标识符规范)
4. [技术开发设计](#技术开发设计)
5. [模块变量集成说明](#模块变量集成说明)
6. [模块扩展性设计](#模块扩展性设计)
7. [拓展功能考虑](#拓展功能考虑)
8. [实施计划](#实施计划)

## 界面结构分析

全局变量管理模块包含两个主要页面：

### 1. 全局变量列表页面
- **布局结构**：
  - 左侧为全局固定导航菜单（深色背景），将在所有功能页面中保持一致
  - 顶部为标签导航（"创建变量"和"变量列表"）
  - 主体内容区域采用Card外框包裹的表格布局展示全局变量列表
- **表格设计**：
  - 表格列包括：类型、来源、名称、标识符、值（预览）、操作
  - 类型列使用图标区分不同类型（NPC、工作任务、自定义、文件）
  - 标识符列显示完整的变量引用格式（如`@云透.知识背景`）
  - 值列显示变量内容的摘要（过长则截断并显示省略号）
  - 操作列包含复制标识符按钮，自定义类型还包含编辑和删除按钮
  - 表格支持按类型和来源筛选
  - 表格支持按名称和标识符搜索
- **表格交互**：
  - 点击复制按钮复制变量标识符到剪贴板
  - 点击编辑按钮导航至变量编辑页面（仅对自定义类型可用）
  - 删除操作触发二次确认弹窗，显示具体变量名称

### 2. 变量创建和编辑页面（仅适用于自定义类型）
- **布局结构**：
  - 延续与列表页相同的导航结构
  - 主体内容区域为垂直排列的表单
- **表单字段**：
  - 变量名称（单行文本输入）：placeholder="请输入变量名称（将用于生成标识符）"
  - 变量值（多行文本输入）：placeholder="请输入变量的值"
  - 底部有"创建"按钮（在编辑页面显示为"保存"按钮）
- **编辑页面特点**：
  - 页面标题更改为"编辑变量"
  - 所有字段预填入当前变量的对应值
  - 可选择添加"取消"按钮，点击后返回列表页

## UI规范设计

### 1. 色彩规范
- **主色调**：深蓝色（#1A1F2C，导航背景和主按钮背景）
- **辅助色**：浅灰色（#F5F7FA，页面背景）
- **强调色**：蓝色（#1890FF，可用于按钮悬停等）
- **警告色**：红色（#FF4D4F，用于删除按钮和警告提示）
- **成功色**：绿色（#52C41A，用于保存成功提示）
- **变量类型色**：
  - NPC类型：紫色（#722ED1）
  - 工作任务类型：橙色（#FA8C16）
  - 自定义类型：蓝色（#1890FF）
  - 文件类型：绿色（#52C41A）
- **文本色**：
  - 主要文本：#333333
  - 次要文本：#666666
  - 描述文本：#999999

### 2. 排版规范
- **字体**：
  - 系统默认字体族："PingFang SC", "Microsoft YaHei", sans-serif
- **字号**：
  - 页面标题：18px, 粗体
  - 表单标签：14px, 常规
  - 表格表头：14px, 粗体
  - 表格内容：14px, 常规
  - 变量标识符：14px, 等宽字体（便于区分）
  - 按钮文本：14px, 常规
  - 导航菜单：14px, 常规

### 3. 布局规范
- **间距**：
  - 表格行高：48px
  - 表单字段间距：24px
  - 导航项间距：16px
  - 容器卡片间距：24px（固定间距，使用flex布局的gap属性）
- **表格布局**：
  - 表格所在Card内边距：16px
  - 表格列宽：
    - 类型列：80px（固定宽度）
    - 来源列：120px（固定宽度）
    - 名称列：150px（固定宽度）
    - 标识符列：240px（固定宽度）
    - 值列：自适应宽度
    - 操作列：120px（固定宽度）
- **响应式布局**：
  - 采用flex布局，自动换行（flexWrap: 'wrap'）
  - 对齐方式：顶部对齐（alignItems: 'flex-start'）
- **响应式断点**：
  - 移动端：< 768px
  - 平板：768px - 1024px
  - 桌面：> 1024px

### 4. 组件规范
- **按钮**：
  - 主按钮：深色背景（#1A1F2C），白色文字，圆角4px
  - 次按钮：白色背景，边框色#D9D9D9，文字色#333333
  - 删除按钮：红色图标（#FF4D4F），悬停时加深
  - 复制按钮：蓝色图标（#1890FF），悬停时加深
- **输入框**：
  - 高度：32px（单行）
  - 边框：1px solid #D9D9D9
  - 圆角：4px
  - 聚焦状态：边框色变为#1890FF
  - 自动完成：禁用（autoComplete="off"）
- **表格**：
  - 表头背景色：#FAFAFA
  - 行悬停背景色：#F5F7FA
  - 行边框：1px solid #F0F0F0
  - 分页控件位于表格底部右侧
- **外框**：
  - 列表内容区域使用Card组件包装，与其他模块保持一致
  - 边距：16px内边距
  - 背景色：白色
  - 阴影：0 1px 2px rgba(0,0,0,0.05)
- **弹窗**：
  - 删除确认弹窗：标题"确认删除"，内容"确定要删除 [变量名称] 吗？"
  - 按钮：取消（次按钮）和确认（红色警告按钮）
- **消息提示**：
  - 成功提示：绿色背景，用于保存成功等操作
  - 错误提示：红色背景，用于操作失败情况

## 变量标识符规范

全局变量系统中，标识符是变量在系统内的唯一引用方式，用于在提示词、代码或其他上下文中访问变量的值。为确保所有模块产生的变量标识符一致且易于识别，特制定以下标准规范：

### 1. 标识符格式定义

变量标识符必须遵循以下格式：
```
@{sourceName}.{field}
```

其中：
- `@` 是统一前缀，标记这是一个变量引用
- `{sourceName}` 是变量来源对象的名称（如NPC名称、任务名称等）
- `.` 是固定分隔符
- `{field}` 是具体的属性字段名称

### 2. 格式示例

| 变量类型 | 变量来源 | 字段 | 标识符 |
|---------|---------|------|--------|
| NPC | 云透 | 知识背景 | `@云透.知识背景` |
| NPC | 林小梦 | 行为原则 | `@林小梦.行为原则` |
| 工作任务 | 结构化需求 | 输入 | `@结构化需求.input` |
| 自定义 | 系统设置 | 版本号 | `@系统设置.版本号` |

### 3. 命名规则与限制

1. **来源名称处理**：
   - 来源名称中的特殊字符将被替换为下划线
   - 允许使用中文、英文字母、数字和下划线
   - 来源名称区分大小写

2. **字段名称规则**：
   - 字段名应使用有意义的标识，并与源对象属性保持一致
   - NPC类型：`name`(名称), `description`(描述), `knowledge_background`(知识背景), `action_principles`(行为原则), `activity_level`(活跃度)
   - 工作任务类型：`input`(输入), `output`(输出)
   - 自定义类型：用户定义的字段名，通常为"value"

### 4. 使用IdentifierFormatterService

所有模块在生成变量标识符时，必须使用`IdentifierFormatterService`服务，以确保标识符格式的一致性：

```typescript
// 示例：在NPC模块中生成变量标识符
const identifier = identifierFormatterService.formatIdentifier(
  'npc',       // 源类型
  npc.name,    // 源名称
  'knowledge_background'  // 字段名
);
```

### 5. 标识符更新机制

当源对象名称发生变化时（如NPC重命名），系统将自动更新所有相关变量的标识符：

1. 调用`IdentifierFormatterService.updateIdentifiers`方法
2. 发布`VariableEventType.SOURCE_RENAMED`事件
3. 相关组件收到事件后进行相应更新

### 6. 变量引用与解析

当在提示词或其他场景中引用变量时：

1. 系统会在提交前解析所有符合`@{sourceName}.{field}`格式的标识符
2. 将标识符替换为实际的变量值
3. 对于未找到的变量，可保留原标识符或返回错误提示

## 技术开发设计

### 1. 组件结构

```
/client/src/
  /components/
    /variable/
      VariableTable.tsx          # 全局变量表格组件
      VariableForm.tsx           # 变量表单组件（兼容创建和编辑模式）
      DeleteConfirmModal.tsx     # 删除确认弹窗组件
  /pages/
    /variable/
      VariableListPage.tsx       # 变量列表页面
      VariableCreatePage.tsx     # 变量创建页面
      VariableEditPage.tsx       # 变量编辑页面
  /services/
    variableService.ts           # 变量相关API调用
  /models/
    variable.ts                  # 变量数据模型接口定义
  /utils/
    variableFormatter.ts         # 变量标识符格式化工具
```

### 2. 数据模型设计
```typescript
// 变量类型枚举
export enum VariableType {
  NPC = 'npc',
  TASK = 'task',
  CUSTOM = 'custom',
  FILE = 'file'
}

// 变量来源类型
export type VariableSource = {
  id: string;        // 来源ID
  name: string;      // 来源名称
  type: string;      // 来源类型（如"npc"、"task"等）
};

// 变量数据模型
export interface Variable {
  id: string;                  // 唯一标识
  name: string;                // 变量名称
  type: VariableType;          // 变量类型
  source: VariableSource;      // 变量来源
  identifier: string;          // 标识符（如@云透.知识背景）
  value: string;               // 变量值
  createdAt: Date;             // 创建时间
  updatedAt: Date;             // 更新时间
}

// NPC相关变量的字段类型
export enum NpcVariableField {
  KNOWLEDGE_BACKGROUND = 'knowledgeBackground',
  ACTION_PRINCIPLES = 'actionPrinciples',
  ACTIVITY_LEVEL = 'activityLevel',
  ACTIVITY_LEVEL_DESCRIPTION = 'activityLevelDescription',
  DESCRIPTION = 'description'
}

// 任务相关变量的字段类型
export enum TaskVariableField {
  INPUT = 'input',
  OUTPUT = 'output'
}
```

### 3. API接口设计

```typescript
// 变量服务
export const variableService = {
  // 获取变量列表
  getVariables: async (filters?: { type?: VariableType, sourceId?: string }) => {
    try {
      return await apiClient.get<Variable[]>('/api/variables', { params: filters });
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 获取单个变量详情
  getVariable: async (id: string) => {
    try {
      return await apiClient.get<Variable>(`/api/variables/${id}`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 创建自定义变量
  createVariable: async (variable: Omit<Variable, 'id' | 'type' | 'source' | 'identifier' | 'createdAt' | 'updatedAt'>) => {
    try {
      return await apiClient.post<Variable>('/api/variables', variable);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 更新自定义变量
  updateVariable: async (id: string, variable: Pick<Variable, 'name' | 'value'>) => {
    try {
      return await apiClient.put<Variable>(`/api/variables/${id}`, variable);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 删除自定义变量
  deleteVariable: async (id: string) => {
    try {
      return await apiClient.delete(`/api/variables/${id}`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }
};
```

### 4. 组件实现要点

#### 变量列表页面（VariableListPage.tsx）:
```typescript
const VariableListPage: React.FC = () => {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    loadVariables();
  }, []);
  
  const loadVariables = async () => {
    setLoading(true);
    try {
      const response = await variableService.getVariables();
      setVariables(response.data as Variable[]);
    } catch (error) {
      console.error('加载变量列表失败:', error);
      message.error('加载变量列表失败');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理编辑变量
  const handleEditVariable = (id: string) => {
    navigate(`/variable/edit/${id}`);
  };
  
  // 处理删除变量
  const handleDeleteVariable = async (id: string) => {
    try {
      await variableService.deleteVariable(id);
      message.success('删除成功');
      loadVariables(); // 重新加载列表
    } catch (error) {
      console.error(`删除变量失败 ID=${id}:`, error);
      message.error('删除失败');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4}>全局变量列表</Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/variable/create')}
          style={{ backgroundColor: '#1A1F2C' }}
        >
          创建自定义变量
        </Button>
      </div>
      
      <Card>
        <VariableTable
          variables={variables}
          loading={loading}
          onEdit={handleEditVariable}
          onDelete={handleDeleteVariable}
        />
      </Card>
    </div>
  );
};
```

#### 变量表格组件（VariableTable.tsx）:
```typescript
interface VariableTableProps {
  variables: Variable[];
  loading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const VariableTable: React.FC<VariableTableProps> = ({
  variables,
  loading = false,
  onEdit,
  onDelete
}) => {
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<VariableType | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<Variable | null>(null);
  
  // 处理复制变量标识符
  const handleCopyIdentifier = (identifier: string) => {
    navigator.clipboard.writeText(identifier);
    message.success('已复制到剪贴板');
  };
  
  // 显示删除确认对话框
  const showDeleteConfirm = (variable: Variable) => {
    setSelectedVariable(variable);
    setDeleteModalVisible(true);
  };
  
  // 处理删除确认
  const handleDelete = () => {
    if (selectedVariable && onDelete) {
      onDelete(selectedVariable.id);
    }
    setDeleteModalVisible(false);
  };
  
  // 过滤变量列表
  const filteredVariables = variables.filter(variable => {
    const matchesSearch = searchText === '' || 
      variable.name.toLowerCase().includes(searchText.toLowerCase()) ||
      variable.identifier.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesType = typeFilter === null || variable.type === typeFilter;
    
    return matchesSearch && matchesType;
  });
  
  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: VariableType) => {
        const icons = {
          [VariableType.NPC]: <UserOutlined style={{ color: '#722ED1' }} />,
          [VariableType.TASK]: <FileTextOutlined style={{ color: '#FA8C16' }} />,
          [VariableType.CUSTOM]: <EditOutlined style={{ color: '#1890FF' }} />,
          [VariableType.FILE]: <FileOutlined style={{ color: '#52C41A' }} />
        };
        return <Tooltip title={type}>{icons[type]}</Tooltip>;
      },
      filters: [
        { text: 'NPC', value: VariableType.NPC },
        { text: '工作任务', value: VariableType.TASK },
        { text: '自定义', value: VariableType.CUSTOM },
        { text: '文件', value: VariableType.FILE }
      ],
      onFilter: (value: string, record: Variable) => record.type === value,
      width: 80
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (source: VariableSource) => source.name,
      width: 120
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 150
    },
    {
      title: '标识符',
      dataIndex: 'identifier',
      key: 'identifier',
      render: (identifier: string) => (
        <Typography.Text copyable={{ text: identifier }} code>
          {identifier}
        </Typography.Text>
      ),
      width: 180
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      ellipsis: true,
      render: (value: string) => (
        <Tooltip title={value}>
          <Typography.Text ellipsis style={{ maxWidth: 300 }}>
            {value}
          </Typography.Text>
        </Tooltip>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: Variable) => (
        <Space size="middle">
          <Tooltip title="复制标识符">
            <Button 
              type="text" 
              icon={<CopyOutlined style={{ color: '#1890FF' }} />} 
              onClick={() => handleCopyIdentifier(record.identifier)} 
            />
          </Tooltip>
          
          {record.type === VariableType.CUSTOM && onEdit && (
            <Tooltip title="编辑">
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                onClick={() => onEdit(record.id)} 
              />
            </Tooltip>
          )}
          
          {record.type === VariableType.CUSTOM && onDelete && (
            <Tooltip title="删除">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
                onClick={() => showDeleteConfirm(record)} 
              />
            </Tooltip>
          )}
        </Space>
      ),
      width: 120
    }
  ];
  
  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="搜索变量名称或标识符"
          allowClear
          onSearch={value => setSearchText(value)}
          style={{ width: 250 }}
        />
        <Select
          placeholder="筛选类型"
          allowClear
          onChange={value => setTypeFilter(value)}
          style={{ width: 150 }}
        >
          <Select.Option value={VariableType.NPC}>NPC</Select.Option>
          <Select.Option value={VariableType.TASK}>工作任务</Select.Option>
          <Select.Option value={VariableType.CUSTOM}>自定义</Select.Option>
          <Select.Option value={VariableType.FILE}>文件</Select.Option>
        </Select>
      </Space>
      
      <Table
        columns={columns}
        dataSource={filteredVariables}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
      
      <DeleteConfirmModal
        visible={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={handleDelete}
        title="确认删除"
        content={`确定要删除变量 ${selectedVariable?.name} 吗？`}
      />
    </>
  );
};
```

#### 变量表单组件（VariableForm.tsx）:
```typescript
interface VariableFormProps {
  initialValues?: Partial<Variable>;
  onSubmit: (values: Pick<Variable, 'name' | 'value'>) => void;
  submitButtonText: string;
  loading?: boolean;
}

const VariableForm: React.FC<VariableFormProps> = ({
  initialValues,
  onSubmit,
  submitButtonText = '创建',
  loading = false
}) => {
  const [form] = Form.useForm();
  
  const handleSubmit = (values: any) => {
    onSubmit(values);
  };
  
  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={handleSubmit}
      autoComplete="off"
    >
      <Form.Item
        label="变量名称"
        name="name"
        rules={[
          { required: true, message: '请输入变量名称' },
          { pattern: /^[a-zA-Z0-9\u4e00-\u9fa5_]+$/, message: '变量名称只能包含字母、数字、汉字和下划线' }
        ]}
      >
        <Input placeholder="请输入变量名称（将用于生成标识符）" />
      </Form.Item>
      
      <Form.Item
        label="变量值"
        name="value"
        rules={[{ required: true, message: '请输入变量的值' }]}
      >
        <Input.TextArea rows={6} placeholder="请输入变量的值" />
      </Form.Item>
      
      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          style={{ backgroundColor: '#1A1F2C' }}
        >
          {submitButtonText}
        </Button>
      </Form.Item>
    </Form>
  );
};
```

## 模块变量集成说明

系统中不同功能模块会自动为全局变量系统提供变量源，目前主要包括NPC模块和工作任务模块。全局变量系统采用统一的集成机制处理所有类型的变量源。

### NPC模块变量

1. **自动变量生成**
   - 当用户在NPC模块创建新的NPC时，系统自动为该NPC生成相应的全局变量
   - 每个NPC会生成5个全局变量：知识背景、行动原则、积极性参数、积极性参数描述、描述

2. **变量同步更新**
   - NPC相关的全局变量会随NPC属性的变化自动更新
   - 当修改NPC的任何属性时，对应的全局变量值也会自动更新
   - 当删除NPC时，其关联的全局变量也会被自动删除

3. **标识符格式**
   - NPC生成的变量标识符遵循`@NPC名称.字段`的格式，例如`@云透.知识背景`
   - 当NPC名称更改时，其所有变量的标识符也会自动更新

### 工作任务模块变量

1. **自动变量生成**
   - 当用户创建新的工作任务时，系统自动为该任务生成input和output全局变量
   - 每个工作任务默认生成两个变量：输入(input)和输出(output)

2. **变量同步更新**
   - 工作任务相关的全局变量会随任务内容的变化自动更新
   - 当修改工作任务信息时，对应的变量值也会自动更新
   - 当删除工作任务时，其关联的全局变量也会被自动删除

3. **标识符格式**
   - 工作任务生成的变量标识符遵循`@任务名称.字段`的格式，例如`@对需求结构化.input`
   - 当工作任务名称更改时，其所有变量的标识符也会自动更新

### 通用变量处理规则

1. **显示与权限**
   - 所有自动生成的变量都会显示在全局变量列表中，便于查看和复制标识符
   - 用户不能直接编辑这些自动生成的变量，仅能编辑自定义类型的变量
   - 系统会清晰标识每个变量的类型和来源

2. **数据一致性**
   - 系统确保变量数据与其源模块数据的一致性
   - 采用事件驱动机制保证数据同步的实时性和准确性

## 模块扩展性设计

全局变量模块采用高扩展性设计，允许系统中的新模块轻松地成为变量源，为全局变量系统提供新的变量类型：

### 1. 变量源注册机制

```typescript
// 变量源接口定义
export interface VariableSourceProvider {
  // 获取该源的所有变量
  getVariables(): Promise

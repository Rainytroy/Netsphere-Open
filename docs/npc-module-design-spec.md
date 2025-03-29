# NPC管理模块UI规范与技术开发设计
**版本号**: v1.2.0  
**创建时间**: 2025年3月7日 11:18  
**更新时间**: 2025年3月9日 05:25
**文档状态**: 已审核  

## 目录
1. [界面结构分析](#界面结构分析)
2. [UI规范设计](#ui规范设计)
3. [技术开发设计](#技术开发设计)
4. [拓展功能考虑](#拓展功能考虑)
5. [实施计划](#实施计划)

## 界面结构分析

NPC管理模块包含三个主要页面：

### 1. NPC列表页面
- **布局结构**：
  - 左侧为全局固定导航菜单（深色背景），将在所有功能页面中保持一致
  - 顶部为标签导航（"创建NPC"和"NPC列表"）
  - 主体内容区域采用Card外框包裹的卡片布局展示NPC列表
- **卡片设计**：
  - 每个NPC卡片包含头像（圆形）、名称（"云透"）和NPC ID
  - 卡片右下角包含删除操作按钮
  - 卡片采用白色背景，轻微阴影效果（`boxShadow: '0 2px 8px rgba(0,0,0,0.08)'`）
  - 卡片宽度固定（280px）
  - 卡片有过渡动画效果（`transition: 'all 0.3s'`）
  - 卡片文本超出处理采用两行截断策略，带有省略号提示
  - 删除操作触发二次确认弹窗，显示具体NPC名称："确定要删除 [NPC名称] 吗？"
  - **卡片点击行为**：点击卡片的任何区域（包括头像和内容）将导航至该NPC的编辑页面

### 2. NPC创建页面
- **布局结构**：
  - 延续与列表页相同的导航结构
  - 主体内容区域为垂直排列的表单
- **表单字段**：
  - NPC名称（单行文本输入）：placeholder="请输入NPC名称"
  - 头像上传（带默认人物图标）
  - 知识背景（多行文本输入）：placeholder="请描述NPC的知识范围、专业领域、背景故事等"
  - 行动原则（多行文本输入）：placeholder="请描述NPC的行为准则、道德标准、决策原则等"
  - 积极性参数（分为两部分）：
    - 参数值：数字输入框，范围0-1，步长0.1，默认值为1，宽度100%
    - 参数描述：多行文本输入，placeholder="请描述积极性参数的影响和作用"
  - 描述（选填，多行文本输入）：placeholder="（选填）简短描述NPC的特点和职责"
  - 底部有"创建"按钮（深色背景，与导航菜单配色一致）

### 3. NPC编辑页面
- **布局结构**：
  - 与创建页面保持一致的布局，包括导航和表单布局
  - 页面标题更改为"编辑NPC"
- **表单字段**：
  - 与创建页面相同的字段结构
  - 所有字段预填入当前NPC的对应值
  - 头像显示当前NPC的头像，支持更新
- **操作按钮**：
  - 底部的"创建"按钮改为"保存"按钮
  - 可选择添加"取消"按钮，点击后返回列表页
  - 可选择添加"重置"按钮，恢复为原始数据

## UI规范设计

### 1. 色彩规范
- **主色调**：深蓝色（#1A1F2C，导航背景和主按钮背景）
- **辅助色**：浅灰色（#F5F7FA，页面背景）
- **强调色**：蓝色（#1890FF，可用于按钮悬停等）
- **警告色**：红色（#FF4D4F，用于删除按钮和警告提示）
- **成功色**：绿色（#52C41A，用于保存成功提示）
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
  - 输入文本：14px, 常规
  - 按钮文本：14px, 常规
  - 导航菜单：14px, 常规
  - NPC ID：12px, 常规

### 3. 布局规范
- **间距**：
  - 卡片内边距：16px
  - 表单字段间距：24px
  - 导航项间距：16px
- **卡片布局**：
  - 卡片宽度：固定宽度 280px
  - 卡片间距：24px（固定间距，使用flex布局的gap属性）
  - 布局方式：flex布局，自动换行（flexWrap: 'wrap'）
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
- **输入框**：
  - 高度：32px（单行）
  - 边框：1px solid #D9D9D9
  - 圆角：4px
  - 聚焦状态：边框色变为#1890FF
  - 自动完成：禁用（autoComplete="off"）
- **卡片**：
  - 背景色：白色
  - 阴影：0 2px 8px rgba(0,0,0,0.08)
  - 圆角：4px
  - 悬停效果：轻微提升阴影，光标变为pointer
  - 文本溢出处理：两行截断，带省略号
  - 点击区域：整个卡片可点击（包括头像区域）
- **外框**：
  - 列表内容区域使用Card组件包装，与其他模块保持一致
  - 边距：16px内边距
  - 背景色：白色
  - 阴影：0 1px 2px rgba(0,0,0,0.05)
- **弹窗**：
  - 删除确认弹窗：标题"确认删除"，内容"确定要删除 [NPC名称] 吗？"
  - 按钮：取消（次按钮）和确认（红色警告按钮）
- **消息提示**：
  - 成功提示：绿色背景，用于保存成功等操作
  - 错误提示：红色背景，用于操作失败情况

## 技术开发设计

### 1. 组件结构

```
/client/src/
  /components/
    /layout/
      MainLayout.tsx         # 全局布局组件，包含侧边导航
    /npc/
      NpcCard.tsx            # NPC卡片组件（包含删除功能和点击导航）
      NpcForm.tsx            # NPC表单组件（兼容创建和编辑模式）
      AvatarUploader.tsx     # 头像上传组件
      DeleteConfirmModal.tsx # 删除确认弹窗组件
  /pages/
    /npc/
      NpcListPage.tsx        # NPC列表页面
      NpcCreatePage.tsx      # NPC创建页面
      NpcEditPage.tsx        # NPC编辑页面
  /services/
    npcService.ts            # NPC相关API调用
  /models/
    npc.ts                   # NPC数据模型接口定义
```

### 2. 数据模型设计
```typescript
// NPC数据模型
export interface Npc {
  id: string;
  name: string;
  avatar?: string;                 // 头像URL
  knowledgeBackground: string;     // 知识背景
  actionPrinciples: string;        // 行动原则
  activityLevel: number;           // 积极性参数 (0-1)
  activityLevelDescription: string; // 积极性参数描述
  description?: string;            // 描述信息
  files?: {                        // 关联文件
    images: string[];
    documents: string[];
    searchResults: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. API接口设计

使用增强的错误处理机制，通过async/await和try/catch确保错误被正确捕获和处理：

```typescript
// NPC服务
export const npcService = {
  // 获取NPC列表
  getNpcs: async () => {
    try {
      return await apiClient.get<Npc[]>('/api/npc');
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 获取单个NPC详情
  getNpc: async (id: string) => {
    try {
      return await apiClient.get<Npc>(`/api/npc/${id}`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 创建NPC
  createNpc: async (npc: Omit<Npc, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      return await apiClient.post<Npc>('/api/npc', npc);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 更新NPC
  updateNpc: async (id: string, npc: Partial<Npc>) => {
    try {
      return await apiClient.put<Npc>(`/api/npc/${id}`, npc);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 删除NPC
  deleteNpc: async (id: string) => {
    try {
      return await apiClient.delete(`/api/npc/${id}`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
    
  // 上传NPC头像
  uploadAvatar: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiClient.post(`/api/npc/${id}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};
```

### 4. 组件实现要点

#### NPC表单组件（NpcForm.tsx - 共用于创建和编辑）:
```typescript
interface NpcFormProps {
  initialValues?: Partial<Npc>; // 编辑模式下提供初始值
  onSubmit: (values: Omit<Npc, 'id' | 'createdAt' | 'updatedAt'>) => void;
  submitButtonText: string; // "创建"或"保存"
  loading?: boolean;
}

const NpcForm: React.FC<NpcFormProps> = ({ 
  initialValues, 
  onSubmit, 
  submitButtonText = '创建', 
  loading = false 
}) => {
  const [form] = Form.useForm();
  // 使用命名空间方式引用React hooks
  const [avatarUrl, setAvatarUrl] = React.useState<string | undefined>(initialValues?.avatar);
  
  // 处理表单提交
  const handleSubmit = (values: any) => {
    const formData = {
      ...values,
      avatar: avatarUrl
    };
    
    // 默认积极性参数为1
    if (formData.activityLevel === undefined) {
      formData.activityLevel = 1;
    }
    
    onSubmit(formData);
  };
  
  // 处理头像上传
  const handleAvatarChange = (url: string) => {
    setAvatarUrl(url);
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
        label="NPC名称" 
        name="name"
        rules={[{ required: true, message: '请输入NPC名称' }]}
      >
        <Input placeholder="请输入NPC名称" />
      </Form.Item>
      
      <Form.Item label="头像（选填）">
        <AvatarUploader
          value={avatarUrl}
          onChange={handleAvatarChange}
        />
      </Form.Item>
      
      <Form.Item 
        label="知识背景" 
        name="knowledgeBackground"
        rules={[{ required: true, message: '请输入知识背景' }]}
      >
        <TextArea 
          rows={6} 
          placeholder="请描述NPC的知识范围、专业领域、背景故事等" 
        />
      </Form.Item>
      
      <Form.Item 
        label="行动原则" 
        name="actionPrinciples"
        rules={[{ required: true, message: '请输入行动原则' }]}
      >
        <TextArea 
          rows={6} 
          placeholder="请描述NPC的行为准则、道德标准、决策原则等" 
        />
      </Form.Item>
      
      <Form.Item 
        label="积极性参数" 
        name="activityLevel"
        initialValue={1}
        rules={[{ required: true, message: '请输入积极性参数' }]}
      >
        <InputNumber 
          min={0} 
          max={1} 
          step={0.1} 
          style={{ width: '100%' }} 
        />
      </Form.Item>
      
      <Form.Item 
        label="积极性参数描述" 
        name="activityLevelDescription"
        rules={[{ required: true, message: '请输入积极性参数描述' }]}
      >
        <TextArea 
          rows={4} 
          placeholder="请描述积极性参数的影响和作用" 
        />
      </Form.Item>
      
      <Form.Item
        label="描述"
        name="description"
      >
        <TextArea
          rows={3}
          placeholder="（选填）简短描述NPC的特点和职责"
        />
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

#### NPC卡片组件（NpcCard.tsx）:
```typescript
interface NpcCardProps {
  npc: Npc;
  onDelete: (id: string) => void;
  onClick: (id: string) => void; // 点击卡片导航至编辑页面
}

const NpcCard: React.FC<NpcCardProps> = ({ npc, onDelete, onClick }) => {
  // 使用命名空间方式引用React hooks
  const [deleteModalVisible, setDeleteModalVisible] = React.useState(false);
  
  // 显示删除确认对话框
  const showDeleteConfirm = (e: React.MouseEvent) => {
    // 阻止事件冒泡，避免触发卡片点击事件
    e.stopPropagation();
    setDeleteModalVisible(true);
  };
  
  // 处理删除确认
  const handleDelete = () => {
    onDelete(npc.id);
    setDeleteModalVisible(false);
  };
  
  // 处理卡片点击，导航到编辑页面
  const handleCardClick = () => {
    onClick(npc.id);
  };
  
  return (
    <Card
      hoverable
      style={{ 
        width: 280, 
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'all 0.3s',
        position: 'relative'
      }}
      cover={
        <div 
          style={{ textAlign: 'center', padding: '16px 0', cursor: 'pointer' }} 
          onClick={handleCardClick}
        >
          <Avatar 
            src={npc.avatar} 
            size={64}
            icon={!npc.avatar && <UserOutlined />}
          />
        </div>
      }
    >
      {/* 删除按钮 - 独立于卡片点击区域 */}
      <Tooltip title="删除">
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={showDeleteConfirm}
          style={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            zIndex: 10
          }}
        />
      </Tooltip>
      
      {/* 卡片内容区域 - 点击进入详情 */}
      <div onClick={handleCardClick} style={{ cursor: 'pointer' }}>
        <Card.Meta 
          title={npc.name} 
          description={`ID: ${npc.id}`} 
        />
        <p style={{ 
          marginTop: 8, 
          color: '#666', 
          fontSize: 14,
          height: 42, 
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          paddingRight: 24 // 为删除按钮留出空间
        }}>
          {npc.description || npc.knowledgeBackground.substring(0, 50) + '...'}
        </p>
      </div>
      
      <DeleteConfirmModal
        visible={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={handleDelete}
        title="确认删除"
        content={`确定要删除 ${npc.name} 吗？`}
      />
    </Card>
  );
};
```

#### NPC列表页面(NpcListPage.tsx):
```typescript
const NpcListPage: React.FC = () => {
  const [npcs, setNpcs] = React.useState<Npc[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const navigate = useNavigate();

  // 页面加载时获取NPC列表
  React.useEffect(() => {
    loadNpcs();
  }, []);

  // 加载NPC列表数据
  const loadNpcs = async () => {
    try {
      setLoading(true);
      const response = await npcService.getNpcs();
      setNpcs(response.data);
    } catch (error) {
      console.error('加载NPC列表失败:', error);
      message.error('加载NPC列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理NPC删除
  const handleDeleteNpc = async (id: string) => {
    try {
      await npcService.deleteNpc(id);
      message.success('NPC删除成功');
      // 重新加载列表
      loadNpcs();
    } catch (error) {
      console.error('删除NPC失败:', error);
      message.error('删除NPC失败');
    }
  };

  // 跳转到NPC编辑页面
  const handleEditNpc = (id: string) => {
    navigate(`/npc/edit/${id}`);
  };

  // 跳转到NPC创建页面
  const handleCreateNpc = () => {
    navigate('/npc/create');
  };

  return (
    <div className="npc-list-page">
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>NPC管理</Typography.Title>
              <Typography.Text type="secondary">创建和管理系统中的NPC角色</Typography.Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateNpc}
              style={{ backgroundColor: '#1A1F2C' }}
            >
              创建NPC
            </Button>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin tip="加载中..." />
        </div>
      ) : npcs.length === 0 ? (
        <Empty
          description="暂无NPC数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Card>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '24px',
            alignItems: 'flex-start'
          }}>
            {npcs.map((npc) => (
              <div key={npc.id}>
                <NpcCard
                  npc={npc}
                  onDelete={handleDeleteNpc}
                  onClick={handleEditNpc}
                />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
```

#### NPC编辑页面:
```typescript
const NpcEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [npc, setNpc] = React.useState<Npc | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [submitLoading, setSubmitLoading] = React.useState(false);
  
  React.useEffect(() => {
    if (id) {
      loadNpc(id);
    }
  }, [id]);
  
  const loadNpc = async (npcId: string) => {
    setLoading(true);
    try {
      const response = await npcService.getNpc(npcId);
      setNpc(response.data);
    } catch (error) {
      message.error('加载NPC数据失败');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (values: Omit<Npc, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!id || !npc) return;
    
    setSubmitLoading(true);
    try {
      await npcService.updateNpc(id, values);
      message.success('保存成功');
      navigate('/npc/list');
    } catch (error) {
      message.error('保存失败');
    } finally {
      setSubmitLoading(false);
    }
  };
  
  if (loading) {
    return <Spin tip="加载中..." />;
  }
  
  if (!npc) {
    return <Alert message="未找到NPC数据" type="error" />;
  }
  
  return (
    <div>
      <PageHeader
        title="编辑NPC"
        onBack={() => navigate('/npc/list')}
      />
      
      <NpcForm
        initialValues={npc}
        onSubmit={handleSubmit}
        submitButtonText="保存"
        loading={submitLoading}
      />
    </div>
  );
};
```

### 5. 路由配置:
```jsx
<Routes>
  <Route path="/" element={<MainLayout />}>
    <Route index element={<Navigate to="/npc/list" />} />
    <Route path="/npc">
      <Route path="list" element={<NpcListPage />} />
      <Route path="create" element={<NpcCreatePage />} />
      <Route path="edit/:id" element={<NpcEditPage />} />
    </Route>
  </Route>
</Routes>
```

### 6. 后端API接口:
```
GET    /api/npc          - 获取NPC列表
POST   /api/npc          - 创建新NPC
GET    /api/npc/:id      - 获取单个NPC详情
PUT    /api/npc/:id      - 更新NPC
DELETE /api/npc/:id      - 删除NPC
POST   /api/npc/:id/avatar - 上传NPC头像
```

## 拓展功能考虑

以下功能在第一版本暂不实现，作为未来迭代的参考：

1. **NPC详情页**：展示NPC的全部信息和相关任务
2. **批量操作**：支持选择多个NPC进行批量删除等操作
3. **标签系统**：为NPC添加标签，便于分类和筛选
4. **导入/导出**：支持NPC数据的导入和导出功能
5. **历史版本**：记录NPC修改历史，支持回滚到之前版本

## 实施计划

### 第一阶段（基础功能实现）
1. 创建全局布局组件（MainLayout）
2. 实现NPC数据模型和服务
3. 开发NPC列表页面和卡片组件
4. 实现NPC创建表单
5. 开发NPC编辑页面和功能
6. 编写后端API接口

### 第二阶段（完善和优化）
1. 优化用户体验，添加加载状态和错误处理
2. 实现表单验证和数据安全性检查
3. 添加单元测试和集成测试
4. 性能优化和代码重构

## 详细开发步骤

### 1. 后端开发

#### 1.1 数据模型实现
- 完善`Npc.ts`模型，确保包含所有必要字段（已有基础版本）
- 创建相关数据库迁移/模式
- 实现数据访问层

#### 1.2 控制器实现
- 开发`NpcController.ts`，实现以下接口：
  - 获取NPC列表 (GET /api/npc)
  - 获取单个NPC详情 (GET /api/npc/:id)
  - 创建NPC (POST /api/npc)
  - 更新NPC (PUT /api/npc/:id)
  - 删除NPC (DELETE /api/npc/:id)
  - 上传NPC头像 (POST /api/npc/:id/avatar)

#### 1.3 路由配置
- 创建`routes/npc.ts`，配置所有NPC相关路由
- 在主应用中注册这些路由

#### 1.4 文件上传服务
- 实现文件上传服务，用于处理NPC头像
- 配置文件存储位置和访问权限

### 2. 前端开发

#### 2.1 共用组件实现
- 开发`components/npc/NpcCard.tsx`（NPC卡片组件）
- 开发`components/npc/NpcForm.tsx`（NPC表单组件，用于创建和编辑）
- 开发`components/npc/AvatarUploader.tsx`（头像上传组件）
- 开发`components/npc/DeleteConfirmModal.tsx`（删除确认弹窗）

#### 2.2 API服务实现
- 创建`services/npcService.ts`，实现与后端API的交互
- 实现错误处理和加载状态管理

#### 2.3 页面组件实现
- 开发`pages/npc/NpcListPage.tsx`（NPC列表页面）
- 开发`pages/npc/NpcCreatePage.tsx`（NPC创建页面）
- 开发`pages/npc/NpcEditPage.tsx`（NPC编辑页面）

#### 2.

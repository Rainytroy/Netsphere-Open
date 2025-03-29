# 全局变量系统UI设计规范

**版本号**: v2.1.0  
**创建时间**: 2025年3月18日  
**最后更新**: 2025年3月18日  
**文档状态**: 已定稿  
**关键词**: 变量UI, 色彩规范, 标识符组件

## 色彩规范

### 主要色彩
- **主色调**：深蓝色（#1A1F2C）- 导航背景和主按钮背景
- **辅助色**：浅灰色（#F5F7FA）- 页面背景
- **强调色**：蓝色（#1890FF）- 按钮悬停、选中状态
- **警告色**：红色（#FF4D4F）- 删除按钮和警告提示
- **成功色**：绿色（#52C41A）- 保存成功提示

### 变量类型色彩
- **NPC类型**：
  - 文本/边框色：#1890FF
  - 背景色：#E6F7FF
- **工作任务类型**：
  - 文本/边框色：#389E0D (更新：由#52C41A改为#389E0D以增强辨识度)
  - 背景色：#E3F9D3 (更新：由#F6FFED改为#E3F9D3以增强辨识度)
- **自定义类型**：
  - 文本/边框色：#FA8C16
  - 背景色：#FFF7E6
- **文件类型**：
  - 文本/边框色：#13C2C2
  - 背景色：#E6FFFB
- **工作流类型**：
  - 文本/边框色：#722ED1
  - 背景色：#F9F0FF

### 文本色彩
- **主要文本**：#333333
- **次要文本**：#666666
- **描述文本**：#999999
- **标识符文本**：#0050b3（等宽字体）
- **系统标识符**：#888888（较浅色，表示这是系统内部使用）
- **显示标识符**：#0050b3（较深色，表示这是面向用户的）

## 自定义变量显示规范

最新更新：自定义变量在变量列表中的显示规则已更新为：

- **来源列**：显示变量的名称（如"测试用"）而非原来的"自定义变量"
- **名称列**：固定显示"值"
- **值列**：显示变量的实际值

例如一个名为"测试用"的自定义变量，在表格中将显示为：

| 类型   | 来源   | 名称 | 系统标识符 | 显示标识符       | 值      |
|-------|-------|-----|----------|----------------|---------|
| 自定义 | 测试用 | 值   | @gv_123_value | @测试用.value#123 | Hello世界 |

## 排版规范

### 字体族

基础字体族：
```css
font-family: "PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

标识符等宽字体族：
```css
font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
```

### 字号规范

- **页面标题**：18px, 粗体
- **区块标题**：16px, 粗体
- **表单标签**：14px, 常规
- **表格表头**：14px, 半粗体
- **表格内容**：14px, 常规
- **变量标识符**：13px, 等宽字体
- **按钮文本**：14px, 常规
- **提示文本**：12px, 常规

### 间距规范

- **卡片内边距**：16px
- **表单项间距**：24px
- **按钮间距**：12px
- **表格行高**：48px
- **图标与文本间距**：8px
- **标签间距**：4px（水平）, 8px（垂直）

## 组件设计

### 标识符显示组件

变量标识符显示组件是新系统中的核心UI元素，设计为同时展示显示标识符和系统标识符：

```jsx
// 标识符显示组件示例代码
const IdentifierBadge = ({ variable }) => {
  // 检查是否有显示标识符，如果没有则使用系统标识符
  const displayId = variable.displayIdentifier || variable.identifier;
  
  return (
    <Tooltip title={variable.value || '无值'} placement="top">
      <div className="identifier-container">
        {/* 显示标识符 */}
        <Typography.Text code ellipsis className="display-identifier">
          {displayId}
        </Typography.Text>
        
        {/* 如果有两种标识符，显示系统标识符（较小字号） */}
        {variable.displayIdentifier && variable.identifier !== variable.displayIdentifier && (
          <Typography.Text type="secondary" className="system-identifier">
            {variable.identifier}
          </Typography.Text>
        )}
        
        {/* 复制按钮 */}
        <Button 
          type="text" 
          size="small"
          icon={<CopyOutlined />} 
          onClick={() => copyToClipboard(variable.identifier)}
          className="copy-button"
        />
      </div>
    </Tooltip>
  );
};
```

### 变量标签组件更新

变量标签组件已更新，移除了固定的monospace字体设置，改为使用全局字体，同时优化了各类型变量的色彩方案，特别是工作任务类型的颜色已更新为更易识别的深绿色：

```jsx
// 获取变量类型的颜色
const getTypeColor = (variableType?: VariableType): { bgColor: string, borderColor: string, textColor: string } => {
  if (error) {
    return {
      bgColor: '#FFF1F0',
      borderColor: '#F5222D',
      textColor: '#F5222D'
    };
  }
  
  switch (variableType) {
    case VariableType.NPC:
      return {
        bgColor: '#E6F7FF',
        borderColor: '#1890FF',
        textColor: '#1890FF'
      };
    case VariableType.TASK:
      return {
        bgColor: '#E3F9D3', // 更深的绿色背景
        borderColor: '#389E0D', // 更深的绿色边框
        textColor: '#389E0D' // 更深的绿色文本
      };
    case VariableType.CUSTOM:
      return {
        bgColor: '#FFF7E6',
        borderColor: '#FA8C16',
        textColor: '#FA8C16'
      };
    case VariableType.FILE:
      return {
        bgColor: '#E6FFFB',
        borderColor: '#13C2C2',
        textColor: '#13C2C2'
      };
    case VariableType.WORKFLOW:
      return {
        bgColor: '#F9F0FF',
        borderColor: '#722ED1',
        textColor: '#722ED1'
      };
    default:
      return {
        bgColor: '#E6F4FF',
        borderColor: '#0F56B3',
        textColor: '#0F56B3'
      };
  }
};
```

### 变量表格设计

表格中的变量显示经过优化，同时支持系统标识符和显示标识符，以及专门为自定义变量优化的显示逻辑：

```jsx
{
  title: '来源',
  dataIndex: 'source',
  key: 'source',
  render: (source: any, record: Variable) => {
    // 为自定义变量显示变量名称作为来源
    if (record.type === VariableType.CUSTOM) {
      return record.name;
    }
    return source.name;
  },
  width: 120
},
{
  title: '名称',
  dataIndex: 'name',
  key: 'name',
  render: (name: string, record: Variable) => {
    // 为自定义变量固定显示"值"
    if (record.type === VariableType.CUSTOM) {
      return '值';
    }
    return name;
  },
  width: 150
}
```

### 变量类型图标组件

为不同类型的变量设计专门的图标，以在UI中快速区分：

```jsx
// 变量类型图标组件
const TypeIcon = ({ type }) => {
  const iconMap = {
    'npc': <UserOutlined style={{ color: '#1890FF' }} />,          // 蓝色
    'task': <FileTextOutlined style={{ color: '#389E0D' }} />,     // 深绿色（更新）
    'custom': <EditOutlined style={{ color: '#FA8C16' }} />,       // 橙色
    'file': <FileOutlined style={{ color: '#13C2C2' }} />,         // 青色
    'workflow': <NodeIndexOutlined style={{ color: '#722ED1' }} /> // 紫色
  };
  
  return iconMap[type] || <QuestionCircleOutlined />;
};
```

## 显示标识符格式规范

显示标识符（Display Identifier）的格式已标准化为：`@变量名称.字段名#ID简写`

- **变量名称**: 实际变量名称（对于自定义变量，使用变量自身的name属性，如"测试用"）
- **字段名**: 通常为"value"
- **ID简写**: entityId的最后4位(如果是数字型ID)或前4位(如果是非数字型ID)

示例：
- NPC类型变量：`@张三.description#6721`
- 工作任务变量：`@每日报告.output#9df3`
- 自定义变量：`@测试用.value#5432`

## 页面布局规范

### 变量列表页

- 顶部为操作区：包含搜索框、筛选器和创建按钮
- 主体为表格区：展示所有变量
- 表格支持分页、排序和筛选

#### 表格列宽规范

- **类型列**：80px（固定宽度）
- **来源列**：120px（固定宽度）
- **名称列**：150px（固定宽度）
- **标识符列**：240px（固定宽度）
- **值列**：自适应宽度（flex: 1）
- **操作列**：120px（固定宽度）

### 变量编辑页

- 使用表单布局
- 字段标签位于左侧
- 表单项间距为24px
- 底部为操作按钮区：包含取消和提交按钮

## 变量UI最佳实践

1. **保持标识符可读性**：
   - 总是使用显示标识符（@变量名称.字段名#ID简写）向用户展示
   - 在后台处理中使用系统标识符（@gv_UUID_field格式）
   
2. **自定义变量展示**：
   - 在列表中，使用变量名称作为"来源"
   - 固定使用"值"作为名称
   - 显示标识符格式保持为: `@变量名称.value#ID简写`

3. **颜色区分**：
   - 使用统一的颜色系统区分不同类型变量
   - 为工作任务变量使用更深的绿色(#389E0D)以提高可识别性
   - 背景色使用主色的浅色调，以增强视觉舒适度

4. **字体一致性**：
   - 变量标签使用系统全局字体，不再特别指定等宽字体
   - 保留标识符文本的等宽字体样式

## 相关文档

- [系统概述与标识符规范](./variable-system-overview.md)
- [系统架构设计](./variable-system-architecture.md)
- [变量源集成指南](./variable-source-integration.md)
- [迁移与最佳实践](./variable-system-migration.md)

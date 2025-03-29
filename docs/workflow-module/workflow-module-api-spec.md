# 工作流模块API接口规范

**版本号**: v1.0.0  
**创建时间**: 2025年3月13日  
**文档状态**: 初稿  

> 本文档是Netsphere工作流模块的API接口规范，详细说明前后端交互的API接口设计。
> 概念设计请参见：[工作流模块概念设计](workflow-module-concept-design.md)
> 技术实现细节请参见：[工作流模块技术规范](workflow-module-technical-spec.md)
> UI组件设计请参见：[工作流模块UI组件规范](workflow-module-ui-component-spec.md)

## 目录
1. [API设计原则](#1-api设计原则)
2. [通用数据结构](#2-通用数据结构)
3. [工作流管理API](#3-工作流管理api)
4. [工作流节点与连接API](#4-工作流节点与连接api)
5. [工作流执行API](#5-工作流执行api)
6. [异常处理](#6-异常处理)
7. [WebSocket通知API](#7-websocket通知api)

## 1. API设计原则

### 1.1 基本原则

- **RESTful设计**：遵循REST架构风格
- **统一URL结构**：`/api/workflows/...`
- **版本控制**：API路径包含版本号
- **JSON格式**：请求和响应主体使用JSON格式
- **HTTP状态码**：使用标准HTTP状态码表示请求结果
- **错误格式统一**：统一的错误响应格式

### 1.2 响应格式

所有API响应使用以下标准格式：

```json
{
  "success": true,
  "data": { ... },  // 成功时的数据
  "error": null     // 成功时为null
}
```

错误响应格式：

```json
{
  "success": false,
  "data": null,     // 错误时为null
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

### 1.3 身份验证

API调用需要包含身份验证信息，使用Bearer Token认证：

```
Authorization: Bearer <token>
```

## 2. 通用数据结构

### 2.1 工作流结构

```typescript
interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;  // ISO 8601格式
  updatedAt: string;  // ISO 8601格式
  lastRunAt?: string; // ISO 8601格式
}
```

### 2.2 节点结构

```typescript
interface WorkflowNode {
  id: string;
  workflowId: string;
  type: 'start' | 'work_task' | 'display' | 'assignment' | 'loop' | 'ai_judgment' | 'workflow';
  name?: string;
  position: {
    x: number;
    y: number;
  };
  config: any; // 节点特定配置
  data?: any;  // 节点运行时数据
}
```

### 2.3 连接结构

```typescript
interface WorkflowConnection {
  id: string;
  workflowId: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string; // 例如"Yes"/"No"
  config?: any;   // 连接特定配置
}
```

### 2.4 执行结构

```typescript
interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'canceled' | 'waiting';
  input?: any;
  output?: any;
  nodeStates: {
    [nodeId: string]: {
      status: 'idle' | 'running' | 'completed' | 'failed' | 'waiting';
      startTime?: string;
      endTime?: string;
      runCount: number;
      output?: any;
    }
  };
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

## 3. 工作流管理API

### 3.1 获取工作流列表

**请求**:
- **方法**: GET
- **路径**: `/api/workflows`
- **查询参数**:
  - `page`: 页码，默认1
  - `pageSize`: 每页记录数，默认10
  - `status`: 过滤工作流状态，可选值：`active`, `draft`, `archived`，默认返回所有
  - `search`: 搜索关键词，匹配工作流名称和描述

**响应**:
- **成功**: 200 OK
```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "id": "uuid1",
        "name": "文章生成工作流",
        "description": "自动生成文章的工作流",
        "status": "active",
        "createdAt": "2025-03-01T08:00:00Z",
        "updatedAt": "2025-03-10T15:30:00Z",
        "lastRunAt": "2025-03-12T12:00:00Z"
      },
      // 更多工作流...
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 35,
      "totalPages": 4
    }
  },
  "error": null
}
```

### 3.2 创建工作流

**请求**:
- **方法**: POST
- **路径**: `/api/workflows`
- **请求体**:
```json
{
  "name": "新工作流",
  "description": "工作流描述"
}
```

**响应**:
- **成功**: 201 Created
```json
{
  "success": true,
  "data": {
    "id": "newly-created-uuid",
    "name": "新工作流",
    "description": "工作流描述",
    "status": "draft",
    "createdAt": "2025-03-13T16:00:00Z",
    "updatedAt": "2025-03-13T16:00:00Z"
  },
  "error": null
}
```

### 3.3 获取工作流详情

**请求**:
- **方法**: GET
- **路径**: `/api/workflows/{id}`

**响应**:
- **成功**: 200 OK
```json
{
  "success": true,
  "data": {
    "id": "workflow-uuid",
    "name": "示例工作流",
    "description": "工作流详细描述",
    "status": "active",
    "createdAt": "2025-03-01T08:00:00Z",
    "updatedAt": "2025-03-10T15:30:00Z",
    "lastRunAt": "2025-03-12T12:00:00Z",
    "nodes": [
      // 工作流节点列表
    ],
    "edges": [
      // 工作流连接列表
    ]
  },
  "error": null
}
```

- **失败**: 404 Not Found
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "WORKFLOW_NOT_FOUND",
    "message": "找不到指定的工作流"
  }
}
```

### 3.4 更新工作流

**请求**:
- **方法**: PUT
- **路径**: `/api/workflows/{id}`
- **请求体**:
```json
{
  "name": "更新的工作流名称",
  "description": "更新的描述",
  "status": "active"
}
```

**响应**:
- **成功**: 200 OK
```json
{
  "success": true,
  "data": {
    "id": "workflow-uuid",
    "name": "更新的工作流名称",
    "description": "更新的描述",
    "status": "active",
    "createdAt": "2025-03-01T08:00:00Z",
    "updatedAt": "2025-03-13T16:10:00Z",
    "lastRunAt": "2025-03-12T12:00:00Z"
  },
  "error": null
}
```

### 3.5 删除工作流

**请求**:
- **方法**: DELETE
- **路径**: `/api/workflows/{id}`

**响应**:
- **成功**: 200 OK
```json
{
  "success": true,
  "data": {
    "message": "工作流已成功删除"
  },
  "error": null
}
```

### 3.6 复制工作流

**请求**:
- **方法**: POST
- **路径**: `/api/workflows/{id}/copy`
- **请求体**: 可选
```json
{
  "name": "复制后的工作流名称" // 可选，默认为原名称加"-副本"
}
```

**响应**:
- **成功**: 201 Created
```json
{
  "success": true,
  "data": {
    "id": "newly-copied-uuid",
    "name": "复制后的工作流名称",
    "description": "原工作流描述",
    "status": "draft",
    "createdAt": "2025-03-13T16:15:00Z",
    "updatedAt": "2025-03-13T16:15:00Z"
  },
  "error": null
}
```

## 4. 工作流节点与连接API

### 4.1 获取工作流节点列表

**请求**:
- **方法**: GET
- **路径**: `/api/workflows/{workflowId}/nodes`

**响应**:
- **成功**: 200 OK
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "node-uuid-1",
        "workflowId": "workflow-uuid",
        "type": "start",
        "name": "起点",
        "position": { "x": 100, "y": 100 },
        "config": {
          "promptText": "请输入主题"
        }
      },
      // 更多节点...
    ]
  },
  "error": null
}
```

### 4.2 创建工作流节点

**请求**:
- **方法**: POST
- **路径**: `/api/workflows/{workflowId}/nodes`
- **请求体**:
```json
{
  "type": "work_task",
  "name": "文章生成任务",
  "position": { "x": 200, "y": 200 },
  "config": {
    "workTaskId": "task-uuid",
    "variableSource": "article-generator"
  }
}
```

**响应**:
- **成功**: 201 Created
```json
{
  "success": true,
  "data": {
    "id": "newly-created-node-uuid",
    "workflowId": "workflow-uuid",
    "type": "work_task",
    "name": "文章生成任务",
    "position": { "x": 200, "y": 200 },
    "config": {
      "workTaskId": "task-uuid",
      "variableSource": "article-generator"
    },
    "createdAt": "2025-03-13T16:20:00Z",
    "updatedAt": "2025-03-13T16:20:00Z"
  },
  "error": null
}
```

### 4.3 更新工作流节点

**请求**:
- **方法**: PUT
- **路径**: `/api/workflows/{workflowId}/nodes/{nodeId}`
- **请求体**:
```json
{
  "name": "更新后的节点名称",
  "position": { "x": 250, "y": 250 },
  "config": {
    "workTaskId": "new-task-uuid",
    "variableSource": "updated-source"
  }
}
```

**响应**:
- **成功**: 200 OK
```json
{
  "success": true,
  "data": {
    "id": "node-uuid",
    "workflowId": "workflow-uuid",
    "type": "work_task",
    "name": "更新后的节点名称",
    "position": { "x": 250, "y": 250 },
    "config": {
      "workTaskId": "new-task-uuid",
      "variableSource": "updated-source"
    },
    "updatedAt": "2025-03-13T16:25:00Z"
  },
  "error": null
}
```

### 4.4 删除工作流节点

**请求**:
- **方法**: DELETE
- **路径**: `/api/workflows/{workflowId}/nodes/{nodeId}`

**响应**:
- **成功**: 200 OK
```json
{
  "success": true,
  "data": {
    "message": "节点已成功删除"
  },
  "error": null
}
```

### 4.5 获取工作流连接列表

**请求**:
- **方法**: GET
- **路径**: `/api/workflows/{workflowId}/connections`

**响应**:
- **成功**: 200 OK
```json
{
  "success": true,
  "data": {
    "connections": [
      {
        "id": "connection-uuid-1",
        "workflowId": "workflow-uuid",
        "sourceNodeId": "node-uuid-1",
        "targetNodeId": "node-uuid-2",
        "label": null,
        "config": {}
      },
      {
        "id": "connection-uuid-2",
        "workflowId": "workflow-uuid",
        "sourceNodeId": "node-uuid-3",
        "targetNodeId": "node-uuid-4",
        "label": "Yes",
        "config": {
          "color": "#52C41A"
        }
      },
      // 更多连接...
    ]
  },
  "error": null
}
```

### 4.6 创建工作流连接

**请求**:
- **方法**: POST
- **路径**: `/api/workflows/{workflowId}/connections`
- **请求体**:
```json
{
  "sourceNodeId": "node-uuid-source",
  "targetNodeId": "node-uuid-target",
  "label": "Yes",
  "config": {
    "color": "#52C41A"
  }
}
```

**响应**:
- **成功**: 201 Created
```json
{
  "success": true,
  "data": {
    "id": "newly-created-connection-uuid",
    "workflowId": "workflow-uuid",
    "sourceNodeId": "node-uuid-source",
    "targetNodeId": "node-uuid-target",
    "label": "Yes",
    "config": {
      "color": "#52C41A"
    },
    "createdAt": "2025-03-13T16:30:00Z",
    "updatedAt": "2025-03-13T16:30:00Z"
  },
  "error": null
}
```

### 4.7 更新工作流连接

**请求**:
- **方法**: PUT
- **路径**: `/api/workflows/{workflowId}/connections/{connectionId}`
- **请求体**:
```json
{
  "label": "No",
  "config": {
    "color": "#FF4D4F"
  }
}
```

**响应**:
- **成功**: 200 OK
```json
{
  "success": true,
  "data": {
    "id": "connection-uuid",
    "workflowId": "workflow-uuid",
    "sourceNodeId": "node-uuid-source",
    "targetNodeId": "node-uuid-target",
    "label": "No",
    "config": {
      "color": "#FF4D4F"
    },
    "updatedAt": "2025-03-13T16:35:00Z"
  },
  "error": null
}
```

### 4.8 删除工作流连接

**请求**:
- **方法**: DELETE
- **路径**: `/api/workflows/{workflowId}/connections/{connectionId}`

**响应**:
- **成功**: 200 OK
```json
{
  "success": true,
  "data": {
    "message": "连接已成功删除"
  },
  "error": null
}
```

## 5. 工作流执行API

### 5.1 执行工作流

**请求**:
- **方法**: POST
- **路径**: `/api/workflows/{workflowId}/execute`
- **请求体**: 可选
```json
{
  "input": "用户输入的内容"
}
```

**响应**:
- **成功**: 202 Accepted
```json
{
  "success": true,
  "data": {
    "executionId": "execution-uuid",
    "status": "running",
    "startedAt": "2025-03-13T16:40:00Z",
    "message": "工作流已开始执行"
  },
  "error": null
}
```

### 5.2 获取工作流执行状态

**请求**:
- **方法**: GET
- **路径**: `/api/workflows/{workflowId}/executions/{executionId}`

**响应**:
- **成功**: 200 OK
```json
{
  "success": true,
  "data": {
    "id": "execution-uuid",
    "workflowId": "workflow-uuid",
    "status": "running",
    "input": "用户输入的内容",
    "nodeStates": {
      "node-uuid-1": {
        "status": "completed",
        "startTime": "2025-03-13T16:40:05Z",
        "endTime": "2025-03-13T16:40:10Z",
        "runCount": 1,
        "output": { "result": "节点1的输出" }
      },
      "node-uuid-2": {
        "status": "running",
        "startTime": "2025-03-13T16:40:15Z",
        "runCount": 0
      },
      // 更多节点状态...
    },
    "startedAt": "2025-03-13T16:40:00Z",
    "createdAt": "2025-03-13T16:40:00Z",
    "updatedAt": "2025-03-13T16:40:15Z"
  },
  "error": null
}
```

### 5.3 取消工作流执行

**请求**:
- **方法**: POST
- **路径**: `/api/workflows/{workflowId}/executions/{executionId}/cancel`

**响应**:
- **成功**: 200 OK
```json
{
  "success": true,
  "data": {
    "id": "execution-uuid",
    "status": "canceled",
    "message": "工作流执行已取消"
  },
  "error": null
}
```

### 5.4 获取工作流执行历史

**请求**:
- **方法**: GET
- **路径**: `/api/workflows/{workflowId}/executions`
- **查询参数**:
  - `page`: 页码，默认1
  - `pageSize`: 每页记录数，默认10
  - `status`: 过滤执行状态，可选值：`running`, `completed`, `failed`, `canceled`

**响应**:
- **成功**: 200 OK
```json
{
  "success": true,
  "data": {
    "executions": [
      {
        "id": "execution-uuid-1",
        "workflowId": "workflow-uuid",
        "status": "completed",
        "startedAt": "2025-03-12T16:00:00Z",
        "completedAt": "2025-03-12T16:05:00Z",
        "createdAt": "2025-03-12T16:00:00Z",
        "updatedAt": "2025-03-12T16:05:00Z"
      },
      // 更多执行记录...
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 45,
      "totalPages": 5
    }
  },
  "error": null
}
```

## 6. 异常处理

### 6.1 错误码定义

| 错误码 | 描述 | HTTP状态码 |
|--------|------|------------|
| `WORKFLOW_NOT_FOUND` | 找不到指定的工作流 | 404 |
| `NODE_NOT_FOUND` | 找不到指定的节点 | 404 |
| `CONNECTION_NOT_FOUND` | 找不到指定的连接 | 404 |
| `EXECUTION_NOT_FOUND` | 找不到指定的执行记录 | 404 |
| `INVALID_REQUEST` | 请求参数无效 | 400 |
| `WORKFLOW_VALIDATION_ERROR` | 工作流验证错误 | 400 |
| `CIRCULAR_REFERENCE` | 检测到循环引用 | 400 |
| `EXECUTION_IN_PROGRESS` | 工作流已在执行中 | 409 |
| `UNAUTHORIZED` | 未授权访问 | 401 |
| `FORBIDDEN` | 禁止访问 | 403 |
| `INTERNAL_ERROR` | 服务器内部错误 | 500 |

### 6.2 错误响应示例

- **400 Bad Request**:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "请求参数无效",
    "details": {
      "name": "工作流名称不能为空",
      "type": "卡片类型必须是有效值"
    }
  }
}
```

- **404 Not Found**:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "WORKFLOW_NOT_FOUND",
    "message": "找不到ID为'invalid-uuid'的工作流"
  }
}
```

- **500 Internal Server Error**:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "服务器内部错误，请联系管理员",
    "requestId": "req-123456" // 用于追踪错误
  }
}
```

## 7. WebSocket通知API

### 7.1 连接建立

客户端通过以下URL建立WebSocket连接：

```
ws://server.example.com/api/ws/workflows
```

需要包含身份验证信息：

```
ws://server.example.com/api/ws/workflows?token=<auth-token>
```

### 7.2 执行状态通知

服务器发送的JSON消息格式：

```json
{
  "type": "execution_update",
  "data": {
    "executionId": "execution-uuid",
    "workflowId": "workflow-uuid",
    "status": "running",
    "nodeStates": {
      "node-uuid-1": {
        "status": "completed",
        "startTime": "2025-03-13T16:40:05Z",
        "endTime": "2025-03-13T16:40:10Z",
        "runCount": 1
      },
      "node-uuid-2": {
        "status": "running",
        "startTime": "2025-03-13T16:40:15Z",
        "runCount": 0
      }
    },
    "updatedAt": "2025-03-13T16:40:15Z"
  }
}
```

### 7.3 输出更新通知

服务器发送的JSON消息格式：

```json
{
  "type": "output_update",
  "data": {
    "executionId": "execution-uuid",
    "workflowId": "workflow-uuid",
    "nodeId": "node-uuid",
    "output": {
      "content": "新的输出内容",
      "displayMode": "generate",
      "timestamp": "2025-03-13T16:41:00Z"
    }
  }
}
```

### 7.4 错误通知

服务器发送的JSON消息格式：

```json
{
  "type": "execution_error",
  "data": {
    "executionId": "execution-uuid",
    "workflowId": "workflow-uuid",
    "nodeId": "node-uuid",
    "error": {
      "code": "NODE_EXECUTION_ERROR",
      "message": "节点执行时发生错误: 无法解析变量引用"
    },
    "timestamp": "2025-03-13T16:42:00Z"
  }
}
```

### 7.5 心跳消息

客户端需要定期（每30秒）发送心跳消息以保持连接：

```json
{
  "type": "ping",
  "timestamp": "2025-03-13T16:45:00Z"
}
```

服务器响应：

```json
{
  "type": "pong",
  "timestamp": "2025-03-13T16:45:00Z"
}

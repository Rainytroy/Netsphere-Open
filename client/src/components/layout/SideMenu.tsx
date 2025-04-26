import * as React from 'react';
import { Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppstoreOutlined,
  UserOutlined,
  SettingOutlined,
  ExperimentOutlined,
  PartitionOutlined,
  DatabaseOutlined,
  ApiOutlined,
  BugOutlined,
  SyncOutlined,
  ApiTwoTone,
} from '@ant-design/icons';
import { ENABLE_WORKFLOW } from '../../config';

const { SubMenu } = Menu;

const SideMenu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 根据当前路径确定选中的菜单项
  const getSelectedMenuKey = () => {
    const { pathname } = location;
    
    // 特殊处理子页面，让它们选中对应主菜单
    if (pathname.startsWith('/npc/')) {
      return '/npc/list';
    }
    
    if (pathname.startsWith('/variable/')) {
      return '/variable/list'; 
    }
    
    if (pathname.startsWith('/task') || pathname.startsWith('/work-task/')) {
      return '/task';
    }
    
    if (pathname.startsWith('/workflow/')) {
      return '/workflow';
    }
    
    if (pathname.startsWith('/ai-service/')) {
      return '/ai-service';
    }
    
    // 默认返回当前路径或首页
    return pathname === '/' ? '/' : pathname;
  };

  // 不再需要自动打开子菜单，让所有菜单都默认收起
  const getOpenKeys = () => {
    return [];
  };

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[getSelectedMenuKey()]}
      defaultOpenKeys={getOpenKeys()}
    >
      <Menu.Item key="/" icon={<AppstoreOutlined />} onClick={() => navigate('/')}>
        首页
      </Menu.Item>
      
      <Menu.Item key="/npc/list" icon={<UserOutlined />} onClick={() => navigate('/npc/list')}>
        NPC管理
      </Menu.Item>
      
      <Menu.Item key="/task" icon={<ExperimentOutlined />} onClick={() => navigate('/task')}>
        工作任务
      </Menu.Item>
      
      {/* 工作流菜单项 - 受功能标记控制 */}
      {ENABLE_WORKFLOW && (
        <Menu.Item key="/workflow" icon={<PartitionOutlined />} onClick={() => navigate('/workflow')}>
          工作流
        </Menu.Item>
      )}
      
      {/* 变量管理不再使用子菜单 */}
      <Menu.Item key="/variable/list" icon={<DatabaseOutlined />} onClick={() => navigate('/variable/list')}>
        变量管理
      </Menu.Item>
      
      <Menu.Item key="/ai-service" icon={<ApiOutlined />} onClick={() => navigate('/ai-service')}>
        AI服务
      </Menu.Item>
      
      <Menu.Item key="/settings" icon={<SettingOutlined />} onClick={() => navigate('/settings')}>
        设置
      </Menu.Item>
    </Menu>
  );
};

export default SideMenu;

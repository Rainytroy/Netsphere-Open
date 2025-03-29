import * as React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography } from 'antd';
import { ENABLE_WORKFLOW } from '../../config';
import {
  AppstoreOutlined,
  UserOutlined,
  SettingOutlined,
  ExperimentOutlined,
  PartitionOutlined,
  DatabaseOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // 根据当前路径确定选中的菜单项
  const getSelectedMenuKey = () => {
    const { pathname } = location;
    
    // 特殊处理变量调试页面，让它选中变量列表菜单
    if (pathname === '/variable/debug') {
      return '/variable/list';
    }
    
    // 其他情况根据路径前缀匹配
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
  
  // 自动折叠导航栏 - 工作流编辑、创建和使用页面
  React.useEffect(() => {
    const isWorkflowEditOrUse = 
      location.pathname.includes('/workflow/') && 
      (location.pathname.includes('/edit') || 
       location.pathname.includes('/use') || 
       location.pathname === '/workflow/create');
    
    if (isWorkflowEditOrUse) {
      setCollapsed(true);
    }
  }, [location.pathname]);

  const menuItems = [
    {
      key: '/',
      icon: <AppstoreOutlined />,
      label: '首页',
      onClick: () => navigate('/'),
    },
    {
      key: '/npc/list',
      icon: <UserOutlined />,
      label: 'NPC管理',
      onClick: () => navigate('/npc/list'),
    },
    {
      key: '/task',
      icon: <ExperimentOutlined />,
      label: '工作任务',
      onClick: () => navigate('/task'),
    },
    // 工作流菜单项 - 受功能标记控制
    ...(ENABLE_WORKFLOW ? [{
      key: '/workflow',
      icon: <PartitionOutlined />,
      label: '工作流',
      onClick: () => navigate('/workflow'),
    }] : []),
    {
      key: '/variable/list',
      icon: <DatabaseOutlined />,
      label: '全局变量',
      onClick: () => navigate('/variable/list'),
    },
    {
      key: '/ai-service',
      icon: <ApiOutlined />,
      label: 'AI服务',
      onClick: () => navigate('/ai-service'),
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
      onClick: () => navigate('/settings'),
    },
  ];

  // 计算内容区域的左侧内边距，根据侧边栏是否折叠而变化
  const contentMarginLeft = collapsed ? 80 : 200;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '0 24px', 
        background: '#001529',
        position: 'fixed',
        zIndex: 2,
        width: '100%',
        height: 64
      }}>
        <Title level={4} style={{ color: 'white', margin: 0 }}>
          Netsphere
        </Title>
      </Header>
      <Layout style={{ marginTop: 64 }}>
        <Sider 
          collapsible 
          collapsed={collapsed} 
          onCollapse={(value) => setCollapsed(value)}
          width={200}
          style={{
            overflow: 'auto',
            height: 'calc(100vh - 64px)',
            position: 'fixed',
            left: 0,
            top: 64,
            bottom: 0,
            zIndex: 1
          }}
        >
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[getSelectedMenuKey()]}
            items={menuItems}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Layout style={{ padding: '24px', marginLeft: contentMarginLeft, transition: 'margin-left 0.2s' }}>
          <Content
            style={{
              padding: 24,
              margin: 0,
              background: '#fff',
              borderRadius: '4px',
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default MainLayout;

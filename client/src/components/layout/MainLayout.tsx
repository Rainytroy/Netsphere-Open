import * as React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Layout, Typography } from 'antd';
import SideMenu from './SideMenu';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState(false);
  const location = useLocation();
  
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
          <SideMenu />
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

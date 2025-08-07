import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';

// Pages
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import Dashboard from '@/pages/Dashboard';
import Accounts from '@/pages/Accounts';
import AccountDetail from '@/pages/AccountDetail';
import Tasks from '@/pages/Tasks';
import TaskDetail from '@/pages/TaskDetail';
import CreateTask from '@/pages/CreateTask';
import Statistics from '@/pages/Statistics';
import Settings from '@/pages/Settings';
import Profile from '@/pages/Profile';

import '@/styles/globals.css';

// 创建 React Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5分钟
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 6,
          },
        }}
      >
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <Router>
                <div className="App">
                  <Routes>
                    {/* 公开路由 */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    
                    {/* 受保护的路由 */}
                    <Route path="/" element={
                      <ProtectedRoute>
                        <Layout />
                      </ProtectedRoute>
                    }>
                      <Route index element={<Navigate to="/dashboard" replace />} />
                      <Route path="dashboard" element={<Dashboard />} />
                      
                      {/* 账号管理 */}
                      <Route path="accounts" element={<Accounts />} />
                      <Route path="accounts/:accountId" element={<AccountDetail />} />
                      
                      {/* 任务管理 */}
                      <Route path="tasks" element={<Tasks />} />
                      <Route path="tasks/create" element={<CreateTask />} />
                      <Route path="tasks/:taskId" element={<TaskDetail />} />
                      
                      {/* 统计分析 */}
                      <Route path="statistics" element={<Statistics />} />
                      
                      {/* 设置 */}
                      <Route path="settings" element={<Settings />} />
                      <Route path="profile" element={<Profile />} />
                    </Route>
                    
                    {/* 404 重定向 */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                  
                  {/* 全局通知 */}
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: '#fff',
                        color: '#333',
                        border: '1px solid #d9d9d9',
                        borderRadius: '6px',
                        fontSize: '14px',
                      },
                      success: {
                        iconTheme: {
                          primary: '#52c41a',
                          secondary: '#fff',
                        },
                      },
                      error: {
                        iconTheme: {
                          primary: '#ff4d4f',
                          secondary: '#fff',
                        },
                      },
                    }}
                  />
                </div>
              </Router>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
};

export default App;
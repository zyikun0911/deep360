// 用户相关类型
export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'agent';
  permissions: string[];
  plan: 'free' | 'basic' | 'pro' | 'enterprise';
  limits: {
    maxAccounts: number;
    maxTasks: number;
    dailyMessages: number;
    storageSpace: number;
  };
  usage: {
    accountsUsed: number;
    tasksCreated: number;
    messagesSent: number;
    storageUsed: number;
  };
  status: 'active' | 'suspended' | 'banned';
  emailVerified: boolean;
  lastLogin: string;
  settings: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      browser: boolean;
      taskComplete: boolean;
      accountStatus: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
}

// 账号相关类型
export interface Account {
  _id: string;
  userId: string;
  accountId: string;
  name: string;
  type: 'whatsapp' | 'telegram';
  phoneNumber?: string;
  botToken?: string;
  status: 'pending' | 'scanning' | 'connected' | 'disconnected' | 'banned' | 'error';
  qrCode?: string;
  
  profile: {
    name?: string;
    avatar?: string;
    bio?: string;
    isVerified: boolean;
    followerCount: number;
    followingCount: number;
  };
  
  config: {
    isEnabled: boolean;
    autoReconnect: boolean;
    messageDelay: number;
    dailyMessageLimit: number;
    hourlyMessageLimit: number;
    groupLimit: number;
    
    autoReply: {
      enabled: boolean;
      keywords: string[];
      response: string;
      delay: number;
    };
    
    autoAcceptGroups: boolean;
    autoAcceptContacts: boolean;
    aiEnabled: boolean;
    aiModel: string;
    aiPrompt?: string;
    translateEnabled: boolean;
    targetLanguage: string;
  };
  
  stats: {
    messagesSent: number;
    messagesReceived: number;
    groupsJoined: number;
    contactsAdded: number;
    tasksCompleted: number;
    uptime: number;
    lastActivity: string;
  };
  
  health: {
    lastHeartbeat: string;
    errorCount: number;
    lastError?: {
      message: string;
      timestamp: string;
      stack?: string;
    };
    connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  };
  
  container?: {
    id: string;
    name: string;
    image: string;
    status: string;
    port: number;
    createdAt: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

// 任务相关类型
export type TaskType = 
  | 'bulk_message'
  | 'group_create'
  | 'group_invite'
  | 'group_kick'
  | 'contact_add'
  | 'auto_reply'
  | 'content_scrape'
  | 'data_export'
  | 'ai_content';

export interface Task {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  type: TaskType;
  
  config: {
    accounts: string[];
    targets: any;
    content: {
      text?: string;
      media?: Array<{
        type: string;
        url: string;
        filename: string;
        caption?: string;
      }>;
      template?: string;
      variables?: any;
    };
    
    schedule: {
      type: 'immediate' | 'delayed' | 'recurring';
      startTime?: string;
      endTime?: string;
      interval?: number;
      cron?: string;
      timezone: string;
    };
    
    limits: {
      maxTargets: number;
      messageDelay: number;
      retryTimes: number;
      timeout: number;
    };
    
    advanced: {
      randomDelay: boolean;
      skipExisting: boolean;
      validateTargets: boolean;
      aiGenerate: boolean;
      translateContent: boolean;
    };
  };
  
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  
  progress: {
    total: number;
    completed: number;
    failed: number;
    skipped: number;
    percentage: number;
  };
  
  result: {
    summary?: {
      totalTargets: number;
      successCount: number;
      failureCount: number;
      skipCount: number;
      duration: number;
    };
    details: Array<{
      target: string;
      account: string;
      status: 'success' | 'failed' | 'skipped';
      message: string;
      timestamp: string;
      error?: string;
    }>;
    logs: string[];
    artifacts: Array<{
      type: string;
      filename: string;
      path: string;
      size: number;
      createdAt: string;
    }>;
  };
  
  executionTime: {
    startedAt?: string;
    completedAt?: string;
    estimatedDuration?: number;
    actualDuration?: number;
  };
  
  dependencies: Array<{
    taskId: string;
    condition: 'success' | 'completion' | 'failure';
  }>;
  
  errors: Array<{
    code: string;
    message: string;
    details: any;
    timestamp: string;
    resolved: boolean;
  }>;
  
  createdAt: string;
  updatedAt: string;
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: string[];
}

// 分页响应类型
export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Socket 事件类型
export interface SocketEvent {
  timestamp: string;
  userId?: string;
  accountId?: string;
  taskId?: string;
}

export interface NotificationEvent extends SocketEvent {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: any;
  persistent?: boolean;
}

export interface TaskUpdateEvent extends SocketEvent {
  taskId: string;
  status: string;
  progress?: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
  };
}

export interface AccountUpdateEvent extends SocketEvent {
  accountId: string;
  status: string;
  qrCode?: string;
  profile?: any;
  error?: string;
}

export interface MessageEvent extends SocketEvent {
  messageId: string;
  chatId: string;
  userId: string;
  text?: string;
  type: string;
  date: number;
  chatType: string;
  isGroup: boolean;
  user: {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
  chat: {
    id: string;
    type: string;
    title?: string;
    username?: string;
  };
}

// 图表数据类型
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface TimeSeriesData {
  time: string;
  value: number;
  category?: string;
}

// 统计数据类型
export interface Statistics {
  overview: {
    totalAccounts: number;
    activeAccounts: number;
    totalTasks: number;
    completedTasks: number;
    totalMessages: number;
    todayMessages: number;
  };
  
  accountStats: {
    byType: ChartData[];
    byStatus: ChartData[];
    healthDistribution: ChartData[];
  };
  
  taskStats: {
    byType: ChartData[];
    byStatus: ChartData[];
    successRate: number;
  };
  
  messageStats: {
    daily: TimeSeriesData[];
    hourly: TimeSeriesData[];
    byAccount: ChartData[];
  };
  
  performance: {
    systemUptime: number;
    averageResponseTime: number;
    errorRate: number;
    resourceUsage: {
      cpu: number;
      memory: number;
      storage: number;
    };
  };
}

// 系统设置类型
export interface SystemSettings {
  general: {
    siteName: string;
    siteUrl: string;
    supportEmail: string;
    defaultLanguage: string;
    defaultTimezone: string;
  };
  
  email: {
    provider: string;
    host: string;
    port: number;
    username: string;
    password: string;
    secure: boolean;
  };
  
  security: {
    jwtSecret: string;
    jwtExpiry: string;
    passwordMinLength: number;
    enableTwoFactor: boolean;
    sessionTimeout: number;
  };
  
  limits: {
    free: {
      maxAccounts: number;
      maxTasks: number;
      dailyMessages: number;
      storageSpace: number;
    };
    basic: {
      maxAccounts: number;
      maxTasks: number;
      dailyMessages: number;
      storageSpace: number;
    };
    pro: {
      maxAccounts: number;
      maxTasks: number;
      dailyMessages: number;
      storageSpace: number;
    };
    enterprise: {
      maxAccounts: number;
      maxTasks: number;
      dailyMessages: number;
      storageSpace: number;
    };
  };
  
  features: {
    enableRegistration: boolean;
    enableEmailVerification: boolean;
    enableSocialLogin: boolean;
    enableAI: boolean;
    enableWebhooks: boolean;
  };
}
import React from 'react';
import { useQuery } from 'react-query';
import { 
  Ticket, 
  FolderOpen, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { api, endpoints } from '../../services/api.ts';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { cn } from '../../utils/cn.ts';

interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  totalProjects: number;
  totalUsers: number;
}

interface RecentTicket {
  id: string;
  title: string;
  status: string;
  priority: string;
  project: {
    id: string;
    name: string;
  };
  assignee?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>(
    'dashboard-stats',
    async () => {
      // In a real app, you'd have a dedicated dashboard endpoint
      // For now, we'll simulate the data
      return {
        totalTickets: 24,
        openTickets: 8,
        inProgressTickets: 6,
        resolvedTickets: 10,
        totalProjects: 5,
        totalUsers: 12,
      };
    }
  );

  const { data: recentTickets, isLoading: ticketsLoading } = useQuery<RecentTicket[]>(
    'recent-tickets',
    async () => {
      const response = await api.get(endpoints.tickets.list, {
        params: { limit: 5, page: 1 }
      });
      return response.data.tickets;
    }
  );

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'OPEN': 'status-open',
      'IN_PROGRESS': 'status-in-progress',
      'REVIEW': 'status-review',
      'TESTING': 'status-testing',
      'RESOLVED': 'status-resolved',
      'CLOSED': 'status-closed',
    };
    return statusColors[status] || 'status-open';
  };

  const getPriorityColor = (priority: string) => {
    const priorityColors: Record<string, string> = {
      'LOW': 'priority-low',
      'MEDIUM': 'priority-medium',
      'HIGH': 'priority-high',
      'URGENT': 'priority-urgent',
    };
    return priorityColors[priority] || 'priority-medium';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (statsLoading || ticketsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName || user?.username}! 👋
        </h1>
        <p className="mt-1 text-gray-600">
          Here's what's happening with your projects and tickets today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Tickets */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <Ticket className="w-5 h-5 text-primary-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Tickets</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.totalTickets}</p>
            </div>
          </div>
        </div>

        {/* Open Tickets */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-warning-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Open Tickets</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.openTickets}</p>
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.inProgressTickets}</p>
            </div>
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Resolved</p>
              <p className="text-2xl font-semibold text-gray-900">{stats?.resolvedTickets}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Projects and Users Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Projects */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Active Projects</h3>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-3xl font-bold text-gray-900">{stats?.totalProjects}</span>
            <span className="ml-2 text-sm text-gray-500">active projects</span>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <TrendingUp className="w-4 h-4 text-success-500 mr-1" />
            <span>2 new this month</span>
          </div>
        </div>

        {/* Users */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-3xl font-bold text-gray-900">{stats?.totalUsers}</span>
            <span className="ml-2 text-sm text-gray-500">team members</span>
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <TrendingUp className="w-4 h-4 text-success-500 mr-1" />
            <span>3 joined this month</span>
          </div>
        </div>
      </div>

      {/* Recent Tickets */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Tickets</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentTickets?.map((ticket) => (
            <div key={ticket.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {ticket.title}
                    </p>
                    <span className={cn('badge', getStatusColor(ticket.status))}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span className={cn('badge', getPriorityColor(ticket.priority))}>
                      {ticket.priority}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center text-sm text-gray-500">
                    <span className="truncate">{ticket.project.name}</span>
                    {ticket.assignee && (
                      <>
                        <span className="mx-2">•</span>
                        <span className="truncate">
                          Assigned to {ticket.assignee.firstName || ticket.assignee.username}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0 text-sm text-gray-500">
                  {formatDate(ticket.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 bg-gray-50 text-right">
          <a
            href="/tickets"
            className="text-sm font-medium text-primary-600 hover:text-primary-500"
          >
            View all tickets →
          </a>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <Ticket className="w-5 h-5 mr-2 text-gray-400" />
            Create Ticket
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <FolderOpen className="w-5 h-5 mr-2 text-gray-400" />
            New Project
          </button>
          <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
            <Users className="w-5 h-5 mr-2 text-gray-400" />
            Invite Member
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

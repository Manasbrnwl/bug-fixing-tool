import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { api, endpoints } from '../../services/api.ts';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface TicketDetailData {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  project:any;
  type:string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  assignedTo: string;
}

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery<TicketDetailData>(['ticket', id], async () => {
    const res = await api.get(`${endpoints.tickets.list}/${id}`);
    return res.data.ticket || res.data;
  }, { enabled: !!id });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="animate-spin mr-2" /> Loading ticket...
      </div>
    );
  }

  if (!data) {
    return <div className="text-gray-600">Ticket not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Link to="/tickets" className="btn btn-ghost px-2">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-semibold">{data.title}</h1>
      </div>

      <div className="flex flex-col p-5">
        <div className="md:col-span-2 space-y-4">
          <div className="card p-3">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Project Name</h3>
            <p className="text-gray-800 whitespace-pre-wrap">{data.project.name}</p>
          </div>
          <div className="card p-3">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
            <p className="text-gray-800 whitespace-pre-wrap">{data.description}</p>
          </div>
          <div className="card p-3">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Raised On</h3>
            <p className="text-gray-800 whitespace-pre-wrap">{data.createdAt.split("T")[0]}</p>
          </div>
        </div>
        <div className="w-auto grid grid-cols-2">
          <div className="card p-3">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Assign To</h3>
            <p className="text-gray-800 whitespace-pre-wrap">{data?.assignedTo || "Not Assigned to anyone"}</p>
          </div>
          <div className="card p-3">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Type</h3>
            <p className="text-gray-800 whitespace-pre-wrap">{data.type}</p>
          </div>
          <div className="card p-3">
            <div className="text-sm text-gray-600">Status</div>
            <div className="mt-1">{data.status}</div>
          </div>
          <div className="card p-3">
            <div className="text-sm text-gray-600">Priority</div>
            <div className="mt-1">{data.priority}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;



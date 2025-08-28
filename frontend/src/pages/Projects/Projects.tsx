import React from 'react';
import { useQuery } from 'react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Loader2 } from 'lucide-react';
import { api, endpoints } from '../../services/api.ts';

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
}

const Projects: React.FC = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<Project[]>(['projects'], async () => {
    const res = await api.get(endpoints.projects.list);
    return res.data.projects || res.data;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="animate-spin mr-2" /> Loading projects...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <button className="btn btn-primary" onClick={() => navigate('/projects/create')}>
          <Plus size={16} className="mr-2" /> New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data?.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`} className="card hover:shadow-lg transition">
            <div className="flex items-start">
              <div className="p-2 rounded bg-primary-50 text-primary-700 mr-3">
                <FolderOpen size={20} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{p.name}</h3>
                {p.description && <p className="text-sm text-gray-600 line-clamp-2">{p.description}</p>}
                <div className="mt-2 text-xs text-gray-500">Status: {p.status}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Projects;



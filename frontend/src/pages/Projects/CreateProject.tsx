import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, endpoints } from '../../services/api.ts';

interface CreateProjectForm {
  name: string;
  description?: string;
}

const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<CreateProjectForm>();

  const onSubmit = async (data: CreateProjectForm) => {
    try {
      setSubmitting(true);
      const res = await api.post(endpoints.projects.create, data);
      const id = res.data?.id || res.data?.project?.id;
      toast.success('Project created');
      navigate(id ? `/projects/${id}` : '/projects');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Create Project</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input className="input" {...register('name', { required: 'Name is required' })} />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea className="input min-h-[120px]" {...register('description')} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? <><Loader2 className="animate-spin mr-2" size={16} /> Creating...</> : 'Create Project'}
        </button>
      </form>
    </div>
  );
};

export default CreateProject;



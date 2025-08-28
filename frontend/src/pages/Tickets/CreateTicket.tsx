import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, endpoints } from '../../services/api.ts';

interface CreateTicketForm {
  title: string;
  description: string;
  projectId: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status?: 'OPEN' | 'IN_PROGRESS' | 'REVIEW' | 'TESTING' | 'RESOLVED' | 'CLOSED';
}

const CreateTicket: React.FC = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<CreateTicketForm>({
    defaultValues: { priority: 'MEDIUM', status: 'OPEN' }
  });

  const onSubmit = async (data: CreateTicketForm) => {
    try {
      setSubmitting(true);
      const res = await api.post(endpoints.tickets.list, data);
      const id = res.data?.id || res.data?.ticket?.id;
      toast.success('Ticket created');
      navigate(id ? `/tickets/${id}` : '/tickets');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Create Ticket</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input className="input" {...register('title', { required: 'Title is required' })} />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea className="input min-h-[140px]" {...register('description', { required: 'Description is required' })} />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Project ID</label>
          <input className="input" placeholder="project id" {...register('projectId', { required: 'Project is required' })} />
          {errors.projectId && <p className="mt-1 text-sm text-red-600">{errors.projectId.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Priority</label>
            <select className="input" {...register('priority')}> 
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select className="input" {...register('status')}>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="REVIEW">REVIEW</option>
              <option value="TESTING">TESTING</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? <><Loader2 className="animate-spin mr-2" size={16} /> Creating...</> : 'Create Ticket'}
        </button>
      </form>
    </div>
  );
};

export default CreateTicket;



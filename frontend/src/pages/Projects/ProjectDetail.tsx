import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { api, endpoints } from '../../services/api.ts';
import { Loader2, ArrowLeft, Ticket } from 'lucide-react';

interface ProjectDetailData {
  id: string;
  name: string;
  description?: string;
  status: string;
  createdAt: string;
  members?: Array<{ user: { id: string; username: string; firstName?: string; lastName?: string }; role: string }>;
}

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery<ProjectDetailData>(['project', id], async () => {
    const res = await api.get(`${endpoints.projects.list}/${id}`);
    return res.data.project || res.data;
  }, { enabled: !!id });

  const [updating, setUpdating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Ticket creation state
  const [ticketType, setTicketType] = useState('BUG');
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [assignee, setAssignee] = useState('');
  const [creating, setCreating] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('MEMBER');
  const [adding, setAdding] = useState(false);

  // Fetch project members (developers)
  React.useEffect(() => {
    if (id && memberQuery && memberQuery.length >= 2) {
      api.get(endpoints.users.search, { params: { projectId: id, q: memberQuery } })
        .then(res => setUsers(res.data.users || res.data))
        .catch(() => setUsers([]));
    } else if (!memberQuery) {
      setUsers([]);
    }
  }, [id, memberQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="animate-spin mr-2" /> Loading project...
      </div>
    );
  }

  if (!data) {
    return <div className="text-gray-600">Project not found.</div>;
  }

  if (!name && !description) {
    setTimeout(() => {
      setName(data.name || '');
      setDescription(data.description || '');
    }, 0);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link to="/projects" className="btn btn-ghost px-2">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-semibold">{data.name}</h1>
        </div>
        <Link to="/tickets/create" className="btn btn-primary">
          <Ticket size={16} className="mr-2" /> New Ticket
        </Link>
      </div>

      <div className="card space-y-3 p-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea className="input min-h-[100px]" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <button
          className="btn btn-primary"
          disabled={updating}
          onClick={async () => {
            try {
              setUpdating(true);
              await api.put(endpoints.projects.update(id as string), { name, description });
              window.location.reload();
            } catch (err: any) {
              // minimal UI - no toast
            } finally {
              setUpdating(false);
            }
          }}
        >
          {updating ? <><Loader2 className="animate-spin mr-2" size={16} /> Saving...</> : 'Save'}
        </button>
      </div>

      <div className="card p-3">
        <div className="text-sm text-gray-600">Status</div>
        <div className="mt-1">{data.status}</div>
      </div>

      {/* Team Members */}
      <div className="card space-y-3 p-3">
        <h2 className="text-lg font-semibold">Team Members</h2>
        {Array.isArray(data.members) && data.members.length > 0 ? (
          <div className="divide-y">
            {data.members.map((m, idx) => (
              <div key={idx} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{m.user.firstName || m.user.username} {m.user.lastName || ''}</div>
                  <div className="text-xs text-gray-500">Role: {m.role}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">No members listed.</div>
        )}

        <div className="pt-2 grid md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Search user</label>
            <input
              className="input"
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              placeholder="Type name or email"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Select user</label>
            <select className="input" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
              <option value="">Select</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>{u.firstName || u.username} {u.lastName || ''}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select className="input" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
              <option value="OWNER">OWNER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MEMBER">MEMBER</option>
              <option value="VIEWER">VIEWER</option>
            </select>
          </div>
        </div>

        <button
          className="btn btn-primary"
          disabled={adding || !selectedUserId}
          onClick={async () => {
            if (!id) return;
            try {
              setAdding(true);
              await api.post(endpoints.projects.addMember(id), { userId: selectedUserId, role: selectedRole });
              window.location.reload();
            } catch (err) {
              // minimal UI
            } finally {
              setAdding(false);
            }
          }}
        >
          {adding ? <><Loader2 className="animate-spin mr-2" size={16} /> Adding...</> : 'Add Member'}
        </button>
      </div>

      {/* Ticket Creation Form */}
      <div className="card space-y-3 p-3">
        <h2 className="text-lg font-semibold mb-2">Create Ticket</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input className="input" value={ticketTitle} onChange={e => setTicketTitle(e.target.value)} placeholder="Ticket title" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea className="input min-h-[80px]" value={ticketDesc} onChange={e => setTicketDesc(e.target.value)} placeholder="Ticket description" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select className="input" value={ticketType} onChange={e => setTicketType(e.target.value)}>
              <option value="BUG">Bug</option>
              <option value="FEATURE">Feature</option>
              <option value="TASK">Task</option>
              <option value="STORY">Story</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Assign to Member</label>
            <select className="input" value={assignee} onChange={e => setAssignee(e.target.value)}>
              <option value="">Select member</option>
              {Array.isArray(data.members) && data.members.map((m: any) => (
                <option key={m.user.id} value={m.user.id}>
                  {(m.user.firstName || m.user.username) + (m.user.lastName ? ' ' + m.user.lastName : '')}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          className="btn btn-primary"
          disabled={creating || !ticketTitle || !ticketType}
          onClick={async () => {
            setCreating(true);
            try {
              await api.post(endpoints.tickets.create, {
                title: ticketTitle,
                description: ticketDesc,
                type: ticketType,
                projectId: id,
                assignedTo: assignee
              });
              window.location.reload();
            } catch (err) {
              // minimal UI - no toast
            } finally {
              setCreating(false);
            }
          }}
        >
          {creating ? <><Loader2 className="animate-spin mr-2" size={16} /> Creating...</> : 'Create Ticket'}
        </button>
      </div>
    </div>
  );
};

export default ProjectDetail;



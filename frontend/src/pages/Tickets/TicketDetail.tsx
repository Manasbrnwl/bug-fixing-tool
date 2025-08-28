import React, { useEffect, useState } from 'react';
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

interface TicketComment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; username: string; firstName?: string; lastName?: string };
}

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery<TicketDetailData>(['ticket', id], async () => {
    const res = await api.get(`${endpoints.tickets.list}/${id}`);
    return res.data.ticket || res.data;
  }, { enabled: !!id });

  const { data: commentsData, isLoading: commentsLoading } = useQuery<TicketComment[]>(['ticket-comments', id], async () => {
    const res = await api.get(endpoints.comments.list(id as string));
    return res.data.comments || res.data;
  }, { enabled: !!id });

  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('OPEN');
  const [originalStatus, setOriginalStatus] = useState('OPEN');
  const [priority, setPriority] = useState('MEDIUM');
  const [assignedTo, setAssignedTo] = useState('');
  const [members, setMembers] = useState<Array<{ id: string; username: string; firstName?: string; lastName?: string }>>([]);
  const [statusChangeComment, setStatusChangeComment] = useState('');
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    if (data) {
      setTitle(data.title);
      setDescription(data.description);
      setStatus(data.status);
      setOriginalStatus(data.status);
      setPriority(data.priority);
      setAssignedTo(data.assignedTo || '');
      // fetch project members for assignee dropdown
      const projectId = data.projectId || data.project?.id;
      if (projectId) {
        api.get(endpoints.projects.get(projectId)).then(res => {
          const project = res.data.project || res.data;
          const ms = Array.isArray(project.members)
            ? project.members.map((m: any) => ({ id: m.user.id, username: m.user.username, firstName: m.user.firstName, lastName: m.user.lastName }))
            : [];
          setMembers(ms);
        }).catch(() => setMembers([]));
      }
    }
  }, [data]);

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

  const isClosed = status === 'CLOSED';
  const statusChanged = status !== originalStatus;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Link to="/tickets" className="btn btn-ghost px-2">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-semibold">Ticket</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <div className="card p-3 space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isClosed} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea className="input min-h-[120px]" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isClosed} />
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Comments</h3>
              <div className="card divide-y">
                {commentsLoading ? (
                  <div className="p-3 text-gray-500 flex items-center"><Loader2 className="animate-spin mr-2" /> Loading comments...</div>
                ) : (
                  (commentsData && commentsData.length > 0) ? commentsData.map((c) => (
                    <div key={c.id} className="p-3">
                      <div className="text-sm text-gray-900">{(c.user.firstName || c.user.username) + (c.user.lastName ? ' ' + c.user.lastName : '')}</div>
                      <div className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</div>
                      <div className="mt-1 text-gray-800 whitespace-pre-wrap">{c.content}</div>
                    </div>
                  )) : (
                    <div className="p-3 text-gray-500">No comments yet.</div>
                  )
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500">Raised On: {data.createdAt.split('T')[0]}</div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-3">
            <div className="text-sm text-gray-600 mb-1">Project</div>
            <div className="mt-1">{data.project?.name}</div>
          </div>
          <div className="card p-3 space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Assign To</label>
              <select className="input" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} disabled={isClosed}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{(m.firstName || m.username) + (m.lastName ? ' ' + m.lastName : '')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} disabled={isClosed}>
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="REVIEW">REVIEW</option>
                <option value="TESTING">TESTING</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)} disabled={isClosed}>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>
            {statusChanged && !isClosed && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Comment (required due to status change)</label>
                <textarea
                  className="input min-h-[100px]"
                  placeholder={`Add a comment for changing status from ${originalStatus} to ${status}`}
                  value={statusChangeComment}
                  onChange={(e) => { setStatusChangeComment(e.target.value); setCommentError(''); }}
                />
                {commentError && <div className="mt-1 text-sm text-red-600">{commentError}</div>}
              </div>
            )}
            <button
              className="btn btn-primary"
              disabled={saving || isClosed}
              onClick={async () => {
                if (!id) return;
                try {
                  if (statusChanged && !statusChangeComment.trim()) {
                    setCommentError('Comment is required when changing status');
                    return;
                  }
                  setSaving(true);
                  await api.put(endpoints.tickets.update(id), {
                    title,
                    description,
                    status,
                    priority,
                    assignedTo: assignedTo || null,
                  });
                  if (statusChanged && statusChangeComment.trim()) {
                    try {
                      await api.post(endpoints.comments.create, {
                        ticketId: id,
                        content: statusChangeComment.trim(),
                      });
                    } catch (_) {
                      // ignore failure here for minimal UI
                    }
                  }
                  window.location.reload();
                } catch (e) {
                  // minimal UI
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? <><Loader2 className="animate-spin mr-2" size={16} /> Saving...</> : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;



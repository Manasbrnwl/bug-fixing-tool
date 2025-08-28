import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, Loader2, Plus } from 'lucide-react';
import { api, endpoints } from '../../services/api.ts';

interface Ticket {
  id: string;
  title: string;
  status: string;
  priority: string;
  projectId: string;
  createdAt: string;
}

const Tickets: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');

  const { data, isLoading } = useQuery<Ticket[]>(['tickets', search], async () => {
    const res = await api.get(endpoints.tickets.list, {
      params: { q: search || undefined }
    });
    return res.data.tickets || res.data;
  });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (search) next.set('q', search); else next.delete('q');
    setSearchParams(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tickets</h1>
        {/* <Link to="/tickets/create" className="btn btn-primary">
          <Plus size={16} className="mr-2" /> Create Ticket
        </Link> */}
      </div>

      <form onSubmit={submitSearch} className="flex items-center space-x-2">
        <div className="relative flex-1">
          <input
            className="input pl-9"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
        {/* <button className="btn btn-ghost" type="button">
          <Filter size={16} />
        </button>
        <button className="btn btn-primary" type="submit">Search</button> */}
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-500">
          <Loader2 className="animate-spin mr-2" /> Loading tickets...
        </div>
      ) : (
        <div className="card divide-y">
          {data?.map(t => (
            <Link key={t.id} to={`/tickets/${t.id}`} className="flex items-center justify-between py-3 px-4">
              <div>
                <div className="font-medium text-gray-900">{t.title}</div>
                <div className="text-xs text-gray-500">Priority: {t.priority} • Status: {t.status}</div>
              </div>
              <div className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString()}</div>
            </Link>
          ))}
          {!data?.length && (
            <div className="py-6 text-center text-gray-500">No tickets found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Tickets;



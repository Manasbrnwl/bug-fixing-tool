import React from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext.tsx';

interface ProfileForm {
  firstName?: string;
  lastName?: string;
  username?: string;
}

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { register, handleSubmit } = useForm<ProfileForm>({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      username: user?.username || '',
    }
  });

  const onSubmit = async (data: ProfileForm) => {
    try {
      await updateUser(data);
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update profile');
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Profile</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">First name</label>
            <input className="input" {...register('firstName')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last name</label>
            <input className="input" {...register('lastName')} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Username</label>
          <input className="input" {...register('username')} />
        </div>
        <button type="submit" className="btn btn-primary">Save changes</button>
      </form>
    </div>
  );
};

export default Profile;



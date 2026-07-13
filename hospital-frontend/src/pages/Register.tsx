import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@/api/endpoints';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Activity, Mail, Lock, ShieldAlert, User, Calendar, Droplet, UserCheck, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'Male',
    blood_group: 'O+',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.first_name) {
      toast.error('First Name, Email, and Password are required');
      return;
    }
    setIsLoading(true);
    try {
      await api.auth.register(formData);
      setIsSuccess(true);
      toast.success('Registration successful! Please verify your email.');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Registration failed. Please check details.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden select-none">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[80px]" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] bg-teal-500/10 rounded-full blur-[80px]" />

      <Card className="w-full max-w-lg backdrop-blur-xl bg-slate-900/60 border-slate-800/80 shadow-2xl relative z-10 rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />
        
        {isSuccess ? (
          <div className="p-8 text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UserCheck className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Registration Complete!</h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                A verification link has been dispatched to <strong className="text-slate-200">{formData.email}</strong>. Please check your inbox and verify your email to log in.
              </p>
            </div>
            <Button
              onClick={() => navigate('/login')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 font-bold transition-all duration-300 shadow-lg shadow-emerald-500/20 w-full cursor-pointer"
            >
              Go to Login
            </Button>
          </div>
        ) : (
          <>
            <CardHeader className="space-y-2 text-center pt-8">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-950/20 mb-2">
                <Activity className="h-6 w-6 animate-pulse" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-white">
                Create Patient Account
              </CardTitle>
              <CardDescription className="text-slate-400 text-sm">
                Register to book appointments, review EMR, and consult online.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs font-medium text-rose-400">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">First Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
                      <Input
                        type="text"
                        name="first_name"
                        placeholder="Emma"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="pl-10 bg-slate-950/40 border-slate-800 text-slate-200 placeholder:text-slate-655 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Last Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
                      <Input
                        type="text"
                        name="last_name"
                        placeholder="Watson"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="pl-10 bg-slate-950/40 border-slate-800 text-slate-200 placeholder:text-slate-655 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input
                      type="email"
                      name="email"
                      placeholder="emma@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-10 bg-slate-950/40 border-slate-800 text-slate-200 placeholder:text-slate-655 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-10 bg-slate-950/40 border-slate-800 text-slate-200 placeholder:text-slate-655 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
                    <Input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      className="pl-10 bg-slate-950/40 border-slate-800 text-slate-200 placeholder:text-slate-655 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 bg-slate-950/45 border border-slate-800 text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">Blood Group</label>
                    <div className="relative">
                      <Droplet className="absolute left-3 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
                      <select
                        name="blood_group"
                        value={formData.blood_group}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-3 py-2.5 bg-slate-950/45 border border-slate-800 text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl"
                      >
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 font-bold transition-all duration-300 shadow-lg shadow-emerald-500/20 mt-4 cursor-pointer"
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating Account...' : 'Register Profile'}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col space-y-2 border-t border-slate-800/80 p-6 bg-slate-950/20 text-center">
              <p className="text-xs text-slate-400">
                Already registered?{' '}
                <Link 
                  to="/login" 
                  className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to Login
                </Link>
              </p>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
};

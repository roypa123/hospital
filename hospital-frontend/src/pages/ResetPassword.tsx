import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '@/api/endpoints';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Activity, Lock, ShieldAlert, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Password reset token is missing from the link');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await api.auth.resetPassword({ token, password });
      setIsSuccess(true);
      toast.success('Password reset completed successfully!');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Password reset failed.';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden select-none">
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[80px]" />
      
      <Card className="w-full max-w-md backdrop-blur-xl bg-slate-900/60 border-slate-800/80 shadow-2xl relative z-10 rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />
        
        <CardHeader className="space-y-2 text-center pt-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-950/20 mb-2">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Choose New Password</CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            Configure a secure, new password for your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs font-medium text-rose-400">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!token && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs font-medium text-rose-400">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Security token invalid or missing. Ensure you loaded the full email link.</span>
            </div>
          )}

          {isSuccess ? (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <CheckCircle className="h-6 w-6" />
              </div>
              <p className="text-slate-350 text-xs font-medium">Your password has been successfully configured. You may now return to the portal login screen.</p>
              <Button
                onClick={() => navigate('/login')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 font-bold w-full cursor-pointer"
              >
                Go to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-slate-950/40 border-slate-800 text-slate-200 placeholder:text-slate-655 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 rounded-xl"
                    required
                    disabled={!token}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-slate-950/40 border-slate-800 text-slate-200 placeholder:text-slate-655 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 rounded-xl"
                    required
                    disabled={!token}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 font-bold transition-all duration-300 shadow-lg shadow-emerald-500/20 mt-4 cursor-pointer"
                disabled={isLoading || !token}
              >
                {isLoading ? 'Resetting Password...' : 'Update Password'}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-2 border-t border-slate-800/80 p-6 bg-slate-950/20 text-center">
          <Link 
            to="/login" 
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1 mx-auto"
          >
            <ArrowLeft className="w-3 h-3" /> Back to Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

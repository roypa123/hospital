import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/endpoints';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Activity, Mail, ShieldAlert, ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Email address is required');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await api.auth.forgotPassword({ email });
      setIsSent(true);
      toast.success('Password reset link sent!');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to request reset.';
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
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Reset Password</CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            {isSent 
              ? 'Request processed. Check your inbox.' 
              : 'Enter your registered email address to receive reset instructions.'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs font-medium text-rose-400">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSent ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium leading-relaxed">
              If that email exists in our system, a password reset link has been dispatched. Please review your junk/spam folder if the message does not appear within a few minutes.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    type="email"
                    placeholder="name@hospital.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-950/40 border-slate-800 text-slate-200 placeholder:text-slate-655 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 rounded-xl"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 font-bold transition-all duration-300 shadow-lg shadow-emerald-500/20 mt-4 cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? 'Sending Request...' : (
                  <span className="flex items-center justify-center gap-2">
                    Send Link <Send className="w-3.5 h-3.5" />
                  </span>
                )}
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

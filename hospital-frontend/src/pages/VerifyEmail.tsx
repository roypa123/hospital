import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Activity, ShieldCheck, ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email token. Please stand by...');
  const effectRan = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Avoid double fetch in React 19 strict mode
    if (effectRan.current) return;
    
    const verifyToken = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing from the link URL.');
        return;
      }
      try {
        await api.auth.verifyEmail({ token });
        setStatus('success');
        setMessage('Your email address has been successfully verified.');
        toast.success('Email verified successfully!');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Email verification failed. The link might have expired.');
        toast.error('Verification failed');
      }
    };

    verifyToken();
    effectRan.current = true;
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden select-none">
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[80px]" />
      
      <Card className="w-full max-w-md backdrop-blur-xl bg-slate-900/60 border-slate-800/80 shadow-2xl relative z-10 rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />
        
        <CardHeader className="space-y-2 text-center pt-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-950/20 mb-2">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Email Verification</CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            Portal account activation check.
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center py-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-slate-300 text-sm">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <p className="text-slate-200 text-sm font-semibold">{message}</p>
              <Button
                onClick={() => navigate('/login')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 font-bold w-full mt-4 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Proceed to Login <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/25">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <p className="text-slate-350 text-sm leading-relaxed">{message}</p>
              <Button
                onClick={() => navigate('/login')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl py-2 font-bold w-full mt-4 cursor-pointer"
              >
                Back to Login
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t border-slate-800/80 p-4 bg-slate-950/20 text-center flex justify-center">
          <Link to="/login" className="text-xs text-slate-450 hover:text-slate-300 transition-colors">
            Go to Login screen
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

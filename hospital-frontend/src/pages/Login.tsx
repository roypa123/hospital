import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/hooks/useAuthStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Activity, Mail, Lock, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const { login, verifyMfa, mfaRequired, tempToken, error, clearError, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }
    try {
      const res = await login(email, password);
      if (res && res.mfaRequired) {
        toast.success('MFA required. Check your 2FA app for the OTP code');
      } else {
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (e: any) {
      toast.error(e.message || 'Login failed');
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }
    try {
      await verifyMfa(tempToken || '', code);
      toast.success('Verification successful!');
      navigate('/dashboard');
    } catch (e: any) {
      toast.error(e.message || 'MFA code verification failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden select-none">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[80px]" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] bg-teal-500/10 rounded-full blur-[80px]" />

      <Card className="w-full max-w-md backdrop-blur-xl bg-slate-900/60 border-slate-800/80 shadow-2xl relative z-10 rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />
        
        <CardHeader className="space-y-2 text-center pt-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-950/20 mb-2">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            {mfaRequired ? 'Security Verification' : 'Welcome to Aura Health'}
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            {mfaRequired 
              ? 'Enter the 6-digit verification code from your authenticator app.' 
              : 'Enter your credentials to access your portal.'
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

          {!mfaRequired ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
                  <Input
                    type="email"
                    placeholder="name@hospital.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    className="pl-10 bg-slate-950/40 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <Link 
                    to="/forgot-password" 
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    className="pl-10 bg-slate-950/40 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 rounded-xl"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 font-bold transition-all duration-300 shadow-lg shadow-emerald-500/20 mt-4 cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Activity className="h-4 w-4 animate-spin" /> Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    Login Portal <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">OTP Code</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={code}
                    onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); clearError(); }}
                    className="pl-10 bg-slate-950/40 border-slate-800 text-slate-200 text-center tracking-widest font-bold placeholder:text-slate-700 text-lg focus-visible:ring-emerald-500 focus-visible:border-emerald-500 rounded-xl"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 font-bold transition-all duration-300 shadow-lg shadow-emerald-500/20 mt-4 cursor-pointer"
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify & Sign In'}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-2 border-t border-slate-800/80 p-6 bg-slate-950/20 text-center">
          <p className="text-xs text-slate-400">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Register here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

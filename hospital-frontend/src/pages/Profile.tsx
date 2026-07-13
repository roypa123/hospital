import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { api } from '@/api/endpoints';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ShieldCheck, 
  Smartphone, 
  ListRestart, 
  Trash2, 
  Laptop 
} from 'lucide-react';
import { toast } from 'sonner';

export const Profile: React.FC = () => {
  const { user, setUserProfile } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // 2FA variables
  const [mfaData, setMfaData] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [settingUp2fa, setSettingUp2fa] = useState(false);

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await api.auth.getSessions();
      setSessions(res.data || []);
    } catch (e) {
      toast.error('Failed to load active device sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await api.users.update(user.id, {
        first_name: firstName,
        last_name: lastName
      });
      setUserProfile({ first_name: firstName, last_name: lastName });
      toast.success('Profile credentials updated');
    } catch (e: any) {
      toast.error('Failed to update profile');
    }
  };

  const handleRevokeSession = async (id: string) => {
    try {
      await api.auth.revokeSession(id);
      toast.success('Device session revoked');
      fetchSessions();
    } catch (e) {
      toast.error('Failed to revoke session');
    }
  };

  // 2FA Handlers
  const handleSetup2FA = async () => {
    setSettingUp2fa(true);
    try {
      const res = await api.auth.setup2FA();
      setMfaData(res.data);
      toast.success('MFA registration details generated');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to setup 2FA');
      setSettingUp2fa(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    try {
      await api.auth.activate2FA(verificationCode);
      toast.success('2FA activated and secure!');
      setMfaData(null);
      setSettingUp2fa(false);
      setUserProfile({ two_factor_enabled: true });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Verification failed. Try again.');
    }
  };

  const handleDisable2FA = async () => {
    try {
      await api.auth.disable2FA();
      toast.success('2FA disabled successfully');
      setUserProfile({ two_factor_enabled: false });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to disable 2FA');
    }
  };

  const qrImageUrl = mfaData?.qrURI 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mfaData.qrURI)}`
    : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Profile Form */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Account Information</CardTitle>
            <CardDescription className="text-xs text-slate-550 dark:text-slate-400">View and adjust your basic profile details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-350">First Name</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-250 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-350">Last Name</label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-250 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-350">Email Address (Read-only)</label>
                <Input
                  value={user?.email || ''}
                  className="bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-450 dark:text-slate-500 text-xs rounded-xl cursor-not-allowed"
                  disabled
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2 font-bold cursor-pointer shadow-lg shadow-emerald-500/10"
              >
                Save Details
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Security & Sessions */}
      <div className="lg:col-span-2 space-y-6">
        {/* 2FA Card */}
        <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Multi-Factor Authentication (MFA)</CardTitle>
            <CardDescription className="text-xs text-slate-550 dark:text-slate-450">Protect your account from unauthorized login access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user?.two_factor_enabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 rounded-2xl">
                  <ShieldCheck className="w-8 h-8" />
                  <div className="text-xs">
                    <p className="font-bold">MFA Protection Active</p>
                    <p className="text-slate-550 dark:text-slate-450 mt-0.5">Google Authenticator checks are active on logins.</p>
                  </div>
                </div>
                <Button 
                  onClick={handleDisable2FA}
                  className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs py-2 font-bold cursor-pointer"
                >
                  Disable Google Authenticator
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-850/45 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Smartphone className="w-8 h-8 text-slate-550" />
                  <div className="text-xs text-slate-655 dark:text-slate-400">
                    <p className="font-semibold">2-Step Verification Inactive</p>
                    <p className="text-slate-450 mt-0.5">Add an extra layer of security to prevent leaks.</p>
                  </div>
                </div>

                {!settingUp2fa ? (
                  <Button 
                    onClick={handleSetup2FA}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs py-2 font-bold cursor-pointer"
                  >
                    Setup Google Authenticator
                  </Button>
                ) : mfaData ? (
                  <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                      <div className="bg-white p-2 rounded-xl">
                        <img src={qrImageUrl} alt="Google Authenticator QR Code" className="w-[150px] h-[150px]" />
                      </div>
                      <div className="text-xs text-slate-300 space-y-2 flex-1">
                        <p className="font-bold">Scan QR Code or Enter Secret Key</p>
                        <p className="text-slate-400">Use any MFA application (like Google Authenticator or Authy) to scan the code.</p>
                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl font-mono text-[10px] break-all select-all select-none">
                          Key: <strong className="text-white">{mfaData.secret}</strong>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleVerify2FA} className="flex gap-2 items-end pt-2 border-t border-slate-850">
                      <div className="flex-1 space-y-1 text-xs">
                        <label className="font-bold text-slate-350">Enter Verification Code</label>
                        <Input
                          placeholder="123456"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          className="bg-slate-900 border-slate-800 text-white rounded-xl text-xs text-center tracking-widest font-bold font-mono"
                          required
                        />
                      </div>
                      <Button 
                        type="submit"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2 px-4 rounded-xl cursor-pointer"
                      >
                        Verify & Enable
                      </Button>
                    </form>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 animate-pulse">Generating OTP details...</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sessions Card */}
        <Card className="backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Device Sessions</CardTitle>
            <CardDescription className="text-xs text-slate-550 dark:text-slate-450">Active login sessions registered on your account</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSessions ? (
              <div className="text-xs text-slate-500 flex items-center gap-1.5"><ListRestart className="w-4 h-4 animate-spin" /> Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-450">No active sessions found.</div>
            ) : (
              <div className="space-y-3">
                {sessions.map((sess) => (
                  <div 
                    key={sess.id} 
                    className="p-3 bg-slate-50 dark:bg-slate-850/45 border border-slate-150 dark:border-slate-850 rounded-2xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-200/50 dark:bg-slate-800/60 rounded-xl text-slate-655 dark:text-slate-350">
                        {sess.user_agent?.toLowerCase().includes('mobile') ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-250 truncate max-w-[200px]">{sess.user_agent || 'Unknown Browser'}</p>
                        <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-0.5">IP: {sess.ip_address || '127.0.0.1'} • Last active: {new Date(sess.last_active_at || sess.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeSession(sess.id)}
                      className="p-2 border border-slate-200 dark:border-slate-800 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-500 rounded-xl transition-all cursor-pointer text-slate-500"
                      title="Revoke session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

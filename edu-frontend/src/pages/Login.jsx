import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/progress';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData);

    if (result.success) {
      if (result.user.role === 'student') {
        navigate('/student/dashboard');
      } else if (result.user.role === 'teacher') {
        navigate('/teacher/dashboard');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-secondary-500 to-primary-600 dark:from-dark-green-500 dark:via-secondary-700 dark:to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-2xl border-neutral-200 dark:border-dark-border">
            <CardHeader className="text-center pb-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 dark:from-dark-green-500 dark:to-secondary-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                  <GraduationCap className="w-9 h-9 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-neutral-800 dark:text-dark-text-primary">
                  Skill-Sync
                </h1>
                <p className="text-sm text-neutral-600 dark:text-dark-text-secondary mt-2">
                  Outcome-Based Education Analysis System
                </p>
              </motion.div>
            </CardHeader>

            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-dark-text-primary mb-2">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-dark-text-primary mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      placeholder="••••••••"
                      className="w-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:text-dark-text-muted dark:hover:text-dark-text-secondary transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 text-base"
                  size="lg"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Spinner size="sm" />
                      Signing In...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <div className="text-center mt-4">
                  <p className="text-sm text-neutral-600 dark:text-dark-text-secondary">
                    Don't have an account?{' '}
                    <Link
                      to="/register"
                      className="font-semibold text-primary-600 hover:text-primary-700 dark:text-dark-green-500 dark:hover:text-dark-green-600 transition-colors"
                    >
                      Register
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
